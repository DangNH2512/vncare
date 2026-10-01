import { afterEach, describe, expect, it } from 'vitest';
import { resolveEventWindow } from '../src/event-window.js';

/** Builds the instant for an ICT (UTC+7) wall-clock time. */
const ict = (iso: string): Date => new Date(`${iso}+07:00`);

// The package ships no Node typings; reach the environment through a minimal shape.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
  .process.env;
const originalTz = env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete env.TZ;
  else env.TZ = originalTz;
});

describe('resolveEventWindow', () => {
  it('upcoming is unbounded above', () => {
    const now = ict('2026-10-01T10:00:00.000');
    expect(resolveEventWindow('upcoming', now)).toEqual({ from: now.toISOString(), to: null });
  });

  describe('Thursday 2026-10-01 10:00 ICT', () => {
    const now = ict('2026-10-01T10:00:00.000');
    it('weekend runs Saturday 00:00 to Monday 00:00 ICT', () => {
      expect(resolveEventWindow('weekend', now)).toEqual({
        from: '2026-10-02T17:00:00.000Z',
        to: '2026-10-04T17:00:00.000Z',
      });
    });
    it('week ends at the next Monday 00:00 ICT', () => {
      expect(resolveEventWindow('week', now)).toEqual({
        from: now.toISOString(),
        to: '2026-10-04T17:00:00.000Z',
      });
    });
    it('today ends at the next local midnight', () => {
      expect(resolveEventWindow('today', now)).toEqual({
        from: now.toISOString(),
        to: '2026-10-01T17:00:00.000Z',
      });
    });
  });

  it('Saturday: weekend starts at now', () => {
    const now = ict('2026-10-03T09:00:00.000');
    expect(resolveEventWindow('weekend', now)).toEqual({
      from: now.toISOString(),
      to: '2026-10-04T17:00:00.000Z',
    });
  });

  it('Sunday: week and weekend share from=now and end at Monday 00:00 ICT', () => {
    const now = ict('2026-10-04T15:00:00.000');
    const expected = { from: now.toISOString(), to: '2026-10-04T17:00:00.000Z' };
    expect(resolveEventWindow('week', now)).toEqual(expected);
    expect(resolveEventWindow('weekend', now)).toEqual(expected);
  });

  it('Monday 00:00:00.000 ICT starts a new week and does not fall back', () => {
    const now = ict('2026-10-05T00:00:00.000');
    expect(now.toISOString()).toBe('2026-10-04T17:00:00.000Z');
    expect(resolveEventWindow('week', now).to).toBe('2026-10-11T17:00:00.000Z');
    expect(resolveEventWindow('weekend', now)).toEqual({
      from: '2026-10-09T17:00:00.000Z',
      to: '2026-10-11T17:00:00.000Z',
    });
  });

  it('Friday 23:59:59.999 ICT: today ends exactly at the next midnight', () => {
    const now = ict('2026-10-02T23:59:59.999');
    expect(resolveEventWindow('today', now).to).toBe('2026-10-02T17:00:00.000Z');
  });

  it('Saturday 00:00 ICT exactly: weekend from=now', () => {
    const now = new Date('2026-10-02T17:00:00.000Z');
    expect(resolveEventWindow('weekend', now)).toEqual({
      from: now.toISOString(),
      to: '2026-10-04T17:00:00.000Z',
    });
  });

  it('midnight 2026-10-03T17:00:00.000Z (Sunday 00:00 ICT): today rolls to the next day', () => {
    const now = new Date('2026-10-03T17:00:00.000Z');
    expect(resolveEventWindow('today', now).to).toBe('2026-10-04T17:00:00.000Z');
    expect(resolveEventWindow('weekend', now).from).toBe(now.toISOString());
  });

  it('is independent of the host time zone', () => {
    const now = ict('2026-10-01T10:00:00.000');
    const baseline = ['today', 'weekend', 'week', 'upcoming'].map((w) =>
      resolveEventWindow(w as 'today', now),
    );
    for (const tz of ['America/New_York', 'Pacific/Auckland', 'UTC']) {
      env.TZ = tz;
      const result = ['today', 'weekend', 'week', 'upcoming'].map((w) =>
        resolveEventWindow(w as 'today', now),
      );
      expect(result).toEqual(baseline);
    }
  });
});
