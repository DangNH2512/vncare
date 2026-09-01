import { z } from 'zod';
import { BodyLocale, ContentStatus, CursorQuery } from './content';

export const ConversationType = z.enum(['direct', 'event_group']);
export type ConversationTypeT = z.infer<typeof ConversationType>;

export const ConversationRequestStatus = z.enum([
  'pending',
  'accepted',
  'declined',
  'blocked',
]);
export type ConversationRequestStatusT = z.infer<typeof ConversationRequestStatus>;

export const MessageType = z.enum(['text', 'image', 'event_share', 'system']);
export type MessageTypeT = z.infer<typeof MessageType>;

/**
 * Opening a conversation.
 *
 * A direct thread is addressed by recipient, not by conversation id, because
 * the caller cannot know whether one already exists; the server resolves the
 * canonical pair and returns the existing thread when there is one.
 */
export const ConversationCreateRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('direct'),
    recipientUserId: z.uuid(),
  }),
  z.object({
    type: z.literal('event_group'),
    eventId: z.uuid(),
    occurrenceId: z.uuid().optional(),
    /** Host-set floor for joining the room; 0 opens it to every registered member. */
    minTrustLevelToJoin: z.number().int().min(0).max(5).default(0),
  }),
]);
export type ConversationCreateRequestT = z.infer<typeof ConversationCreateRequest>;

/** Accepting or refusing a conversation request. Only the recipient may call it. */
export const ConversationRespondRequest = z.object({
  decision: z.enum(['accepted', 'declined', 'blocked']),
});
export type ConversationRespondRequestT = z.infer<typeof ConversationRespondRequest>;

/**
 * Sending a message.
 *
 * `clientMessageId` is mandatory and is the idempotency key: a mobile retry
 * after a dropped connection returns the original message instead of posting a
 * duplicate. `type: 'system'` is not accepted from a client.
 */
export const MessageCreateRequest = z
  .object({
    type: z.enum(['text', 'image', 'event_share']).default('text'),
    body: z.string().trim().min(1).max(4000).optional(),
    bodyLocale: BodyLocale.optional(),
    mediaId: z.uuid().optional(),
    sharedEventId: z.uuid().optional(),
    replyToMessageId: z.uuid().optional(),
    clientMessageId: z.uuid(),
  })
  // Mirrors ck_messages_payload: the database is the final guard, this is the
  // one that produces a readable 400 instead of a constraint violation.
  .refine(
    (m) =>
      (m.type === 'text' && m.body !== undefined) ||
      (m.type === 'image' && m.mediaId !== undefined) ||
      (m.type === 'event_share' && m.sharedEventId !== undefined),
    { error: 'errors.chat.messagePayloadMismatch', path: ['type'] },
  );
export type MessageCreateRequestT = z.infer<typeof MessageCreateRequest>;

export const MessageResponse = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderUserId: z.uuid().nullable(),
  type: MessageType,
  body: z.string().nullable(),
  bodyLocale: BodyLocale.nullable(),
  mediaId: z.uuid().nullable(),
  sharedEventId: z.uuid().nullable(),
  replyToMessageId: z.uuid().nullable(),
  status: ContentStatus,
  editedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type MessageResponseT = z.infer<typeof MessageResponse>;

/** A participant as seen by another participant: identity and role, nothing else. */
export const ConversationParticipantResponse = z.object({
  userId: z.uuid(),
  role: z.enum(['owner', 'member']),
  joinedAt: z.iso.datetime(),
  leftAt: z.iso.datetime().nullable(),
});
export type ConversationParticipantResponseT = z.infer<
  typeof ConversationParticipantResponse
>;

/**
 * Inbox row.
 *
 * `unreadCount` is the caller's own. Other participants' read state is never
 * exposed — whether someone has read a message is theirs to disclose.
 */
export const ConversationResponse = z.object({
  id: z.uuid(),
  type: ConversationType,
  eventId: z.uuid().nullable(),
  occurrenceId: z.uuid().nullable(),
  createdByUserId: z.uuid(),
  requestStatus: ConversationRequestStatus,
  status: z.enum(['active', 'archived', 'closed']),
  lastMessageAt: z.iso.datetime().nullable(),
  lastMessagePreview: z.string().nullable(),
  messageCount: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
  participants: z.array(ConversationParticipantResponse),
  createdAt: z.iso.datetime(),
});
export type ConversationResponseT = z.infer<typeof ConversationResponse>;

export const ListConversationQuery = CursorQuery.extend({
  type: ConversationType.optional(),
  /** Restricts the inbox to unanswered requests, backing the "3 invites" badge. */
  requestStatus: ConversationRequestStatus.optional(),
});
export type ListConversationQueryT = z.infer<typeof ListConversationQuery>;

/** Messages page backwards from newest; `cursor` is the id of the oldest row already held. */
export const ListMessageQuery = CursorQuery;
export type ListMessageQueryT = z.infer<typeof ListMessageQuery>;

/** Advances the caller's read marker and zeroes their unread counter. */
export const MarkReadRequest = z.object({
  lastReadMessageId: z.uuid(),
});
export type MarkReadRequestT = z.infer<typeof MarkReadRequest>;

/**
 * Realtime event names emitted on the `/chat` socket namespace. Clients must
 * treat REST as the source of truth and these as an acceleration layer — a
 * dropped socket loses no message.
 */
export const CHAT_SOCKET_EVENTS = {
  messageCreated: 'message.created',
  conversationUpdated: 'conversation.updated',
  typing: 'typing',
} as const;
