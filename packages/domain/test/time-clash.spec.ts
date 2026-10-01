import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_EVENT_DURATION_MINUTES,
  eventEndMs,
  findTimeClashes,
  findTimeClashesAgainst,
  selectSwipeCandidates,
  type ClashInput,
  type DeckEvent,
} from '../src/time-clash.js';

// The package ships no Node typings; reach the environment through a minimal shape.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
  .process.env;
const originalTz = env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete env.TZ;
  else env.TZ = originalTz;
});

const at = (hhmm: string, day = '2026-10-03'): string => `${day}T${hhmm}:00+07:00`;
const ev = (id: string, start: string, end: string | null): ClashInput => ({
  id,
  startsAt: at(start),
  endsAt: end === null ? null : at(end),
});

const A = ev('A', '19:00', '21:00');
const B = ev('B', '20:00', '22:30');
const C = ev('C', '21:00', '22:00');

describe('eventEndMs', () => {
  it('uses endsAt when it is after startsAt', () => {
    expect(eventEndMs(A)).toBe(Date.parse(at('21:00')));
  });

  it('falls back to 120 minutes when endsAt is null', () => {
    expect(DEFAULT_EVENT_DURATION_MINUTES).toBe(120);
    expect(eventEndMs(ev('D', '19:00', null))).toBe(Date.parse(at('21:00')));
  });

  it('treats endsAt equal to or before startsAt as null', () => {
    expect(eventEndMs(ev('X', '19:00', '19:00'))).toBe(Date.parse(at('21:00')));
    expect(eventEndMs(ev('Y', '19:00', '18:00'))).toBe(Date.parse(at('21:00')));
  });

  it('treats an unparseable endsAt as null', () => {
    expect(eventEndMs({ id: 'G', startsAt: at('19:00'), endsAt: 'garbage' })).toBe(
      Date.parse(at('21:00')),
    );
  });

  it('returns NaN for an invalid start', () => {
    expect(eventEndMs({ id: 'Z', startsAt: 'nope', endsAt: null })).toBeNaN();
  });
});

describe('findTimeClashes', () => {
  it('A overlaps B; C only touches A but overlaps B', () => {
    const clashes = findTimeClashes([C, B, A]);
    expect(clashes).toEqual([
      { aId: 'A', bId: 'B', assumedEnd: false },
      { aId: 'B', bId: 'C', assumedEnd: false },
    ]);
  });

  it('back-to-back events do not clash', () => {
    expect(findTimeClashes([A, C])).toEqual([]);
  });

  it('D (19:00, no end) overlaps E (20:30) with assumedEnd', () => {
    const D = ev('D', '19:00', null);
    const E = ev('E', '20:30', null);
    expect(findTimeClashes([D, E])).toEqual([{ aId: 'D', bId: 'E', assumedEnd: true }]);
  });

  it('F starting exactly at 21:00 does not clash with D', () => {
    const D = ev('D', '19:00', null);
    const F = ev('F', '21:00', null);
    expect(findTimeClashes([D, F])).toEqual([]);
  });

  it('flags assumedEnd when endsAt is garbage', () => {
    const g: ClashInput = { id: 'G', startsAt: at('19:00'), endsAt: 'garbage' };
    expect(findTimeClashes([g, ev('H', '20:00', '21:00')])).toEqual([
      { aId: 'G', bId: 'H', assumedEnd: true },
    ]);
  });

  it('flags assumedEnd when only one side is open-ended', () => {
    const D = ev('D', '19:00', null);
    expect(findTimeClashes([D, ev('G', '20:00', '21:00')])[0]?.assumedEnd).toBe(true);
  });

  it('ignores entries with unparseable dates', () => {
    const bad: ClashInput = { id: 'bad', startsAt: 'garbage', endsAt: null };
    expect(findTimeClashes([A, bad, B])).toEqual([{ aId: 'A', bId: 'B', assumedEnd: false }]);
  });

  it('orders ties on start by id and is independent of input order', () => {
    const p = ev('b', '19:00', '20:00');
    const q = ev('a', '19:00', '20:00');
    expect(findTimeClashes([p, q])).toEqual([{ aId: 'a', bId: 'b', assumedEnd: false }]);
    expect(findTimeClashes([q, p])).toEqual(findTimeClashes([p, q]));
  });

  it('does not pair an id with itself', () => {
    expect(findTimeClashes([A, { ...A }])).toEqual([]);
  });
});

describe('findTimeClashesAgainst', () => {
  it('pairs each item with each fixed event', () => {
    expect(findTimeClashesAgainst([A], [B, C])).toEqual([{ aId: 'A', bId: 'B', assumedEnd: false }]);
  });

  it('skips pairs with the same id', () => {
    expect(findTimeClashesAgainst([A], [A])).toEqual([]);
  });

  it('is deterministic regardless of input order', () => {
    const b2 = ev('B2', '20:00', '21:00');
    expect(findTimeClashesAgainst([A], [b2, B])).toEqual(findTimeClashesAgainst([A], [B, b2]));
  });

  it('is independent of the host time zone', () => {
    const baseline = findTimeClashes([A, B, C]);
    for (const tz of ['America/New_York', 'Pacific/Auckland', 'UTC']) {
      env.TZ = tz;
      expect(findTimeClashes([A, B, C])).toEqual(baseline);
    }
  });
});

describe('selectSwipeCandidates', () => {
  const now = new Date('2026-10-01T10:00:00.000Z');
  const mk = (id: string, over: Partial<DeckEvent> = {}): DeckEvent => ({
    id,
    startsAt: '2026-10-02T10:00:00.000Z',
    viewerRsvpStatus: null,
    organizerHandle: 'host',
    ...over,
  });
  const ctx = (over: Partial<Parameters<typeof selectSwipeCandidates<DeckEvent>>[2]> = {}) => ({
    now,
    viewerHandle: 'me' as string | null,
    savedIds: new Set<string>(),
    skippedActiveIds: new Set<string>(),
    ...over,
  });
  const ids = (list: DeckEvent[]) => list.map((e) => e.id);
  const run = (events: DeckEvent[], c = ctx()) => selectSwipeCandidates(events, (e) => e, c);

  it('drops saved events', () => {
    expect(ids(run([mk('1'), mk('2')], ctx({ savedIds: new Set(['1']) })))).toEqual(['2']);
  });

  it('drops events skipped with an active snooze', () => {
    expect(ids(run([mk('1'), mk('2')], ctx({ skippedActiveIds: new Set(['2']) })))).toEqual(['1']);
  });

  it('keeps an event whose skip has expired (not in the active set)', () => {
    expect(ids(run([mk('1')], ctx({ skippedActiveIds: new Set() })))).toEqual(['1']);
  });

  it('drops events the viewer already RSVP\'d to', () => {
    expect(ids(run([mk('1', { viewerRsvpStatus: 'waitlisted' }), mk('2')]))).toEqual(['2']);
  });

  it('drops events organized by the viewer, but not when signed out', () => {
    const own = mk('1', { organizerHandle: 'me' });
    expect(ids(run([own, mk('2')]))).toEqual(['2']);
    expect(ids(run([own], ctx({ viewerHandle: null })))).toEqual(['1']);
  });

  it('drops events that have started, including exactly now', () => {
    const started = mk('1', { startsAt: '2026-10-01T09:59:59.000Z' });
    const exactly = mk('2', { startsAt: now.toISOString() });
    expect(ids(run([started, exactly, mk('3')]))).toEqual(['3']);
  });

  it('preserves input order', () => {
    expect(ids(run([mk('c'), mk('a'), mk('b')]))).toEqual(['c', 'a', 'b']);
  });

  it('never drops an event for being full (no capacity field)', () => {
    expect(Object.keys(mk('1'))).not.toContain('capacity');
    expect(ids(run([mk('1')]))).toEqual(['1']);
  });
});
