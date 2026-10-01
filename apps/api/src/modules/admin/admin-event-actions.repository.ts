import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { EventStatusT, UserRoleT, UserStatusT } from '@dnc/contracts';
import { withTransaction } from '../../common/db/transaction.js';
import { PG_POOL } from '../../database/database.module.js';

/** The slice of an event row the action rules need; no description, no location. */
export interface ActionEventRow {
  id: string;
  organizer_id: string;
  status: EventStatusT;
}

/**
 * Writes behind the console's event actions (T4-T6). Every method but
 * `transaction` takes the caller's transaction so the row lock, the
 * conditional update and the audit line commit or roll back together (D-R8).
 */
@Injectable()
export class AdminEventActionsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
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

  /**
   * Locks and reads a live event row. Concurrent actions on one event queue
   * here; the loser re-reads the winner's status once the lock is released.
   *
   * `FOR NO KEY UPDATE` is enough because the key columns never change, and it
   * does not conflict with the `FOR KEY SHARE` that inserting an occurrence or
   * a foreign-key check takes on this row.
   *
   * Lock order: this is the only row the action locks, and it takes no
   * `event_occurrences` or `rsvps` lock. The RSVP paths lock `event_occurrences`
   * and only read `events` without a row lock, so no path holds one of the two
   * while waiting for the other and a deadlock cannot form.
   */
  async lockEvent(tx: PoolClient, id: string): Promise<ActionEventRow | null> {
    const { rows } = await tx.query<ActionEventRow>(
      `SELECT id, organizer_id, status FROM events
        WHERE id = $1 AND deleted_at IS NULL
        FOR NO KEY UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * Moves the status, only from one of the expected sources. Returns false when
   * no row matched, which the caller reports as an invalid transition (D-R7).
   */
  async transitionStatus(
    tx: PoolClient,
    id: string,
    from: readonly EventStatusT[],
    to: EventStatusT,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE events
          SET status = $3::event_status_enum, updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
          AND status = ANY($2::event_status_enum[])`,
      [id, from, to],
    );
    return rowCount === 1;
  }
}
