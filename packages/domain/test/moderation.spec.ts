import { describe, expect, it } from 'vitest';
import { ModerationSeverity, ReportReason, ReportReasonGroup } from '@dnc/contracts';
import {
  REASONS_BY_GROUP,
  SLA_DUE_SOON_MS,
  SLA_TTFR_MS,
  earlierSlaDue,
  maxSeverity,
  reasonsForGroup,
  severityForReasonGroup,
  slaDueAt,
  slaState,
} from '../src/moderation.js';

const from = new Date('2026-10-01T03:00:00.000Z');
const HOUR = 3_600_000;

describe('severityForReasonGroup (D-M4, approved by owner, Q-4, 2026-10-01)', () => {
  const expected: Record<(typeof ReportReasonGroup.options)[number], string> = {
    danger: 'critical',
    illegal: 'critical',
    privacy: 'critical',
    harassment: 'high',
    sexual: 'high',
    hate: 'high',
    scam: 'high',
    ghost_event: 'high',
    impersonation: 'high',
    unsafe_setup: 'high',
    spam: 'normal',
    other: 'low',
  };

  it('covers all 12 groups', () => {
    expect(ReportReasonGroup.options).toHaveLength(12);
    expect(Object.keys(expected).toSorted()).toEqual(ReportReasonGroup.options.toSorted());
  });

  it.each(ReportReasonGroup.options)('%s maps to its severity', (group) => {
    expect(severityForReasonGroup(group)).toBe(expected[group]);
  });
});

describe('reason to group mapping', () => {
  it('places each of the 30 reasons in exactly one group', () => {
    expect(ReportReason.options).toHaveLength(30);
    const seen = new Map<string, string[]>();
    for (const group of ReportReasonGroup.options)
      for (const reason of reasonsForGroup(group))
        seen.set(reason, [...(seen.get(reason) ?? []), group]);
    for (const reason of ReportReason.options) expect(seen.get(reason), reason).toHaveLength(1);
    expect(seen.size).toBe(30);
  });

  it('has no group without a reason and no unknown reason', () => {
    for (const group of ReportReasonGroup.options) {
      expect(REASONS_BY_GROUP[group].length).toBeGreaterThan(0);
      for (const reason of REASONS_BY_GROUP[group]) expect(ReportReason.options).toContain(reason);
    }
  });
});

describe('maxSeverity', () => {
  it('follows enum order critical > high > normal > low', () => {
    const order = ModerationSeverity.options;
    expect(order).toEqual(['critical', 'high', 'normal', 'low']);
    for (let i = 0; i < order.length; i++)
      for (let j = 0; j < order.length; j++)
        expect(maxSeverity(order[i]!, order[j]!)).toBe(order[Math.min(i, j)]);
  });

  it('takes any number of arguments, regardless of position', () => {
    expect(maxSeverity('low')).toBe('low');
    expect(maxSeverity('low', 'normal', 'critical', 'high')).toBe('critical');
    expect(maxSeverity('normal', 'low', 'high')).toBe('high');
  });
});

describe('slaDueAt (D-M5, wall clock 24/7)', () => {
  it('adds 2h / 12h / 48h / 7d', () => {
    expect(slaDueAt('critical', from).toISOString()).toBe('2026-10-01T05:00:00.000Z');
    expect(slaDueAt('high', from).toISOString()).toBe('2026-10-01T15:00:00.000Z');
    expect(slaDueAt('normal', from).toISOString()).toBe('2026-10-03T03:00:00.000Z');
    expect(slaDueAt('low', from).toISOString()).toBe('2026-10-08T03:00:00.000Z');
  });

  it('is plain elapsed time: crossing night and a weekend adds nothing', () => {
    const friNight = new Date('2026-10-02T16:30:00.000Z'); // Friday 23:30 in Da Nang
    expect(slaDueAt('high', friNight).getTime() - friNight.getTime()).toBe(12 * HOUR);
    expect(slaDueAt('low', friNight).getTime() - friNight.getTime()).toBe(SLA_TTFR_MS.low);
  });

  it('does not mutate the input and rejects an invalid date', () => {
    const copy = from.getTime();
    slaDueAt('low', from);
    expect(from.getTime()).toBe(copy);
    expect(() => slaDueAt('low', new Date('nope'))).toThrow(RangeError);
  });
});

describe('unknown severity', () => {
  it('throws RangeError instead of returning NaN or a wrong level', () => {
    // @ts-expect-error deliberately outside the enum
    expect(() => slaDueAt('urgent', from)).toThrow(RangeError);
    // @ts-expect-error deliberately outside the enum
    expect(() => maxSeverity('high', 'urgent')).toThrow(RangeError);
    // @ts-expect-error deliberately outside the enum
    expect(() => maxSeverity('urgent')).toThrow(RangeError);
  });
});

describe('earlierSlaDue', () => {
  it('keeps the earlier deadline and returns a fresh Date', () => {
    const a = slaDueAt('normal', from);
    const b = slaDueAt('critical', from);
    expect(earlierSlaDue(a, b).getTime()).toBe(b.getTime());
    expect(earlierSlaDue(b, a).getTime()).toBe(b.getTime());
    expect(earlierSlaDue(a, b)).not.toBe(b);
  });
});

describe('slaState boundaries', () => {
  const due = new Date('2026-10-01T05:00:00.000Z');
  const at = (offsetMs: number) => new Date(due.getTime() + offsetMs);

  it('ok when more than the due-soon window is left', () => {
    expect(slaState(due, at(-SLA_DUE_SOON_MS - 1000))).toBe('ok');
  });

  it('flips to due_soon within one second of the window edge', () => {
    expect(slaState(due, at(-SLA_DUE_SOON_MS - 1000))).toBe('ok');
    expect(slaState(due, at(-SLA_DUE_SOON_MS))).toBe('due_soon');
    expect(slaState(due, at(-SLA_DUE_SOON_MS + 1000))).toBe('due_soon');
  });

  it('is overdue only strictly after the deadline', () => {
    expect(slaState(due, at(-1000))).toBe('due_soon');
    expect(slaState(due, at(0))).toBe('due_soon');
    expect(slaState(due, at(1000))).toBe('overdue');
    expect(slaState(due, at(HOUR))).toBe('overdue');
  });

  it('accepts a custom due-soon window', () => {
    expect(slaState(due, at(-10 * 60_000), 5 * 60_000)).toBe('ok');
    expect(slaState(due, at(-4 * 60_000), 5 * 60_000)).toBe('due_soon');
  });

  it('rejects an invalid date', () => {
    expect(() => slaState(new Date('x'), due)).toThrow(RangeError);
    expect(() => slaState(due, new Date('x'))).toThrow(RangeError);
  });

  it('agrees with slaDueAt at the 2h critical edge', () => {
    const dueAt = slaDueAt('critical', from);
    expect(slaState(dueAt, new Date(from.getTime() + 2 * HOUR - 1000))).toBe('due_soon');
    expect(slaState(dueAt, new Date(from.getTime() + 2 * HOUR))).toBe('due_soon');
    expect(slaState(dueAt, new Date(from.getTime() + 2 * HOUR + 1000))).toBe('overdue');
  });
});
