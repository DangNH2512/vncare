import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { RsvpStatusT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';

export interface RsvpRow {
  id: string;
  occurrence_id: string;
  user_id: string;
  status: RsvpStatusT;
  hold_expires_at: Date | null;
  created_at: Date;
  waitlist_position: number | null;
}

/** The occurrence as seen under lock, with everything the admission decision reads. */
export interface LockedOccurrence {
  id: string;
  event_id: string;
  starts_at: Date;
  capacity: number;
  event_status: string;
  required_trust_level: number;
  organizer_id: string;
  seats_taken: number;
  existing_active_status: RsvpStatusT | null;
}

export interface AttendeeRow {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_media_id: string | null;
  trust_level: number;
  status: RsvpStatusT;
}

const RSVP_COLUMNS = `
  r.id, r.occurrence_id, r.user_id, r.status, r.hold_expires_at, r.created_at,
  w.position AS waitlist_position
`;

/** The one join that resolves a waitlisted RSVP to its queue position. */
const WAITLIST_JOIN = `
  LEFT JOIN waitlist_entries w
    ON w.occurrence_id = r.occurrence_id
   AND w.user_id = r.user_id
   AND w.status = 'waiting'
`;

@Injectable()
export class RsvpRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Runs `work` inside one transaction; every admission or cancellation goes through this. */
  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /**
   * Locks the occurrence row and reads everything the decision needs.
   *
   * `FOR UPDATE OF o` serialises admissions per occurrence: two people racing
   * for the last seat queue here, and the second one sees the first one's row
   * in the recount. The `assert_capacity` trigger stays as the last line of
   * defence, but with this lock it should never fire.
   */
  async lockOccurrence(
    tx: PoolClient,
    occurrenceId: string,
    userId: string,
  ): Promise<LockedOccurrence | null> {
    const { rows } = await tx.query<LockedOccurrence>(
      `SELECT o.id, o.event_id, o.starts_at, o.capacity,
              e.status AS event_status, e.required_trust_level, e.organizer_id,
              (SELECT count(*)::int FROM rsvps r
                WHERE r.occurrence_id = o.id
                  AND r.status IN ('confirmed', 'held', 'attended', 'no_show')
                  AND r.deleted_at IS NULL) AS seats_taken,
              (SELECT r.status FROM rsvps r
                WHERE r.occurrence_id = o.id AND r.user_id = $2
                  AND r.status IN ('confirmed', 'held', 'waitlisted')
                  AND r.deleted_at IS NULL) AS existing_active_status
         FROM event_occurrences o
         JOIN events e ON e.id = o.event_id
        WHERE o.id = $1 AND o.deleted_at IS NULL AND e.deleted_at IS NULL
        FOR UPDATE OF o`,
      [occurrenceId, userId],
    );
    return rows[0] ?? null;
  }

  async insertRsvp(
    tx: PoolClient,
    occurrenceId: string,
    userId: string,
    status: 'confirmed' | 'waitlisted',
  ): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO rsvps (occurrence_id, user_id, status) VALUES ($1, $2, $3)
       RETURNING id`,
      [occurrenceId, userId, status],
    );
    return rows[0]?.id as string;
  }

  /** Appends to the queue; the position is derived under the occurrence lock, so it cannot collide. */
  async appendWaitlist(tx: PoolClient, occurrenceId: string, userId: string): Promise<number> {
    const { rows } = await tx.query<{ position: number }>(
      `INSERT INTO waitlist_entries (occurrence_id, user_id, position)
       SELECT $1, $2, coalesce(max(position), 0) + 1
         FROM waitlist_entries WHERE occurrence_id = $1
       RETURNING position`,
      [occurrenceId, userId],
    );
    return rows[0]?.position as number;
  }

  /**
   * Marks the caller's active RSVP cancelled; returns what it was, or null when
   * there was none. Read-then-write is race-free here because the caller holds
   * the occurrence lock.
   */
  async cancelActive(
    tx: PoolClient,
    occurrenceId: string,
    userId: string,
  ): Promise<RsvpStatusT | null> {
    const { rows } = await tx.query<{ status: RsvpStatusT }>(
      `SELECT status FROM rsvps
        WHERE occurrence_id = $1 AND user_id = $2
          AND status IN ('confirmed', 'held', 'waitlisted')
          AND deleted_at IS NULL`,
      [occurrenceId, userId],
    );
    const previous = rows[0]?.status;
    if (previous === undefined) return null;

    await tx.query(
      `UPDATE rsvps SET status = 'cancelled', updated_at = now()
        WHERE occurrence_id = $1 AND user_id = $2
          AND status IN ('confirmed', 'held', 'waitlisted')
          AND deleted_at IS NULL`,
      [occurrenceId, userId],
    );
    return previous;
  }

  async closeWaitlistEntry(
    tx: PoolClient,
    occurrenceId: string,
    userId: string,
    status: 'cancelled' | 'promoted',
  ): Promise<void> {
    await tx.query(
      `UPDATE waitlist_entries SET status = $3, updated_at = now()
        WHERE occurrence_id = $1 AND user_id = $2 AND status = 'waiting'`,
      [occurrenceId, userId, status],
    );
  }

  /**
   * Promotes the head of the queue into the seat a cancellation freed.
   *
   * Straight to `confirmed` rather than the `held` + confirmation window the
   * schema supports: a hold is only meaningful once the promoted person can be
   * told about it, and the notification module does not exist yet. When it
   * lands, this switches to `held` with `hold_expires_at`.
   */
  async promoteNextWaiting(tx: PoolClient, occurrenceId: string): Promise<string | null> {
    const { rows } = await tx.query<{ user_id: string }>(
      `SELECT user_id FROM waitlist_entries
        WHERE occurrence_id = $1 AND status = 'waiting'
        ORDER BY position ASC
        LIMIT 1`,
      [occurrenceId],
    );
    const next = rows[0]?.user_id;
    if (next === undefined) return null;

    await tx.query(
      `UPDATE rsvps SET status = 'confirmed', updated_at = now()
        WHERE occurrence_id = $1 AND user_id = $2
          AND status = 'waitlisted' AND deleted_at IS NULL`,
      [occurrenceId, next],
    );
    await this.closeWaitlistEntry(tx, occurrenceId, next, 'promoted');
    return next;
  }

  /** Refreshes the display cache after any change; admissions never read it. */
  async refreshSeatCache(tx: PoolClient, occurrenceId: string): Promise<void> {
    await tx.query(
      `UPDATE event_occurrences SET
         confirmed_count = (
           SELECT count(*)::int FROM rsvps r
            WHERE r.occurrence_id = $1
              AND r.status IN ('confirmed', 'held', 'attended', 'no_show')
              AND r.deleted_at IS NULL),
         updated_at = now()
       WHERE id = $1`,
      [occurrenceId],
    );
  }

  /**
   * Claims an idempotency key. False means this exact request was already
   * processed and the caller should return the existing state instead.
   */
  async claimIdempotencyKey(
    tx: PoolClient,
    key: string,
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [key, userId, endpoint],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * @param runner - Pass the transaction client when calling from inside one:
   *   a read through the pool runs on another connection and cannot see rows
   *   the open transaction has written.
   */
  async findOwn(
    occurrenceId: string,
    userId: string,
    runner: Pool | PoolClient = this.pool,
  ): Promise<RsvpRow | null> {
    const { rows } = await runner.query<RsvpRow>(
      `SELECT ${RSVP_COLUMNS}
         FROM rsvps r ${WAITLIST_JOIN}
        WHERE r.occurrence_id = $1 AND r.user_id = $2
          AND r.status IN ('confirmed', 'held', 'waitlisted')
          AND r.deleted_at IS NULL`,
      [occurrenceId, userId],
    );
    return rows[0] ?? null;
  }

  /** See findOwn for why `runner` exists. */
  async findById(id: string, runner: Pool | PoolClient = this.pool): Promise<RsvpRow | null> {
    const { rows } = await runner.query<RsvpRow>(
      `SELECT ${RSVP_COLUMNS} FROM rsvps r ${WAITLIST_JOIN} WHERE r.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Confirmed people first in join order, then the queue in queue order. */
  async listAttendees(occurrenceId: string): Promise<AttendeeRow[]> {
    const { rows } = await this.pool.query<AttendeeRow>(
      `SELECT r.user_id, p.handle, p.display_name, p.avatar_media_id,
              u.trust_level, r.status
         FROM rsvps r
         JOIN users u ON u.id = r.user_id
         JOIN profiles p ON p.user_id = r.user_id
         LEFT JOIN waitlist_entries w
           ON w.occurrence_id = r.occurrence_id AND w.user_id = r.user_id AND w.status = 'waiting'
        WHERE r.occurrence_id = $1
          AND r.status IN ('confirmed', 'held', 'waitlisted', 'attended')
          AND r.deleted_at IS NULL
        ORDER BY (r.status = 'waitlisted') ASC, coalesce(w.position, 0) ASC, r.created_at ASC`,
      [occurrenceId],
    );
    return rows;
  }
}
