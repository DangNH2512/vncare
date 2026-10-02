import type { ConversationResponseT, MessageResponseT } from '@dnc/contracts';
import { chatWindowOf } from '@dnc/domain';
import { toUserSummary } from '../../common/mappers/user-summary.mapper.js';
import type { ConversationRow, MessageRow } from './chat.repository.js';

/**
 * Inbox row.
 *
 * `unreadCount` is the viewer's own, taken from their participant row. Other
 * participants' read state is deliberately absent: whether someone has read a
 * message is theirs to disclose, not the API's.
 */
export function toConversationResponse(row: ConversationRow): ConversationResponseT {
  return {
    id: row.id,
    type: row.type,
    eventId: row.event_id,
    occurrenceId: row.occurrence_id,
    createdByUserId: row.created_by_user_id,
    requestStatus: row.request_status,
    status: row.status,
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    lastMessagePreview: row.last_message_preview,
    messageCount: row.message_count,
    unreadCount: row.unread_count,
    // Field by field: the row's participant JSON carries identity columns that
    // must reach the client only through UserSummary.
    participants: row.participants.map((p) => ({
      userId: p.userId,
      user: toUserSummary(p.userId, {
        handle: p.handle,
        displayName: p.displayName,
        trustLevel: p.trustLevel,
      }),
      role: p.role,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
    })),
    event:
      row.event_id && row.event_title !== null && row.event_starts_at
        ? {
            id: row.event_id,
            title: row.event_title,
            startsAt: row.event_starts_at.toISOString(),
            endsAt: row.event_ends_at?.toISOString() ?? null,
          }
        : null,
    chatWindow: toChatWindow(row),
    createdAt: row.created_at.toISOString(),
  };
}

/** Null for a direct thread, which is not time-boxed. */
function toChatWindow(row: ConversationRow): ConversationResponseT['chatWindow'] {
  if (row.type !== 'event_group' || !row.event_starts_at) return null;
  const window = chatWindowOf({ startsAt: row.event_starts_at, endsAt: row.event_ends_at });
  return { opensAt: window.opensAt.toISOString(), closesAt: window.closesAt.toISOString() };
}

export function toMessageResponse(row: MessageRow): MessageResponseT {
  const visible = row.status === 'visible';
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    sender: toUserSummary(row.sender_user_id, {
      handle: row.sender_handle,
      displayName: row.sender_display_name,
      trustLevel: row.sender_trust_level,
    }),
    type: row.type,
    // A tombstone keeps who and when, never what.
    body: visible ? row.body : null,
    bodyLocale: visible ? row.body_locale : null,
    mediaId: visible ? row.media_id : null,
    sharedEventId: visible ? row.shared_event_id : null,
    replyToMessageId: visible ? row.reply_to_message_id : null,
    status: row.status,
    editedAt: visible ? (row.edited_at?.toISOString() ?? null) : null,
    createdAt: row.created_at.toISOString(),
  };
}
