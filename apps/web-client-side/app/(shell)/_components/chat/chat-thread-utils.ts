import type { MessageResponseT } from '@dnc/contracts';

import { ApiError } from '../../../_lib/api';

export type ThreadStatus = 'loading' | 'ready' | 'error' | 'gone';
export type ConnectionState = 'ok' | 'reconnecting' | 'offline';
export type RefusalReason = 'closed' | 'notOpen';

/**
 * A message the member typed that the server has not confirmed yet.
 *
 * `queued` waits for its turn or for the network (shown as "Sending…"),
 * `sending` is in flight, `failed` waits for the member (Retry or Discard).
 */
export interface OutboxItem {
  /** Generated once per message; every resend reuses it so the server dedupes. */
  clientMessageId: string;
  body: string;
  state: 'queued' | 'sending' | 'failed';
  /** Why the last attempt failed; read by the view to pick the wording. */
  cause?: unknown;
  /** The room refused the message for good (closed or not open): no retry is offered. */
  final: boolean;
  /** Uncertain attempts so far; drives the backoff and the automatic give-up. */
  attempts: number;
  /** Epoch ms before which the next automatic attempt must not start. */
  notBefore: number;
}

/** `crypto.randomUUID` needs a secure context; a phone on plain-http LAN has only `getRandomValues`. */
export function newMessageId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Oldest first: ids are time-ordered, so id order is arrival order. */
export function sortAscending(list: MessageResponseT[]): MessageResponseT[] {
  return list.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function mergeById(existing: MessageResponseT[], incoming: MessageResponseT[]): MessageResponseT[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return sortAscending([...byId.values()]);
}

/** A 404 means the room is gone for this member, except a message that was already removed. */
export function isRoomGone(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 404 && cause.code !== 'MESSAGE_NOT_FOUND';
}

/** The request may or may not have been stored: no answer, or a gateway gave up after forwarding. */
export function isUncertain(cause: unknown): boolean {
  if (!(cause instanceof ApiError)) return true;
  return [0, 502, 503, 504].includes(cause.status);
}

export function refusalOf(cause: unknown): RefusalReason | null {
  if (!(cause instanceof ApiError) || cause.status !== 403) return null;
  if (cause.code === 'CONVERSATION_CLOSED') return 'closed';
  if (cause.code === 'CHAT_NOT_OPEN') return 'notOpen';
  return null;
}


/**
 * Folds a fresh newest page (newest first) into the held messages (oldest first).
 *
 * Message ids are `uuidv7()` by default (`messages.id`, 0004_community_interaction.sql), so
 * comparing them as strings orders messages by creation time; every comparison below relies on it.
 *
 * If the page does not reach back to the message held last, more than a page
 * arrived between two polls: the list is replaced by the page and the cursor
 * restarts from it (`replaced: true`), so there is never a silent hole.
 * Otherwise messages inside the page's range that the server no longer returns
 * were removed, and older ones are left alone.
 */
export function foldNewest(
  held: MessageResponseT[],
  page: MessageResponseT[],
  cursor: string | null,
): { messages: MessageResponseT[]; replaced: boolean } {
  const oldestInPage = page.at(-1)?.id ?? null;
  const heldTail = held.at(-1)?.id ?? null;
  if (cursor !== null && oldestInPage !== null && heldTail !== null && oldestInPage > heldTail) {
    return { messages: sortAscending(page), replaced: true };
  }
  const floor = cursor !== null ? oldestInPage : null;
  const incomingIds = new Set(page.map((item) => item.id));
  const kept = held.filter((item) => incomingIds.has(item.id) || (floor !== null && item.id < floor));
  return { messages: mergeById(kept, page), replaced: false };
}
