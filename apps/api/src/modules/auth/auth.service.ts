import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { Redis } from 'ioredis';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { normalizePhone } from '@dnc/domain';
import { SignJWT, generateKeyPair, importPKCS8, importSPKI, jwtVerify } from 'jose';
import type { CryptoKey } from 'jose';
import type {
  AuthSessionResponseT,
  LoginRequestT,
  RegisterRequestT,
  SessionUserResponseT,
} from '@dnc/contracts';
import { translatePostgresError } from '../../common/db/pg-error.js';
import {
  normalizeClientIp,
  RATE_LIMIT_CONFIG,
  RateLimitedException,
  RateLimitService,
  type RateLimitConfig,
  type RateLimitRule,
  type Reservation,
} from '../../common/rate-limit/index.js';
import { REDIS_CACHE } from '../../redis/redis.module.js';
import { MediaService } from '../media/index.js';
import { SuspensionExpiryService } from '../moderation-jobs/index.js';
import { AuthRepository, type UserRow } from './auth.repository.js';
import { toSessionUser } from './auth.mapper.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ISSUER = 'dnc';
const AUDIENCE = 'dnc-client';

/**
 * Trust level granted at registration.
 *
 * T1 is "email verified" in the ladder, and email delivery does not exist yet;
 * granting it outright lets a new account post. Drops to 0 once verification
 * lands, with verifying promoting to 1.
 */
const TRUST_LEVEL_ON_REGISTER = 1;

/**
 * How long a just-rotated refresh token keeps working.
 *
 * Within this window a token revoked by rotation is treated as the same request
 * arriving twice, so a client racing itself is not signed out. Any other
 * revocation still trips reuse detection. A stolen token replayed inside the
 * window succeeds, which is why it is seconds.
 */
const ROTATION_GRACE_MS = 10_000;

/**
 * Deny-list key per user. The value is `<epochMs>:<kind>`: access tokens issued
 * at or before that instant are refused, tokens issued later are not, so a user
 * who signs in again straight after being unsuspended or re-roled works at once.
 */
const REVOKED_KEY_PREFIX = 'auth:revoked:';
/** Access TTL plus a minute: past this no token the mark could still apply to is valid. */
const REVOKED_MARK_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS + 60;
/** Ceiling on the one Redis GET each authenticated request pays; beyond it the check fails open. */
export const REVOCATION_REDIS_TIMEOUT_MS = 300;

/** After a failed deny-list read, the check is skipped this long before trying Redis again. */
export const REVOCATION_BREAKER_MS = 5_000;

/**
 * Sets the mark only when it is not older than the stored one, so nodes with
 * skewed clocks cannot move it backwards. Equal or newer wins and carries the
 * newer kind. Returns 1 when written.
 */
const RAISE_MARK_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if cur then
  local at = tonumber(string.match(cur, '^(%d+):'))
  if at and at > tonumber(ARGV[1]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[1] .. ':' .. ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`;

/** Returned by {@link AuthService.revokeSessionsInTx}; `publish` goes after commit. */
export interface RevocationTicket {
  revokedSessions: number;
  /** Writes the deny-list mark. Resolves false when Redis refused it. Safe to call twice. */
  publish(): Promise<boolean>;
}

/** Why an account's tokens were cut; picks the HTTP answer for a stale token. */
export type SessionRevocationReason = 'suspended' | 'role_changed';

export interface AccessTokenClaims {
  sub: string;
  role: string;
  trustLevel: number;
  /** Issued-at in whole seconds, as signed into the token. */
  iat: number;
}

export interface RefreshResult {
  session: AuthSessionResponseT;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private privateKey!: CryptoKey;
  private publicKey!: CryptoKey;
  /**
   * A real Argon2id hash of a random value, verified against when no account
   * matches. A hardcoded literal would not do: if it failed to parse, verify
   * would throw immediately and the fast path would be back.
   */
  private dummyHash!: string;

  constructor(
    private readonly users: AuthRepository,
    private readonly media: MediaService,
    private readonly rateLimit: RateLimitService,
    @Inject(RATE_LIMIT_CONFIG) private readonly limits: RateLimitConfig,
    @Inject(REDIS_CACHE) private readonly redis: Redis,
    private readonly suspensions: SuspensionExpiryService,
  ) {}
  private revocationDegraded = false;
  private revocationRetryAt = 0;

  /**
   * Loads the RS256 key pair, generating an ephemeral one when none is
   * configured.
   *
   * Key material never reaches a logger: the ephemeral pair is generated
   * non-extractable, so it cannot be exported even by accident, and a malformed
   * configured key is reported by variable name only.
   *
   * A generated key means every restart invalidates outstanding access tokens —
   * acceptable in development, catastrophic in production, so the absence of
   * configuration is logged loudly rather than passed over.
   */
  async onModuleInit(): Promise<void> {
    this.dummyHash = await argonHash(randomBytes(32).toString('hex'));

    const privatePem = process.env['JWT_PRIVATE_KEY'];
    const publicPem = process.env['JWT_PUBLIC_KEY'];

    if (privatePem && publicPem) {
      // The jose error is dropped on purpose: it must not carry the PEM back out.
      this.privateKey = await importPKCS8(privatePem, 'RS256').catch(() => {
        throw new Error('JWT_PRIVATE_KEY is not a valid RS256 PKCS8 key');
      });
      this.publicKey = await importSPKI(publicPem, 'RS256').catch(() => {
        throw new Error('JWT_PUBLIC_KEY is not a valid RS256 SPKI key');
      });
      return;
    }

    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured in production');
    }

    const pair = await generateKeyPair('RS256', { extractable: false });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.logger.warn(
      'No JWT key pair configured; generated an ephemeral one. Every restart signs out every session.',
    );
  }

  async register(input: RegisterRequestT, context: SessionContext): Promise<RefreshResult> {
    // Counted before the uniqueness checks so a throttled caller learns nothing
    // about which handles or emails exist, and every call counts, taken or not.
    const ip = normalizeClientIp(context.ip);
    const decision = await this.rateLimit.reserve([
      {
        key: this.rateLimit.keyFor('register', 'ip', ip, 'hour'),
        max: this.limits.registerHourlyMax,
        windowSeconds: 3600,
        bucket: 'ip_hour',
        action: 'register',
      },
      {
        key: this.rateLimit.keyFor('register', 'ip', ip, 'day'),
        max: this.limits.registerDailyMax,
        windowSeconds: 86_400,
        bucket: 'ip_day',
        action: 'register',
      },
    ]);
    if (decision.blocked) throw new RateLimitedException(decision.retryAfterSeconds);

    if (await this.users.handleTaken(input.handle)) {
      throw new ConflictException({
        code: 'HANDLE_TAKEN',
        messageKey: 'errors.auth.handleTaken',
      });
    }

    try {
      const row = await this.users.register({
        email: input.email,
        passwordHash: await argonHash(input.password),
        displayName: input.displayName,
        handle: input.handle,
        locale: input.locale,
        trustLevel: TRUST_LEVEL_ON_REGISTER,
      });
      return await this.issue(row, context);
    } catch (error) {
      // A duplicate email is the one constraint a caller can act on, and saying
      // so is not a disclosure: the sign-up form has to tell them something.
      const translated = translatePostgresError(error);
      throw translated instanceof ConflictException
        ? new ConflictException({
            code: 'EMAIL_TAKEN',
            messageKey: 'errors.auth.emailTaken',
          })
        : translated;
    }
  }

  /**
   * Verifies credentials against an email, a handle or a phone number.
   *
   * A missing account still pays for one Argon2 verification against a dummy
   * hash: returning early would make "no such user" measurably faster than
   * "wrong password", which turns the sign-in form into an account enumerator.
   *
   * Two counters guard this, per client IP and per identifier, and a slot on
   * each is taken before any lookup or hashing, so a blocked caller gets 429
   * even with the right password. Only a wrong password keeps its slots: a
   * correct login resets the identifier counter and returns the IP slot, and a
   * suspended account or an internal failure is not a guess and costs nothing.
   */
  async login(input: LoginRequestT, context: SessionContext): Promise<RefreshResult> {
    const identifier = input.identifier.trim().toLowerCase();
    const phone = normalizePhone(identifier);

    const rules: RateLimitRule[] = [
      {
        key: this.rateLimit.keyFor('login', 'ip', normalizeClientIp(context.ip)),
        max: this.limits.loginIpMax,
        windowSeconds: this.limits.loginWindowSeconds,
        bucket: 'ip',
        action: 'login',
      },
      {
        key: this.rateLimit.keyFor('login', 'id', phone ?? identifier),
        max: this.limits.loginIdentifierMax,
        windowSeconds: this.limits.loginWindowSeconds,
        bucket: 'identifier',
        action: 'login',
      },
    ];
    const decision = await this.rateLimit.reserve(rules);
    if (decision.blocked) throw new RateLimitedException(decision.retryAfterSeconds);
    const [ipSlot, identifierSlot] = decision.reservations as [Reservation, Reservation];

    // 'failed' keeps both slots; anything not set to 'failed' or 'ok' hands them back.
    let outcome: 'failed' | 'ok' | 'neutral' = 'neutral';
    try {
      const row = await this.users.findByIdentifier(identifier, phone);
      const hash = row?.password_hash ?? this.dummyHash;
      const ok = await argonVerify(hash, input.password).catch(() => false);

      if (!row || !ok) {
        outcome = 'failed';
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          messageKey: 'errors.auth.invalidCredentials',
        });
      }
      const usable = await this.ensureUsable(row);
      const result = await this.issue(usable, context);
      outcome = 'ok';
      return result;
    } finally {
      if (outcome === 'ok') {
        await this.rateLimit.clear(identifierSlot);
        await this.rateLimit.release([ipSlot]);
      } else if (outcome === 'neutral') {
        await this.rateLimit.release([ipSlot, identifierSlot]);
      }
    }
  }

  /**
   * Exchanges a refresh token for a new pair.
   *
   * Rotation with reuse detection: the presented token is revoked as it is
   * spent, so presenting it twice means a copy exists and the whole family is
   * dropped. The legitimate client is signed out too — the alternative is
   * leaving an attacker holding a valid session.
   */
  async refresh(refreshToken: string, context: SessionContext): Promise<RefreshResult> {
    const session = await this.users.findSessionByHash(hashToken(refreshToken));
    if (!session) throw this.invalidRefresh();

    if (session.revoked_at !== null) {
      const rotatedRecently =
        session.revoked_reason === 'rotation' &&
        Date.now() - session.revoked_at.getTime() < ROTATION_GRACE_MS;

      if (!rotatedRecently) {
        await this.users.revokeFamily(session.family_id, 'rotation_reuse');
        this.logger.warn(`refresh token reuse detected for family ${session.family_id}`);
        throw this.invalidRefresh();
      }
      this.logger.debug(`refresh race tolerated for family ${session.family_id}`);
    }
    if (session.expires_at.getTime() <= Date.now()) throw this.invalidRefresh();

    const row = await this.users.findById(session.user_id);
    if (!row) throw this.invalidRefresh();
    const usable = await this.ensureUsable(row);

    // Already revoked means this was the tolerated race; revoking again would
    // overwrite the reason and lose why it was spent.
    if (session.revoked_at === null) {
      await this.users.revokeSession(session.id, 'rotation');
    }
    return this.issue(usable, context, session.family_id);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.users.findSessionByHash(hashToken(refreshToken));
    // Signing out drops the whole family: a browser and a phone sharing one
    // lineage should not survive the other pressing "log out".
    if (session) await this.users.revokeFamily(session.family_id, 'logout');
  }

  /**
   * Verifies an access token and returns its claims, or throws.
   *
   * Besides the signature this consults the revocation mark (one Redis GET), so
   * a suspension or role change cuts tokens that are still within their 15
   * minutes. It lives here rather than in the guard so the chat gateway, which
   * calls this method directly, is covered too. A failed read lets the request
   * through: the access TTL bounds the exposure, and refresh tokens are revoked
   * in the database regardless.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    let claims: AccessTokenClaims;
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      claims = {
        sub: payload.sub as string,
        role: payload['role'] as string,
        trustLevel: Number(payload['trustLevel'] ?? 0),
        iat: typeof payload.iat === 'number' ? payload.iat : 0,
      };
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        messageKey: 'errors.auth.invalidToken',
      });
    }

    const mark = await this.readRevocationMark(claims.sub);
    if (mark !== null && claims.iat * 1000 <= mark.at) {
      if (mark.kind === 'suspended') {
        throw new ForbiddenException({
          code: 'ACCOUNT_NOT_ACTIVE',
          messageKey: 'errors.auth.accountSuspended',
        });
      }
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        messageKey: 'errors.auth.unauthenticated',
      });
    }
    return claims;
  }

  /**
   * Revokes every live refresh session of one user and cuts their access
   * tokens at once. Standalone form: one statement, then the mark.
   */
  async revokeAllSessionsForUser(
    userId: string,
    reason: SessionRevocationReason,
  ): Promise<{ revokedSessions: number; markPublished: boolean }> {
    const revokedSessions = await this.users.revokeAllForUser(userId, reason);
    return { revokedSessions, markPublished: await this.publishMark(userId, reason) };
  }

  /**
   * Revokes sessions on the caller's own transaction and returns a ticket.
   * The deny-list mark is only written by `ticket.publish()`, which must run
   * after the transaction commits; a mark written before a rollback would cut
   * a user for a change that never happened. Prefer {@link withSessionRevocation},
   * which cannot get that order wrong.
   */
  async revokeSessionsInTx(
    userId: string,
    reason: SessionRevocationReason,
    tx: PoolClient,
  ): Promise<RevocationTicket> {
    const revokedSessions = await this.users.revokeAllForUser(userId, reason, tx);
    let published: Promise<boolean> | null = null;
    return {
      revokedSessions,
      // Idempotent: a second call returns the first result instead of writing again.
      publish: () => (published ??= this.publishMark(userId, reason)),
    };
  }

  /**
   * Runs `work` in a transaction, hands it a `cut` function to revoke users'
   * sessions, commits, and only then writes every deny-list mark. A rollback
   * writes none. `markDeferred` is true when Redis refused a mark: the access
   * token then lives until it expires (at most 15 minutes), and the caller
   * should surface a `sessionCutDeferred` warning.
   */
  async withSessionRevocation<T>(
    work: (
      tx: PoolClient,
      cut: (userId: string, reason: SessionRevocationReason) => Promise<number>,
    ) => Promise<T>,
  ): Promise<{ result: T; markDeferred: boolean }> {
    const tickets: RevocationTicket[] = [];
    const result = await this.users.transaction((tx) =>
      work(tx, async (userId, reason) => {
        const ticket = await this.revokeSessionsInTx(userId, reason, tx);
        tickets.push(ticket);
        return ticket.revokedSessions;
      }),
    );
    const outcomes = await Promise.all(tickets.map((ticket) => ticket.publish()));
    return { result, markDeferred: outcomes.some((ok) => !ok) };
  }

  /**
   * Writes the mark. Never throws.
   *
   * @returns false when Redis refused it, so the caller can warn that the
   *   access token outlives the revocation.
   */
  private async publishMark(userId: string, reason: SessionRevocationReason): Promise<boolean> {
    const kind = reason === 'suspended' ? 'suspended' : 'role';
    // Limit: the mark lives on the cache Redis (allkeys-lru), so memory pressure
    // may evict it before the access token expires. Accepted for beta; follow-up
    // is a durable users.tokens_valid_after column.
    const write = this.redis.eval(
      RAISE_MARK_SCRIPT,
      1,
      REVOKED_KEY_PREFIX + userId,
      String(Date.now()),
      kind,
      String(REVOKED_MARK_TTL_SECONDS),
    );
    write.catch(() => undefined);
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        write,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), REVOCATION_REDIS_TIMEOUT_MS * 3);
        }),
      ]);
      return true;
    } catch {
      // No user id or token in the line; the id is in the audit row for whoever investigates.
      this.logger.error(
        `revocation mark not written (kind=${kind}); old access tokens live until expiry`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * One bounded GET. Null means no mark, or Redis unavailable. After a failure
   * the check is skipped for {@link REVOCATION_BREAKER_MS} so a dead Redis costs
   * one timeout, not one per request; entering and leaving that state is logged.
   */
  private async readRevocationMark(
    userId: string,
  ): Promise<{ at: number; kind: 'suspended' | 'role' } | null> {
    if (this.revocationDegraded && Date.now() < this.revocationRetryAt) return null;

    const read = this.redis.get(REVOKED_KEY_PREFIX + userId);
    read.catch(() => undefined);
    let timer: NodeJS.Timeout | undefined;
    try {
      const raw = await Promise.race([
        read,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), REVOCATION_REDIS_TIMEOUT_MS);
        }),
      ]);
      if (this.revocationDegraded) {
        this.revocationDegraded = false;
        this.logger.log('revocation check recovered');
      }
      if (raw === null) return null;
      const [at, kind] = raw.split(':');
      const epoch = Number(at);
      if (!Number.isFinite(epoch) || (kind !== 'suspended' && kind !== 'role')) return null;
      return { at: epoch, kind };
    } catch {
      if (!this.revocationDegraded) {
        this.logger.warn('revocation check unavailable, failing open');
      }
      this.revocationDegraded = true;
      this.revocationRetryAt = Date.now() + REVOCATION_BREAKER_MS;
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async currentUser(userId: string): Promise<SessionUserResponseT> {
    const row = await this.users.findById(userId);
    if (!row) throw this.invalidRefresh();
    return toSessionUser(row, await this.avatarUrl(row));
  }

  touchLastActive(userId: string): Promise<void> {
    return this.users.touchLastActive(userId);
  }

  /**
   * Returns the row when the account may sign in, or throws 403.
   *
   * A suspension that carries an expiry and has passed is lifted here first
   * (D-M12, T-9), so the user is not turned away while the scheduled job is
   * late or Redis is down. The lift is a conditional UPDATE with its own audit
   * line; if it fails the account simply stays suspended for this attempt.
   */
  private async ensureUsable(row: UserRow): Promise<UserRow> {
    if (row.status === 'active') return row;
    // Only a suspension with an expiry that has passed can lift here: an open-ended
    // one must not cost a transaction on every sign-in attempt.
    if (row.status === 'suspended' && row.suspended_until && row.suspended_until <= new Date()) {
      const lifted = await this.suspensions.expireDueSuspensions(row.id).catch((error: unknown) => {
        this.logger.error(`lazy suspension expiry failed: ${(error as Error).message}`);
        return [] as string[];
      });
      if (lifted.includes(row.id)) return { ...row, status: 'active' };
    }
    throw new ForbiddenException({
      code: 'ACCOUNT_NOT_ACTIVE',
      messageKey: `errors.auth.account${row.status === 'suspended' ? 'Suspended' : 'Unavailable'}`,
    });
  }

  private async issue(
    row: UserRow,
    context: SessionContext,
    familyId: string = randomUUID(),
  ): Promise<RefreshResult> {
    const accessToken = await new SignJWT({
      role: row.role,
      trustLevel: row.trust_level,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject(row.id)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.privateKey);

    // 32 random bytes, never derived from user data, so one token says nothing
    // about the account or about any other token.
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.users.createSession({
      userId: row.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: refreshExpiresAt,
      platform: context.platform,
      userAgent: context.userAgent,
      ip: context.ip,
    });

    return {
      session: {
        accessToken,
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        user: toSessionUser(row, await this.avatarUrl(row)),
      },
      refreshToken,
      refreshExpiresAt,
    };
  }

  private async avatarUrl(row: UserRow): Promise<string | null> {
    if (row.avatar_media_id === null) return null;
    const [avatar] = await this.media.resolveGallery([row.avatar_media_id]);
    return avatar?.url ?? null;
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH',
      messageKey: 'errors.auth.invalidRefresh',
    });
  }
}

export interface SessionContext {
  platform: 'ios' | 'android' | 'web';
  userAgent: string | null;
  ip: string | null;
}

/** Refresh tokens are stored as a digest; a database dump yields no usable session. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
