import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  ContentStatusT,
  ConversationRequestStatusT,
  ConversationTypeT,
  ListConversationQueryT,
  ListMessageQueryT,
  MessageTypeT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';

/**
 * Timestamps inside a json aggregate are formatted here rather than left to
 * PostgreSQL's json encoder, which emits `+00:00` while the contract requires a
 * trailing `Z`. Top-level columns need no such treatment: the driver hands them
 * back as Date and the mapper serializes them.
 */
const JSON_UTC = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`;

const PARTICIPANTS_JSON = `
  (SELECT coalesce(json_agg(json_build_object(
     'userId', p.user_id,
     'role', p.role,
     'joinedAt', to_char(p.joined_at AT TIME ZONE 'UTC', ${JSON_UTC}),
     'leftAt', CASE WHEN p.left_at IS NULL THEN NULL
                    ELSE to_char(p.left_at AT TIME ZONE 'UTC', ${JSON_UTC}) END,
     'handle', pp.handle,
     'displayName', pp.display_name,
     'trustLevel', pu.trust_level
   ) ORDER BY p.joined_at), '[]'::json)
     FROM conversation_participants p
     LEFT JOIN users pu
       ON pu.id = p.user_id AND pu.anonymized_at IS NULL AND pu.deleted_at IS NULL
     LEFT JOIN profiles pp ON pp.user_id = pu.id
    WHERE p.conversation_id = c.id) AS participants
`;

/**
 * Who may see a conversation, as a predicate over the aliases in
 * {@link conversationFrom}. A direct thread needs only the participant join; an
 * event room additionally needs a published event and the viewer to be its
 * organizer or hold a confirmed/attended RSVP on the room's occurrence, so
 * cancelling an RSVP closes the room to that person on their next request.
 *
 * The RSVP predicate repeats the one in rsvp.repository.ts and the
 * seat-occupying statuses of 0002_rsvp_core.sql on purpose: importing
 * RsvpRepository would couple the modules.
 */
const viewerEligible = (viewer: string): string => `
  (c.type = 'direct'
   OR (c.type = 'event_group'
       AND e.status = 'published' AND e.deleted_at IS NULL
       AND (e.organizer_id = ${viewer}
            OR EXISTS (
              SELECT 1 FROM rsvps r
                JOIN event_occurrences ro ON ro.id = r.occurrence_id
               WHERE ro.event_id = e.id
                 AND (c.occurrence_id IS NULL OR ro.id = c.occurrence_id)
                 AND r.user_id = ${viewer}
                 AND r.status IN ('confirmed', 'attended')
                 AND r.deleted_at IS NULL))))`;

/** Conversation with its viewer row, event and the occurrence that times its window. */
const conversationFrom = (viewer: string): string => `
  FROM conversations c
  JOIN conversation_participants me
    ON me.conversation_id = c.id AND me.user_id = ${viewer} AND me.left_at IS NULL
  LEFT JOIN events e ON e.id = c.event_id
  LEFT JOIN LATERAL (
    SELECT o.starts_at, o.ends_at FROM event_occurrences o
     WHERE o.event_id = c.event_id AND o.deleted_at IS NULL
       AND (c.occurrence_id IS NULL OR o.id = c.occurrence_id)
     ORDER BY o.starts_at LIMIT 1
  ) occ ON true`;

export interface ConversationRow {
  id: string;
  type: ConversationTypeT;
  event_id: string | null;
  occurrence_id: string | null;
  created_by_user_id: string;
  request_status: ConversationRequestStatusT;
  status: 'active' | 'archived' | 'closed';
  last_message_at: Date | null;
  last_message_preview: string | null;
  message_count: number;
  created_at: Date;
  unread_count: number;
  participants: Array<{
    userId: string;
    role: 'owner' | 'member';
    joinedAt: string;
    leftAt: string | null;
    handle: string | null;
    displayName: string | null;
    trustLevel: number | null;
  }>;
  /** Event and occurrence times; null for a direct thread or an occurrence that is gone. */
  event_title: string | null;
  event_starts_at: Date | null;
  event_ends_at: Date | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  type: MessageTypeT;
  body: string | null;
  body_locale: 'en' | 'vi' | null;
  media_id: string | null;
  shared_event_id: string | null;
  reply_to_message_id: string | null;
  status: ContentStatusT;
  edited_at: Date | null;
  created_at: Date;
  sender_handle: string | null;
  sender_display_name: string | null;
  sender_trust_level: number | null;
}

export interface MessageCreateInput {
  conversationId: string;
  senderUserId: string;
  type: Exclude<MessageTypeT, 'system'>;
  body: string | null;
  bodyLocale: 'en' | 'vi' | null;
  mediaId: string | null;
  sharedEventId: string | null;
  replyToMessageId: string | null;
  clientMessageId: string;
}

/** Conversation state read under `FOR UPDATE`, plus what the sender already posted. */
export interface LockedConversation {
  type: string;
  status: string;
  request_status: string;
  request_message_quota: number;
  /** Non-deleted messages from the sending user in this thread. */
  sentBySender: number;
}

/** Longest a send waits for the conversation lock before answering 503. */
const SEND_LOCK_TIMEOUT = '2s';

/** Raised when the conversation vanished between the access check and the lock. */
export class ConversationGoneError extends Error {}

interface ConversationCursor extends Record<string, unknown> {
  lastMessageAt: string | null;
  id: string;
}

const CONVERSATION_COLUMNS = `
  c.id, c.type, c.event_id, c.occurrence_id, c.created_by_user_id,
  c.request_status, c.status, c.last_message_at, c.last_message_preview,
  c.message_count, c.created_at, me.unread_count,
  CASE WHEN occ.starts_at IS NULL THEN NULL ELSE e.title END AS event_title,
  occ.starts_at AS event_starts_at, occ.ends_at AS event_ends_at
`;

const MESSAGE_COLUMNS = `
  m.id, m.conversation_id, m.sender_user_id, m.type, m.body, m.body_locale,
  m.media_id, m.shared_event_id, m.reply_to_message_id, m.status,
  m.edited_at, m.created_at,
  sp.handle AS sender_handle,
  sp.display_name AS sender_display_name,
  su.trust_level AS sender_trust_level
`;

/** Sender identity; a system message or a departed account yields nulls. */
const MESSAGE_FROM = `
  FROM messages m
  LEFT JOIN users su
    ON su.id = m.sender_user_id AND su.anonymized_at IS NULL AND su.deleted_at IS NULL
  LEFT JOIN profiles sp ON sp.user_id = su.id`;

/** Inbox key: last activity, falling back to creation for a silent thread. */
export function conversationCursorOf(row: ConversationRow): string {
  return encodeCursor({
    lastMessageAt: (row.last_message_at ?? row.created_at).toISOString(),
    id: row.id,
  });
}

/** Message key: the id alone, because UUIDv7 already sorts by time. */
export function messageCursorOf(row: MessageRow): string {
  return encodeCursor({ id: row.id });
}

export interface OccurrenceTimes {
  startsAt: Date;
  endsAt: Date | null;
}

export type OpenEventGroupResult =
  | { outcome: 'ok'; conversationId: string }
  | { outcome: 'event_not_found' | 'occurrence_mismatch' | 'not_eligible' };

@Injectable()
export class ChatRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Returns the existing direct thread for a pair, or opens one.
   *
   * The pair is stored in canonical order so (A,B) and (B,A) are the same row;
   * `ON CONFLICT DO NOTHING` plus a re-read makes two simultaneous openings
   * converge on one conversation instead of racing to a unique violation.
   */
  async findOrCreateDirect(
    initiatorId: string,
    recipientId: string,
  ): Promise<{ id: string; created: boolean }> {
    const [userA, userB] =
      initiatorId < recipientId ? [initiatorId, recipientId] : [recipientId, initiatorId];

    return withTransaction(this.pool, async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO conversations (type, user_a_id, user_b_id, created_by_user_id)
         VALUES ('direct', $1, $2, $3)
         ON CONFLICT (user_a_id, user_b_id) WHERE type = 'direct' AND deleted_at IS NULL
         DO NOTHING
         RETURNING id`,
        [userA, userB, initiatorId],
      );

      const conversationId =
        inserted.rows[0]?.id ??
        (
          await tx.query<{ id: string }>(
            `SELECT id FROM conversations
              WHERE type = 'direct' AND user_a_id = $1 AND user_b_id = $2 AND deleted_at IS NULL`,
            [userA, userB],
          )
        ).rows[0]?.id;

      if (!conversationId) {
        throw new Error('direct conversation vanished between insert and read');
      }

      if (inserted.rows[0]) {
        await this.addParticipants(tx, conversationId, [
          { userId: initiatorId, role: 'owner' },
          { userId: recipientId, role: 'member' },
        ]);
      }

      return { id: conversationId, created: Boolean(inserted.rows[0]) };
    });
  }

  /**
   * Opens, or returns, the group room of an event occurrence.
   *
   * Everything that decides the outcome runs in one transaction, serialised per
   * occurrence by an advisory lock: two simultaneous first requests converge on
   * one room instead of racing past the check-then-insert gap. The caller must
   * be the event's organizer or hold a confirmed/attended RSVP on the occurrence;
   * the organizer is always seated as `owner`, so a room never starts ownerless.
   */
  async openEventGroup(input: {
    eventId: string;
    occurrenceId: string | null;
    viewerId: string;
    viewerTrustLevel: number;
    minTrustLevelToJoin: number;
    /** Runs once the caller is known to be eligible, before anything is written; may throw to refuse. */
    assertWindow?: (times: OccurrenceTimes) => void;
  }): Promise<OpenEventGroupResult> {
    return withTransaction(this.pool, async (tx) => {
      const event = (
        await tx.query<{ organizer_id: string }>(
          `SELECT organizer_id FROM events
            WHERE id = $1 AND status = 'published' AND deleted_at IS NULL`,
          [input.eventId],
        )
      ).rows[0];
      if (!event) return { outcome: 'event_not_found' };

      const occurrence = (
        await tx.query<{ id: string; starts_at: Date; ends_at: Date | null }>(
          `SELECT id, starts_at, ends_at FROM event_occurrences
            WHERE event_id = $1 AND deleted_at IS NULL
              AND ($2::uuid IS NULL OR id = $2)
            ORDER BY starts_at, id
            LIMIT 1`,
          [input.eventId, input.occurrenceId],
        )
      ).rows[0];
      if (!occurrence) {
        if (!input.occurrenceId) return { outcome: 'event_not_found' };
        // A stranger must get the same 404 as everyone else; the 400 is only for
        // someone who could otherwise open this event's room.
        const related =
          event.organizer_id === input.viewerId ||
          (
            await tx.query(
              `SELECT 1 FROM rsvps r
                 JOIN event_occurrences o ON o.id = r.occurrence_id
                WHERE o.event_id = $1 AND r.user_id = $2
                  AND r.status IN ('confirmed', 'attended') AND r.deleted_at IS NULL`,
              [input.eventId, input.viewerId],
            )
          ).rowCount! > 0;
        return { outcome: related ? 'occurrence_mismatch' : 'not_eligible' };
      }

      const isOrganizer = event.organizer_id === input.viewerId;
      if (!isOrganizer) {
        const attending = await tx.query(
          `SELECT 1 FROM rsvps
            WHERE occurrence_id = $1 AND user_id = $2
              AND status IN ('confirmed', 'attended') AND deleted_at IS NULL`,
          [occurrence.id, input.viewerId],
        );
        if (attending.rowCount === 0) return { outcome: 'not_eligible' };
      }

      input.assertWindow?.({ startsAt: occurrence.starts_at, endsAt: occurrence.ends_at });

      await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `chat_room:${occurrence.id}`,
      ]);

      // A room created before occurrence ids were recorded has none; it still
      // counts as this event's room rather than being duplicated.
      const existing = (
        await tx.query<{ id: string; status: string; min_trust_level_to_join: number }>(
          `SELECT id, status, min_trust_level_to_join FROM conversations
            WHERE type = 'event_group' AND event_id = $1 AND deleted_at IS NULL
              AND (occurrence_id = $2 OR occurrence_id IS NULL)
            ORDER BY (occurrence_id IS NULL), created_at
            LIMIT 1`,
          [input.eventId, occurrence.id],
        )
      ).rows[0];

      if (existing) {
        const admitted =
          isOrganizer ||
          (existing.status === 'active' &&
            input.viewerTrustLevel >= existing.min_trust_level_to_join);
        if (!admitted) return { outcome: 'not_eligible' };
        await this.upsertMember(tx, existing.id, input.viewerId);
        return { outcome: 'ok', conversationId: existing.id };
      }

      // Only the organizer sets the floor; an attendee opening the room first
      // must not be able to lock the host out of their own audience.
      const floor = isOrganizer ? input.minTrustLevelToJoin : 0;
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO conversations
           (type, event_id, occurrence_id, created_by_user_id, request_status, min_trust_level_to_join)
         VALUES ('event_group', $1, $2, $3, 'accepted', $4)
         RETURNING id`,
        [input.eventId, occurrence.id, event.organizer_id, floor],
      );
      const conversationId = rows[0]?.id as string;
      await this.addParticipants(tx, conversationId, [
        { userId: event.organizer_id, role: 'owner' },
      ]);
      if (!isOrganizer) await this.upsertMember(tx, conversationId, input.viewerId);
      return { outcome: 'ok', conversationId };
    });
  }

  private async addParticipants(
    tx: PoolClient,
    conversationId: string,
    people: ReadonlyArray<{ userId: string; role: 'owner' | 'member' }>,
  ): Promise<void> {
    for (const person of people) {
      await tx.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversationId, person.userId, person.role],
      );
    }
  }

  private async upsertMember(
    tx: PoolClient,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await tx.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET left_at = NULL`,
      [conversationId, userId],
    );
  }

  /**
   * Seats a caller in an event room, or reports that they may not enter.
   *
   * The eligibility read and the insert share one transaction, with the room row
   * locked `FOR SHARE`, so a room archived or deleted between the two cannot
   * still admit someone. The event, its RSVPs and the caller's trust are checked
   * as of the read and are not locked: an event unpublished or an RSVP cancelled
   * in that instant can still admit once, and is caught by the per-request
   * membership re-check in findForParticipant. Returns false for every refusal (a direct thread, a
   * missing, archived or deleted room, an unpublished event, too little trust,
   * no confirmed RSVP) so the caller can answer one indistinguishable 404.
   */
  async joinEventGroup(
    conversationId: string,
    userId: string,
    trustLevel: number,
    assertWindow?: (times: OccurrenceTimes) => void,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (tx) => {
      const { rowCount, rows } = await tx.query<{
        starts_at: Date | null;
        ends_at: Date | null;
      }>(
        `SELECT occ.starts_at, occ.ends_at
           FROM conversations c
           JOIN events e ON e.id = c.event_id
           LEFT JOIN LATERAL (
             SELECT o.starts_at, o.ends_at FROM event_occurrences o
              WHERE o.event_id = e.id AND o.deleted_at IS NULL
                AND (c.occurrence_id IS NULL OR o.id = c.occurrence_id)
              ORDER BY o.starts_at LIMIT 1
           ) occ ON true
          WHERE c.id = $1
            AND c.type = 'event_group'
            AND c.status = 'active'
            AND c.deleted_at IS NULL
            AND e.status = 'published'
            AND e.deleted_at IS NULL
            AND (
              e.organizer_id = $2
              OR (
                c.min_trust_level_to_join <= $3
                AND EXISTS (
                  SELECT 1 FROM rsvps r
                    JOIN event_occurrences o ON o.id = r.occurrence_id
                   WHERE o.event_id = e.id
                     AND (c.occurrence_id IS NULL OR o.id = c.occurrence_id)
                     AND r.user_id = $2
                     AND r.status IN ('confirmed', 'attended')
                     AND r.deleted_at IS NULL
                )
              )
            )
          FOR SHARE OF c`,
        [conversationId, userId, trustLevel],
      );
      if (rowCount === 0) return false;
      const times = rows[0];
      if (times?.starts_at) {
        assertWindow?.({ startsAt: times.starts_at, endsAt: times.ends_at });
      }
      await this.upsertMember(tx, conversationId, userId);
      return true;
    });
  }

  /**
   * Membership and eligibility check backing every read and write on a thread,
   * including the socket's `conversation.join`.
   *
   * Being a participant is not enough for an event room: the viewer must still
   * be its organizer or hold a confirmed/attended RSVP on a published event. A
   * non-member, an ex-attendee and a non-existent conversation are
   * indistinguishable, so this returns null in all three and the caller answers
   * 404 either way.
   */
  async findForParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRow | null> {
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS}, ${PARTICIPANTS_JSON}
         ${conversationFrom('$2')}
        WHERE c.id = $1 AND c.deleted_at IS NULL
          AND ${viewerEligible('$2')}`,
      [conversationId, userId],
    );
    return rows[0] ?? null;
  }

  /** Inbox page, most recently active first; never-used threads sort last. */
  async listForUser(
    userId: string,
    query: ListConversationQueryT,
  ): Promise<{ rows: ConversationRow[]; limit: number }> {
    const cursor = decodeCursor<ConversationCursor>(query.cursor);
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS}, ${PARTICIPANTS_JSON}
         ${conversationFrom('$1')}
        WHERE c.deleted_at IS NULL
          AND ${viewerEligible('$1')}
          AND ($2::conversation_type_enum IS NULL OR c.type = $2)
          AND ($3::conversation_request_status_enum IS NULL OR c.request_status = $3)
          AND ($4::timestamptz IS NULL OR
               (coalesce(c.last_message_at, c.created_at), c.id) < ($4, $5::uuid))
        ORDER BY coalesce(c.last_message_at, c.created_at) DESC, c.id DESC
        LIMIT $6`,
      [
        userId,
        query.type ?? null,
        query.requestStatus ?? null,
        cursor?.lastMessageAt ?? null,
        cursor?.id ?? null,
        query.limit + 1,
      ],
    );
    return { rows, limit: query.limit };
  }

  /**
   * Looks up a message by its client-supplied idempotency key.
   *
   * Callers must consult this before applying any send-side rule: a retry is
   * the same request, not a second one, and must not be measured against a
   * quota the original already consumed.
   */
  async findClientMessage(
    conversationId: string,
    senderUserId: string,
    clientMessageId: string,
  ): Promise<MessageRow | null> {
    const { rows } = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} ${MESSAGE_FROM}
        WHERE m.conversation_id = $1 AND m.sender_user_id = $2 AND m.client_message_id = $3`,
      [conversationId, senderUserId, clientMessageId],
    );
    return rows[0] ?? null;
  }

  /**
   * Appends a message atomically with its idempotency and quota decisions.
   *
   * Lock order: `conversations` row first, then `messages`. Nothing else in
   * this path may take them the other way round. Holding the conversation lock
   * serialises every send to one thread, so the replay lookup, the opening
   * quota count and the insert all observe the same committed state; without
   * it, parallel sends each see the pre-insert count and overshoot the quota,
   * and a retry can pass the replay check and then be charged for the original.
   *
   * `gate` receives the freshly locked conversation state and throws to refuse.
   * It is skipped for a replay, which returns the stored original untouched.
   */
  async appendMessage(
    input: MessageCreateInput,
    gate: (locked: LockedConversation) => void,
  ): Promise<{ row: MessageRow; inserted: boolean }> {
    return withTransaction(this.pool, async (tx) => {
      // A hot room queues senders on this lock, each holding a pooled
      // connection. Bounding the wait turns a pile-up into a fast 503 (55P03)
      // instead of starving unrelated requests of connections.
      await tx.query(`SET LOCAL lock_timeout = '${SEND_LOCK_TIMEOUT}'`);
      const locked = await tx.query<Omit<LockedConversation, 'sentBySender'>>(
        `SELECT type, status, request_status, request_message_quota
           FROM conversations
          WHERE id = $1 AND deleted_at IS NULL
          FOR UPDATE`,
        [input.conversationId],
      );
      const conversation = locked.rows[0];
      if (!conversation) throw new ConversationGoneError();

      const existing = await tx.query<MessageRow>(
        `SELECT ${MESSAGE_COLUMNS} ${MESSAGE_FROM}
          WHERE m.conversation_id = $1 AND m.sender_user_id = $2 AND m.client_message_id = $3`,
        [input.conversationId, input.senderUserId, input.clientMessageId],
      );
      if (existing.rows[0]) return { row: existing.rows[0], inserted: false };

      // Only a pending direct request is measured against the opening quota;
      // every other thread skips the count to keep the lock short.
      let sentBySender = 0;
      if (conversation.type === 'direct' && conversation.request_status === 'pending') {
        const sent = await tx.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM messages
            WHERE conversation_id = $1 AND sender_user_id = $2 AND deleted_at IS NULL`,
          [input.conversationId, input.senderUserId],
        );
        sentBySender = sent.rows[0]?.count ?? 0;
      }
      gate({ ...conversation, sentBySender });

      const insert = await tx.query<{ id: string }>(
        `INSERT INTO messages
           (conversation_id, sender_user_id, type, body, body_locale, media_id,
            shared_event_id, reply_to_message_id, client_message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.conversationId,
          input.senderUserId,
          input.type,
          input.body,
          input.bodyLocale,
          input.mediaId,
          input.sharedEventId,
          input.replyToMessageId,
          input.clientMessageId,
        ],
      );
      // The sender's identity comes from a join, which RETURNING cannot do.
      const { rows } = await tx.query<MessageRow>(
        `SELECT ${MESSAGE_COLUMNS} ${MESSAGE_FROM} WHERE m.id = $1`,
        [insert.rows[0]?.id],
      );
      return { row: rows[0] as MessageRow, inserted: true };
    });
  }

  /**
   * One page of a thread, newest first.
   *
   * The cursor is a message id: UUIDv7 sorts by creation time, so no separate
   * timestamp column is needed in the key and there are no ties to break.
   */
  async listMessages(
    conversationId: string,
    query: ListMessageQueryT,
  ): Promise<{ rows: MessageRow[]; limit: number }> {
    const cursor = decodeCursor<{ id: string }>(query.cursor);
    const { rows } = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} ${MESSAGE_FROM}
        WHERE m.conversation_id = $1
          AND m.deleted_at IS NULL
          AND m.status = 'visible'
          AND ($2::uuid IS NULL OR m.id < $2)
        ORDER BY m.id DESC
        LIMIT $3`,
      [conversationId, cursor?.id ?? null, query.limit + 1],
    );
    return { rows, limit: query.limit };
  }

  async findMessage(id: string): Promise<MessageRow | null> {
    const { rows } = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} ${MESSAGE_FROM} WHERE m.id = $1 AND m.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Only the sender can delete, and only inside the conversation named in the URL. */
  async softDeleteMessage(
    conversationId: string,
    id: string,
    senderUserId: string,
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE messages SET deleted_at = now(), status = 'removed'
        WHERE id = $1 AND conversation_id = $2 AND sender_user_id = $3 AND deleted_at IS NULL`,
      [id, conversationId, senderUserId],
    );
    return (rowCount ?? 0) > 0;
  }

  /** True when the message belongs to the conversation, whatever its state. */
  async messageInConversation(conversationId: string, messageId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2`,
      [messageId, conversationId],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Marks the caller as having left an event room.
   *
   * Returns false only when the caller never had a seat, so a repeat leave stays
   * a success while a stranger still learns nothing. A direct thread is not
   * leavable: there is no way back in, so it would silently end the pair's thread.
   */
  async leave(conversationId: string, userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ seated: boolean }>(
      `WITH seat AS (
         SELECT p.left_at FROM conversation_participants p
           JOIN conversations c ON c.id = p.conversation_id
          WHERE p.conversation_id = $1 AND p.user_id = $2
            AND c.type = 'event_group' AND c.deleted_at IS NULL
       ), upd AS (
         UPDATE conversation_participants SET left_at = now()
          WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
            AND EXISTS (SELECT 1 FROM seat)
       )
       SELECT EXISTS (SELECT 1 FROM seat) AS seated`,
      [conversationId, userId],
    );
    return rows[0]?.seated ?? false;
  }

  /**
   * Advances the read marker and clears the unread badge.
   *
   * The marker only moves forward: an out-of-order acknowledgement from a
   * second device must not resurrect messages the user has already read.
   */
  async markRead(
    conversationId: string,
    userId: string,
    lastReadMessageId: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE conversation_participants
          SET last_read_message_id = $3,
              last_read_at = now(),
              unread_count = (
                SELECT count(*) FROM messages m
                 WHERE m.conversation_id = $1
                   AND m.id > $3
                   AND m.deleted_at IS NULL
                   AND m.sender_user_id IS DISTINCT FROM $2
              )
        WHERE conversation_id = $1
          AND user_id = $2
          AND (last_read_message_id IS NULL OR last_read_message_id < $3)`,
      [conversationId, userId, lastReadMessageId],
    );
  }

  /** Recipient's answer to a conversation request. Only they may call it. */
  async respondToRequest(
    conversationId: string,
    recipientId: string,
    decision: 'accepted' | 'declined' | 'blocked',
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      // Both casts are load-bearing: without them PostgreSQL infers $3 as enum
      // from the assignment and as text from the comparison, and refuses the
      // statement with 42P08.
      `UPDATE conversations
          SET request_status = $3::conversation_request_status_enum,
              status = CASE WHEN $3::text = 'blocked' THEN 'closed' ELSE status END,
              updated_at = now()
        WHERE id = $1
          AND type = 'direct'
          AND request_status = 'pending'
          AND created_by_user_id <> $2
          AND $2 IN (user_a_id, user_b_id)`,
      [conversationId, recipientId, decision],
    );
    return (rowCount ?? 0) > 0;
  }

  /** Recipients of a realtime broadcast: everyone still in the room. */
  async activeParticipantIds(conversationId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants
        WHERE conversation_id = $1 AND left_at IS NULL`,
      [conversationId],
    );
    return rows.map((row) => row.user_id);
  }
}
