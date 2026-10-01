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
import { MediaService } from '../media/index.js';
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

export interface AccessTokenClaims {
  sub: string;
  role: string;
  trustLevel: number;
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
  ) {}

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
      this.assertUsable(row);
      const result = await this.issue(row, context);
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
    this.assertUsable(row);

    // Already revoked means this was the tolerated race; revoking again would
    // overwrite the reason and lose why it was spent.
    if (session.revoked_at === null) {
      await this.users.revokeSession(session.id, 'rotation');
    }
    return this.issue(row, context, session.family_id);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.users.findSessionByHash(hashToken(refreshToken));
    // Signing out drops the whole family: a browser and a phone sharing one
    // lineage should not survive the other pressing "log out".
    if (session) await this.users.revokeFamily(session.family_id, 'logout');
  }

  /** Verifies an access token and returns its claims, or throws 401. */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return {
        sub: payload.sub as string,
        role: payload['role'] as string,
        trustLevel: Number(payload['trustLevel'] ?? 0),
      };
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        messageKey: 'errors.auth.invalidToken',
      });
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

  private assertUsable(row: UserRow): void {
    if (row.status === 'active') return;
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
