import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { UserRoleT, UserStatusT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';

export interface UserRow {
  id: string;
  email: string | null;
  email_verified_at: Date | null;
  password_hash: string | null;
  phone: string | null;
  phone_verified_at: Date | null;
  role: UserRoleT;
  trust_level: number;
  status: UserStatusT;
  locale: 'en' | 'vi';
  handle: string;
  display_name: string;
  avatar_media_id: string | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  /** Why it was spent — a rotation is forgivable for a moment, a logout is not. */
  revoked_reason: string | null;
}

export interface RegisterInput {
  email: string;
  passwordHash: string;
  displayName: string;
  handle: string;
  locale: 'en' | 'vi';
  trustLevel: number;
}

export interface SessionInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  platform: 'ios' | 'android' | 'web';
  userAgent: string | null;
  ip: string | null;
}

/**
 * User columns joined with the profile fields every session needs.
 *
 * `password_hash` is in this list because sign-in must compare against it. It
 * is stripped by the mapper and never reaches a response — the serializer
 * schema is the second line of defence.
 */
const USER_COLUMNS = `
  u.id, u.email, u.email_verified_at, u.password_hash,
  u.phone, u.phone_verified_at, u.role,
  u.trust_level, u.status, u.locale,
  p.handle, p.display_name, p.avatar_media_id
`;

@Injectable()
export class AuthRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Creates the account and its profile together.
   *
   * One transaction: a user with no profile has no display name and no handle,
   * so every screen that renders them would break. The pair is the unit.
   */
  async register(input: RegisterInput): Promise<UserRow> {
    return withTransaction(this.pool, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, locale, trust_level, trust_level_changed_at, status)
         VALUES ($1, $2, $3, $4, now(), 'active')
         RETURNING id`,
        [input.email, input.passwordHash, input.locale, input.trustLevel],
      );
      const userId = rows[0]?.id as string;

      await tx.query(
        `INSERT INTO profiles (user_id, handle, display_name) VALUES ($1, $2, $3)`,
        [userId, input.handle, input.displayName],
      );

      return (await this.selectUser(tx, 'u.id = $1', [userId])) as UserRow;
    });
  }

  /**
   * Finds an account by whatever the member typed to sign in.
   *
   * All three columns are tried in one statement rather than guessing which
   * kind of identifier it is: a handle may be all digits and look like a phone
   * number, and a wrong guess would lock that member out of their own account.
   * The unique indexes make more than one match effectively impossible; the
   * ordering settles it deterministically if one ever occurs.
   *
   * @param identifier - Lowercased raw input. `email` and `handle` are citext,
   *   so the comparison is case-insensitive on both.
   * @param phone - The same input normalised to E.164, or null when it is not
   *   phone-shaped.
   */
  async findByIdentifier(identifier: string, phone: string | null): Promise<UserRow | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS}
         FROM users u
         JOIN profiles p ON p.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND (u.email = $1 OR p.handle = $1 OR ($2::varchar IS NOT NULL AND u.phone = $2))
        ORDER BY (u.email = $1) DESC, (p.handle = $1) DESC
        LIMIT 1`,
      [identifier, phone],
    );
    return rows[0] ?? null;
  }

  findById(id: string): Promise<UserRow | null> {
    return this.selectUser(this.pool, 'u.id = $1', [id]);
  }

  private async selectUser(
    runner: Pool | PoolClient,
    predicate: string,
    params: unknown[],
  ): Promise<UserRow | null> {
    const { rows } = await runner.query<UserRow>(
      `SELECT ${USER_COLUMNS}
         FROM users u
         JOIN profiles p ON p.user_id = u.id
        WHERE ${predicate} AND u.deleted_at IS NULL`,
      params,
    );
    return rows[0] ?? null;
  }

  async handleTaken(handle: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM profiles WHERE handle = $1`,
      [handle],
    );
    return (rowCount ?? 0) > 0;
  }

  async createSession(input: SessionInput): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO auth_sessions
         (user_id, token_hash, family_id, expires_at, platform, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.userId,
        input.tokenHash,
        input.familyId,
        input.expiresAt,
        input.platform,
        input.userAgent,
        input.ip,
      ],
    );
    return rows[0]?.id as string;
  }

  findSessionByHash(tokenHash: string): Promise<SessionRow | null> {
    return this.pool
      .query<SessionRow>(
        `SELECT id, user_id, family_id, expires_at, revoked_at, revoked_reason
           FROM auth_sessions WHERE token_hash = $1`,
        [tokenHash],
      )
      .then(({ rows }) => rows[0] ?? null);
  }

  async revokeSession(id: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = $2
        WHERE id = $1 AND revoked_at IS NULL`,
      [id, reason],
    );
  }

  /**
   * Revokes every live session in a rotation family.
   *
   * Called when an already-rotated refresh token is presented again: either the
   * token was copied, or a legitimate client raced itself. Both are answered
   * the same way, because the two are indistinguishable from here and the safe
   * reading is theft.
   */
  async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = $2
        WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId, reason],
    );
  }

  /**
   * Sets or clears the sign-in phone number.
   *
   * Lives here rather than in the profile repository because the column is on
   * `users`: it is a credential, not a profile field, and the partial unique
   * index on it is what keeps two accounts from claiming one number.
   */
  async updatePhone(userId: string, phone: string | null): Promise<void> {
    await this.pool.query(
      // Both casts are load-bearing: without them PostgreSQL infers $2 as
      // varchar from the assignment and as text from the comparison, and
      // refuses the statement with 42P08.
      `UPDATE users SET
         phone = $2::varchar,
         -- A changed number is unverified again; verification is per number.
         phone_verified_at = CASE WHEN $2::varchar IS DISTINCT FROM phone
                                  THEN NULL ELSE phone_verified_at END,
         updated_at = now()
       WHERE id = $1`,
      [userId, phone],
    );
  }

  async touchLastActive(userId: string): Promise<void> {
    // Throttled to once every 15 minutes: this fires on every authenticated
    // request, and an unconditional UPDATE would make the users table the
    // hottest write in the system for no added information.
    await this.pool.query(
      `UPDATE users SET last_active_at = now()
        WHERE id = $1
          AND (last_active_at IS NULL OR last_active_at < now() - interval '15 minutes')`,
      [userId],
    );
  }
}
