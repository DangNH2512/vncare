/**
 * Event group chat endpoints.
 *
 * Kept out of `api.ts` so the chat feature owns its own transport file. Response
 * shapes come from `@dnc/contracts`; this file owns paths and request bodies
 * only. REST is the source of truth: a message exists once `sendMessage`
 * resolves, whatever a socket may or may not have announced.
 */
import type { ConversationResponseT, MessageResponseT } from '@dnc/contracts';

import { call } from './api';

export interface MessagePage {
  items: MessageResponseT[];
  nextCursor: string | null;
}

/** Opens the room of an event, creating it on first use; returns the same room every time. */
export function openEventChat(eventId: string, occurrenceId?: string): Promise<ConversationResponseT> {
  return call<ConversationResponseT>('/api/v1/conversations', {
    method: 'POST',
    body: JSON.stringify({
      type: 'event_group',
      eventId,
      ...(occurrenceId === undefined ? {} : { occurrenceId }),
    }),
  });
}

export function getConversation(id: string, signal?: AbortSignal): Promise<ConversationResponseT> {
  return call<ConversationResponseT>(
    `/api/v1/conversations/${id}`,
    signal === undefined ? undefined : { signal },
  );
}

export interface ListMessagesParams {
  /** Id of the oldest message already held; omitted for the newest page. */
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}

/** Newest first; `nextCursor` continues towards older messages. */
export function listMessages(id: string, params: ListMessagesParams = {}): Promise<MessagePage> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 30) });
  if (params.cursor !== undefined && params.cursor !== null) query.set('cursor', params.cursor);
  return call<MessagePage>(
    `/api/v1/conversations/${id}/messages?${query.toString()}`,
    params.signal === undefined ? undefined : { signal: params.signal },
  );
}

/**
 * Sends a text message. `clientMessageId` is the idempotency key: the caller
 * generates it once per message and passes the same value on every retry, so a
 * retry after a lost response returns the stored message instead of a second one.
 */
export function sendMessage(
  id: string,
  body: string,
  clientMessageId: string,
  signal?: AbortSignal,
): Promise<MessageResponseT> {
  return call<MessageResponseT>(`/api/v1/conversations/${id}/messages`, {
    method: 'POST',
    // `bodyLocale` is left out on purpose: the UI cannot know which language was typed.
    body: JSON.stringify({ type: 'text', body, clientMessageId }),
    ...(signal === undefined ? {} : { signal }),
  });
}

export function deleteMessage(id: string, messageId: string): Promise<void> {
  return call<void>(`/api/v1/conversations/${id}/messages/${messageId}`, { method: 'DELETE' });
}

export function markConversationRead(id: string, lastReadMessageId: string): Promise<ConversationResponseT> {
  return call<ConversationResponseT>(`/api/v1/conversations/${id}/read`, {
    method: 'PUT',
    body: JSON.stringify({ lastReadMessageId }),
  });
}

/** Idempotent: 204 every time, so a retry after a dropped response is harmless. */
export function leaveConversation(id: string): Promise<void> {
  return call<void>(`/api/v1/conversations/${id}/participants/me`, { method: 'DELETE' });
}
