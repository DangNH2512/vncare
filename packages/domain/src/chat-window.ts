/**
 * Time window in which an event group chat accepts messages.
 *
 * Pure arithmetic on instants: no locale API and no host time zone is consulted,
 * so the same input resolves to the same window on every machine. The API uses
 * it to gate requests; clients use it to show "Opens {time}".
 */

const HOUR_MS = 3_600_000;

/** The room opens this long before the event starts. */
export const CHAT_OPEN_BEFORE_START_MS = 48 * HOUR_MS;
/** The room closes this long after the event ends (or starts, when it has no end). */
export const CHAT_CLOSE_AFTER_END_MS = 48 * HOUR_MS;

export interface ChatWindow {
  opensAt: Date;
  closesAt: Date;
}

export type ChatState = 'not_open' | 'open' | 'closed';

/**
 * Resolves the chat window of an occurrence.
 *
 * Without `endsAt` the closing time is measured from `startsAt`.
 */
export function chatWindowOf(input: { startsAt: Date; endsAt?: Date | null }): ChatWindow {
  const startMs = input.startsAt.getTime();
  const endMs = input.endsAt ? input.endsAt.getTime() : startMs;
  return {
    opensAt: new Date(startMs - CHAT_OPEN_BEFORE_START_MS),
    closesAt: new Date(endMs + CHAT_CLOSE_AFTER_END_MS),
  };
}

/**
 * State of the window at `now`: open from `opensAt` inclusive, closed from
 * `closesAt` inclusive.
 */
export function chatStateAt(window: ChatWindow, now: Date): ChatState {
  const nowMs = now.getTime();
  if (nowMs >= window.closesAt.getTime()) return 'closed';
  if (nowMs >= window.opensAt.getTime()) return 'open';
  return 'not_open';
}
