import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { EventStatusT, EventUpdateRequestT, ListEventQueryT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  area_id: string;
  lat: number;
  lng: number;
  starts_at: Date;
  ends_at: Date | null;
  capacity: number;
  seats_taken: number;
  status: EventStatusT;
  required_trust_level: number;
  created_at: Date;
}

export interface EventCreateInput {
  organizerId: string;
  slug: string;
  title: string;
  description: string | null;
  areaId: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  requiredTrustLevel: number;
}

interface EventCursor extends Record<string, unknown> {
  startsAt: string;
  id: string;
}

/**
 * An event's time and capacity live on `event_occurrences`, not on `events`
 * (decision D-02: a weekly class is one event with many occurrences). The
 * public response flattens the earliest occurrence into the event, which is the
 * shape every client already consumes.
 */
const OCCURRENCE_JOIN = `
  JOIN LATERAL (
    SELECT o.starts_at, o.ends_at, o.capacity, o.confirmed_count
      FROM event_occurrences o
     WHERE o.event_id = e.id AND o.deleted_at IS NULL
     ORDER BY o.starts_at ASC
     LIMIT 1
  ) occ ON true
`;

const SELECT_COLUMNS = `
  e.id, e.slug, e.title, e.description, e.area_id,
  ST_Y(e.location::geometry) AS lat,
  ST_X(e.location::geometry) AS lng,
  occ.starts_at, occ.ends_at, occ.capacity,
  occ.confirmed_count AS seats_taken,
  e.status, e.required_trust_level, e.created_at
`;

/** Discovery is ordered by start time, so that is the key. */
export function eventCursorOf(row: EventRow): string {
  return encodeCursor({ startsAt: row.starts_at.toISOString(), id: row.id });
}

@Injectable()
export class EventRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Creates the event and its first occurrence in one transaction. Half of an
   * event — a row with no occurrence — has no time and cannot be RSVP'd, so it
   * must never be observable.
   */
  async create(input: EventCreateInput): Promise<EventRow> {
    return withTransaction(this.pool, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO events
           (organizer_id, area_id, slug, title, description, location, required_trust_level)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8)
         RETURNING id`,
        [
          input.organizerId,
          input.areaId,
          input.slug,
          input.title,
          input.description,
          // ST_MakePoint takes (x, y) — longitude first. Swapping these puts
          // every Da Nang event in the Indian Ocean.
          input.lng,
          input.lat,
          input.requiredTrustLevel,
        ],
      );
      const eventId = rows[0]?.id as string;

      await tx.query(
        `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
         VALUES ($1, $2, $3, $4)`,
        [eventId, input.startsAt, input.endsAt, input.capacity],
      );

      const created = await tx.query<EventRow>(
        `SELECT ${SELECT_COLUMNS} FROM events e ${OCCURRENCE_JOIN} WHERE e.id = $1`,
        [eventId],
      );
      return created.rows[0] as EventRow;
    });
  }

  /** Non-published events are visible only to their organizer. */
  async findById(id: string, viewerUserId: string): Promise<EventRow | null> {
    const { rows } = await this.pool.query<EventRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM events e ${OCCURRENCE_JOIN}
        WHERE e.id = $1
          AND e.deleted_at IS NULL
          AND (e.status = 'published' OR e.organizer_id = $2)`,
      [id, viewerUserId],
    );
    return rows[0] ?? null;
  }

  async findOrganizer(id: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ organizer_id: string }>(
      `SELECT organizer_id FROM events WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0]?.organizer_id ?? null;
  }

  /**
   * Discovery query, ordered by start time.
   *
   * The radius filter uses ST_DWithin against the GIST index; ST_Distance in a
   * WHERE clause computes a distance for every row in the table and cannot use
   * the index at all. Both the coordinates and the radius are bound parameters,
   * never interpolated.
   */
  async list(
    query: ListEventQueryT,
    viewerUserId: string,
  ): Promise<{ rows: EventRow[]; limit: number }> {
    const cursor = decodeCursor<EventCursor>(query.cursor);
    const { rows } = await this.pool.query<EventRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM events e ${OCCURRENCE_JOIN}
        WHERE e.deleted_at IS NULL
          AND (e.status = 'published' OR e.organizer_id = $1)
          AND ($2::uuid IS NULL OR e.area_id = $2)
          AND ($3::event_status_enum IS NULL OR e.status = $3)
          AND ($4::uuid IS NULL OR e.organizer_id = $4)
          AND ($5::double precision IS NULL OR ST_DWithin(
                 e.location,
                 ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography,
                 $7::double precision))
          AND ($8::timestamptz IS NULL OR (occ.starts_at, e.id) > ($8, $9::uuid))
        ORDER BY occ.starts_at ASC, e.id ASC
        LIMIT $10`,
      [
        viewerUserId,
        query.areaId ?? null,
        query.status ?? null,
        query.organizerId ?? null,
        query.lat ?? null,
        query.lng ?? null,
        query.radiusMeters ?? null,
        cursor?.startsAt ?? null,
        cursor?.id ?? null,
        query.limit + 1,
      ],
    );
    return { rows, limit: query.limit };
  }

  /**
   * Applies a partial update across both tables.
   *
   * Capacity may be raised freely but never lowered below the seats already
   * taken: the assert_capacity trigger would reject the next RSVP with an
   * overbooking error that the organizer, not the attendee, caused.
   */
  async update(id: string, patch: EventUpdateRequestT): Promise<EventRow | null> {
    return withTransaction(this.pool, async (tx) => {
      const updated = await tx.query<{ id: string }>(
        `UPDATE events SET
           title                = COALESCE($2, title),
           description          = COALESCE($3, description),
           area_id              = COALESCE($4::uuid, area_id),
           location             = CASE WHEN $5::double precision IS NULL THEN location
                                       ELSE ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography END,
           required_trust_level = COALESCE($7::smallint, required_trust_level),
           updated_at           = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [
          id,
          patch.title ?? null,
          patch.description ?? null,
          patch.areaId ?? null,
          patch.lat ?? null,
          patch.lng ?? null,
          patch.requiredTrustLevel ?? null,
        ],
      );
      if (!updated.rows[0]) return null;

      if (patch.startsAt || patch.endsAt || patch.capacity !== undefined) {
        await tx.query(
          `UPDATE event_occurrences o SET
             starts_at  = COALESCE($2::timestamptz, o.starts_at),
             ends_at    = COALESCE($3::timestamptz, o.ends_at),
             capacity   = GREATEST(COALESCE($4::integer, o.capacity), o.confirmed_count),
             updated_at = now()
           WHERE o.event_id = $1 AND o.deleted_at IS NULL`,
          [id, patch.startsAt ?? null, patch.endsAt ?? null, patch.capacity ?? null],
        );
      }

      const { rows } = await tx.query<EventRow>(
        `SELECT ${SELECT_COLUMNS} FROM events e ${OCCURRENCE_JOIN} WHERE e.id = $1`,
        [id],
      );
      return rows[0] ?? null;
    });
  }

  /**
   * Moves an event through the states an organizer controls.
   *
   * `suspended` and `taken_down` are absent from the allowed source and target
   * sets: a suspended event must not be un-suspended by its own organizer, only
   * by the moderator who suspended it.
   */
  async updateStatus(id: string, status: EventStatusT): Promise<EventRow | null> {
    const { rows } = await this.pool.query<EventRow>(
      `WITH updated AS (
         UPDATE events SET status = $2, updated_at = now()
          WHERE id = $1
            AND deleted_at IS NULL
            AND status NOT IN ('suspended', 'taken_down')
          RETURNING id
       )
       SELECT ${SELECT_COLUMNS}
         FROM events e ${OCCURRENCE_JOIN}
        WHERE e.id IN (SELECT id FROM updated)`,
      [id, status],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE events SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
