import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { UserRoleT, UserStatusT } from '@dnc/contracts';

/** The slice of a user row the action rules need; nothing contact-related. */
export interface ActionTargetRow {
  id: string;
  role: UserRoleT;
  status: UserStatusT;
  trust_level: number;
}

/**
 * Writes behind the console's user actions. Every method takes the caller's
 * transaction: the row lock, the conditional update, the audit line and the
 * session revocation must commit or roll back as one (D-R8).
 */
@Injectable()
export class AdminUserActionsRepository {
  /**
   * Serialises every user action against the "at least two active super admins"
   * invariant (INV-3). Taken first and unconditionally: the count below is only
   * meaningful while no other action can change who is a super admin. Admin
   * actions are rare, so the coarse lock costs nothing and rules out deadlocks
   * between row locks taken in different orders.
   */
  async lockInvariant(tx: PoolClient): Promise<void> {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('admin:user-actions', 0))`);
  }

  /** Reads the acting staff member's current role; the token claim may be stale. */
  async findActor(
    tx: PoolClient,
    id: string,
  ): Promise<{ role: UserRoleT; status: UserStatusT } | null> {
    const { rows } = await tx.query<{ role: UserRoleT; status: UserStatusT }>(
      `SELECT role, status FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Locks and reads the target row. Concurrent actions on the same user queue here. */
  async lockTarget(tx: PoolClient, id: string): Promise<ActionTargetRow | null> {
    const { rows } = await tx.query<ActionTargetRow>(
      `SELECT id, role, status, trust_level FROM users WHERE id = $1 FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  async countActiveSuperAdmins(tx: PoolClient): Promise<number> {
    const { rows } = await tx.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM users
        WHERE role = 'super_admin' AND status = 'active'
          AND deleted_at IS NULL AND anonymized_at IS NULL`,
    );
    return rows[0]?.n ?? 0;
  }

  /**
   * Moves a status, only from the expected source. Returns false when no row
   * matched, which the caller reports as an invalid transition (D-R7).
   * Suspension is open-ended in v1, so `suspended_until` is always cleared.
   */
  async transitionStatus(
    tx: PoolClient,
    id: string,
    from: UserStatusT,
    to: UserStatusT,
    suspensionReason: string | null,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE users
          SET status = $3::user_status_enum,
              suspension_reason = $4::varchar,
              suspended_until = NULL,
              updated_at = now()
        WHERE id = $1 AND status = $2::user_status_enum`,
      [id, from, to, suspensionReason],
    );
    return rowCount === 1;
  }

  /** Changes the role only from the expected one and only while the account is active. */
  async transitionRole(
    tx: PoolClient,
    id: string,
    from: UserRoleT,
    to: UserRoleT,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE users
          SET role = $3::user_role_enum, updated_at = now()
        WHERE id = $1 AND role = $2::user_role_enum AND status = 'active'`,
      [id, from, to],
    );
    return rowCount === 1;
  }

  /**
   * Marks the newest in-force (not revoked, not naturally expired) `suspended` action of the user as revoked, whether
   * it came from a case or from a manual suspend. Only `revoked_*` change, which
   * the append-only trigger allows. No such row is fine (returns false).
   */
  async revokeActiveSuspension(
    tx: PoolClient,
    subjectUserId: string,
    revokedByUserId: string,
    reason: string,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE moderation_actions
          SET revoked_at = now(), revoked_by_user_id = $2, revoke_reason = $3
        WHERE id = (SELECT id FROM moderation_actions
                     WHERE subject_user_id = $1 AND action_type = 'suspended'
                       AND revoked_at IS NULL
                       AND (expires_at IS NULL OR expires_at > now())
                     ORDER BY id DESC LIMIT 1)`,
      [subjectUserId, revokedByUserId, reason],
    );
    return rowCount === 1;
  }
}
