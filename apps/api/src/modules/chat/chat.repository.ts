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
                    ELSE to_char(p.left_at AT TIME ZONE 'UTC', ${JSON_UTC}) END
   ) ORDER BY p.joined_at), '[]'::json)
     FROM conversation_participants p WHERE p.conversation_id = c.id) AS participants
`;

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
  }>;
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

interface ConversationCursor extends Record<string, unknown> {
  lastMessageAt: string | null;
  id: string;
}

const CONVERSATION_COLUMNS = `
  c.id, c.type, c.event_id, c.occurrence_id, c.created_by_user_id,
  c.request_status, c.status, c.last_message_at, c.last_message_preview,
  c.message_count, c.created_at, me.unread_count
`;

const MESSAGE_COLUMNS = `
  m.id, m.conversation_id, m.sender_user_id, m.type, m.body, m.body_locale,
  m.media_id, m.shared_event_id, m.reply_to_message_id, m.status,
  m.edited_at, m.created_at
`;

/** Same fields without the alias: RETURNING has no FROM clause to alias. */
const MESSAGE_RETURNING = `
  id, conversation_id, sender_user_id, type, body, body_locale,
  media_id, shared_event_id, reply_to_message_id, status,
  edited_at, created_at
`;

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
   * Opens the room for an event or one of its occurrences. A group room needs
   * no request flow, so it starts accepted; membership is what gates it.
   */
  async createEventGroup(
    eventId: string,
    occurrenceId: string | null,
    createdBy: string,
    minTrustLevelToJoin: number,
  ): Promise<string> {
    return withTransaction(this.pool, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO conversations
           (type, event_id, occurrence_id, created_by_user_id, request_status, min_trust_level_to_join)
         VALUES ('event_group', $1, $2, $3, 'accepted', $4)
         RETURNING id`,
        [eventId, occurrenceId, createdBy, minTrustLevelToJoin],
      );
      const conversationId = rows[0]?.id as string;
      await this.addParticipants(tx, conversationId, [
        { userId: createdBy, role: 'owner' },
      ]);
      return conversationId;
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

  /** Joins a member to an existing room, or revives a membership they left. */
  async join(conversationId: string, userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET left_at = NULL`,
      [conversationId, userId],
    );
  }

  /**
   * Membership check backing every read and write on a thread.
   *
   * A non-member must be indistinguishable from a non-existent conversation, so
   * this returns null in both cases and the caller answers 404 either way.
   */
  async findForParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRow | null> {
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS}, ${PARTICIPANTS_JSON}
         FROM conversations c
         JOIN conversation_participants me
           ON me.conversation_id = c.id AND me.user_id = $2 AND me.left_at IS NULL
        WHERE c.id = $1 AND c.deleted_at IS NULL`,
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
         FROM conversations c
         JOIN conversation_participants me
           ON me.conversation_id = c.id AND me.user_id = $1 AND me.left_at IS NULL
        WHERE c.deleted_at IS NULL
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

  /** Messages the request-quota check counts: what the opener has already sent. */
  async countMessagesFrom(conversationId: string, senderUserId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM messages
        WHERE conversation_id = $1 AND sender_user_id = $2 AND deleted_at IS NULL`,
      [conversationId, senderUserId],
    );
    return rows[0]?.count ?? 0;
  }

  async requestMessageQuota(conversationId: string): Promise<number> {
    const { rows } = await this.pool.query<{ request_message_quota: number }>(
      `SELECT request_message_quota FROM conversations WHERE id = $1`,
      [conversationId],
    );
    return rows[0]?.request_message_quota ?? 0;
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
      `SELECT ${MESSAGE_COLUMNS} FROM messages m
        WHERE m.conversation_id = $1 AND m.sender_user_id = $2 AND m.client_message_id = $3`,
      [conversationId, senderUserId, clientMessageId],
    );
    return rows[0] ?? null;
  }

  /**
   * Appends a message, or returns the one a previous attempt already stored.
   *
   * The idempotency key is the client's, so a retry after a dropped connection
   * resolves to the original row. `DO NOTHING` plus a re-read is used instead of
   * `DO UPDATE` because a retry must not be able to rewrite a delivered message.
   */
  async createMessage(input: MessageCreateInput): Promise<MessageRow> {
    const inserted = await this.pool.query<MessageRow>(
      `INSERT INTO messages
         (conversation_id, sender_user_id, type, body, body_locale, media_id,
          shared_event_id, reply_to_message_id, client_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (conversation_id, sender_user_id, client_message_id)
         WHERE client_message_id IS NOT NULL
       DO NOTHING
       RETURNING ${MESSAGE_RETURNING}`,
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
    if (inserted.rows[0]) return inserted.rows[0];

    const { rows } = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages m
        WHERE m.conversation_id = $1 AND m.sender_user_id = $2 AND m.client_message_id = $3`,
      [input.conversationId, input.senderUserId, input.clientMessageId],
    );
    return rows[0] as MessageRow;
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
      `SELECT ${MESSAGE_COLUMNS} FROM messages m
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
      `SELECT ${MESSAGE_COLUMNS} FROM messages m WHERE m.id = $1 AND m.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async softDeleteMessage(id: string, senderUserId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE messages SET deleted_at = now(), status = 'removed'
        WHERE id = $1 AND sender_user_id = $2 AND deleted_at IS NULL`,
      [id, senderUserId],
    );
    return (rowCount ?? 0) > 0;
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
