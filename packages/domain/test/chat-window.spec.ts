import { afterEach, describe, expect, it } from 'vitest';
import {
  CHAT_CLOSE_AFTER_END_MS,
  CHAT_OPEN_BEFORE_START_MS,
  chatStateAt,
  chatWindowOf,
} from '../src/chat-window.js';

const HOUR = 3_600_000;
const at = (iso: string): Date => new Date(iso);

// The package ships no Node typings; reach the environment through a minimal shape.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
  .process.env;
const originalTz = env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete env.TZ;
  else env.TZ = originalTz;
});

describe('chatWindowOf', () => {
  it('uses 48 hours on both sides', () => {
    expect(CHAT_OPEN_BEFORE_START_MS).toBe(48 * HOUR);
    expect(CHAT_CLOSE_AFTER_END_MS).toBe(48 * HOUR);
  });

  it('opens 48h before the start and closes 48h after the end', () => {
    const w = chatWindowOf({
      startsAt: at('2026-10-10T10:00:00.000Z'),
      endsAt: at('2026-10-10T12:00:00.000Z'),
    });
    expect(w.opensAt.toISOString()).toBe('2026-10-08T10:00:00.000Z');
    expect(w.closesAt.toISOString()).toBe('2026-10-12T12:00:00.000Z');
  });

  it('measures the close from the start when there is no end', () => {
    const startsAt = at('2026-10-10T10:00:00.000Z');
    for (const w of [chatWindowOf({ startsAt }), chatWindowOf({ startsAt, endsAt: null })]) {
      expect(w.closesAt.toISOString()).toBe('2026-10-12T10:00:00.000Z');
    }
  });
});

describe('chatStateAt', () => {
  const window = chatWindowOf({
    startsAt: at('2026-10-10T10:00:00.000Z'),
    endsAt: at('2026-10-10T12:00:00.000Z'),
  });
  const opens = window.opensAt.getTime();
  const closes = window.closesAt.getTime();

  it('is not_open one second before opensAt and open exactly at it', () => {
    expect(chatStateAt(window, new Date(opens - 1000))).toBe('not_open');
    expect(chatStateAt(window, new Date(opens))).toBe('open');
    expect(chatStateAt(window, new Date(opens + 1000))).toBe('open');
  });

  it('is open one second before closesAt and closed exactly at it', () => {
    expect(chatStateAt(window, new Date(closes - 1000))).toBe('open');
    expect(chatStateAt(window, new Date(closes))).toBe('closed');
    expect(chatStateAt(window, new Date(closes + 1000))).toBe('closed');
  });

  it('applies the same boundaries without an end time', () => {
    const w = chatWindowOf({ startsAt: at('2026-10-10T10:00:00.000Z') });
    expect(chatStateAt(w, at('2026-10-12T09:59:59.000Z'))).toBe('open');
    expect(chatStateAt(w, at('2026-10-12T10:00:00.000Z'))).toBe('closed');
  });

  it('does not depend on the host time zone', () => {
    const results = ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles'].map((tz) => {
      env.TZ = tz;
      const w = chatWindowOf({ startsAt: at('2026-03-08T10:00:00.000Z') });
      return [
        w.opensAt.toISOString(),
        w.closesAt.toISOString(),
        chatStateAt(w, at('2026-03-06T10:00:00.000Z')),
      ];
    });
    expect(new Set(results.map((r) => r.join('|'))).size).toBe(1);
  });
});
