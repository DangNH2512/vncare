import type { ConversationResponseT, MessageResponseT } from '@dnc/contracts';
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
    participants: row.participants,
    createdAt: row.created_at.toISOString(),
  };
}

export function toMessageResponse(row: MessageRow): MessageResponseT {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    type: row.type,
    body: row.body,
    bodyLocale: row.body_locale,
    mediaId: row.media_id,
    sharedEventId: row.shared_event_id,
    replyToMessageId: row.reply_to_message_id,
    status: row.status,
    editedAt: row.edited_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}
