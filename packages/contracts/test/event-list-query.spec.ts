import { describe, expect, it } from 'vitest';
import {
  ADMIN_OVERVIEW_WINDOW_DAYS,
  AdminOverviewResponse,
  EVENT_LIST_MAX_WINDOW_DAYS,
  ListEventQuery,
} from '../src/index.js';

const FROM = '2026-10-01T00:00:00.000Z';
const DAY = 86_400_000;
const plus = (days: number, extraMs = 0): string =>
  new Date(Date.parse(FROM) + days * DAY + extraMs).toISOString();

describe('ListEventQuery from/to', () => {
  it('accepts a valid window', () => {
    expect(ListEventQuery.safeParse({ from: FROM, to: plus(3) }).success).toBe(true);
  });

  it('accepts only from, or only to', () => {
    expect(ListEventQuery.safeParse({ from: FROM }).success).toBe(true);
    expect(ListEventQuery.safeParse({ to: plus(1) }).success).toBe(true);
  });

  it('accepts a query without either bound', () => {
    expect(ListEventQuery.safeParse({}).success).toBe(true);
  });

  it('accepts a window of exactly 92 days', () => {
    expect(EVENT_LIST_MAX_WINDOW_DAYS).toBe(92);
    expect(ListEventQuery.safeParse({ from: FROM, to: plus(92) }).success).toBe(true);
  });

  it('rejects a window longer than 92 days', () => {
    const r = ListEventQuery.safeParse({ from: FROM, to: plus(92, 1) });
    expect(r.success).toBe(false);
    expect(ListEventQuery.safeParse({ from: FROM, to: plus(93) }).success).toBe(false);
  });

  it('rejects to equal to from, with the i18n key on path "to"', () => {
    const r = ListEventQuery.safeParse({ from: FROM, to: FROM });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('errors.event.dateRangeInvalid');
      expect(r.error.issues[0]?.path).toEqual(['to']);
    }
  });

  it('rejects to before from', () => {
    const r = ListEventQuery.safeParse({ from: FROM, to: plus(-1) });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('errors.event.dateRangeInvalid');
      expect(r.error.issues[0]?.path).toEqual(['to']);
    }
  });

  it('rejects a non-ISO from', () => {
    expect(ListEventQuery.safeParse({ from: 'tomorrow' }).success).toBe(false);
    expect(ListEventQuery.safeParse({ from: '1' }).success).toBe(false);
  });

  it('rejects an offset suffix; only Z is accepted', () => {
    expect(ListEventQuery.safeParse({ from: '2026-10-01T07:00:00.000+07:00' }).success).toBe(false);
  });

  it('keeps the radius refinement working alongside the window', () => {
    const r = ListEventQuery.safeParse({ radiusMeters: 500 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('errors.event.radiusRequiresCoordinates');
    }
  });
});

describe('AdminOverviewResponse', () => {
  const member = {
    id: '3f1f2b0e-7a1e-4c6a-9b57-0d2f6f6a1a11',
    handle: 'linh',
    displayName: 'Linh',
    trustLevel: 2,
    createdAt: FROM,
  };
  const event = {
    id: '4f1f2b0e-7a1e-4c6a-9b57-0d2f6f6a1a22',
    title: 'Beach run',
    areaId: '5f1f2b0e-7a1e-4c6a-9b57-0d2f6f6a1a33',
    startsAt: plus(2),
    status: 'published',
    organizer: { handle: 'linh', displayName: 'Linh' },
  };
  const sample = {
    windowDays: ADMIN_OVERVIEW_WINDOW_DAYS,
    generatedAt: FROM,
    kpis: { totalUsers: 10, newUsers: 2, upcomingEvents: 3, rsvps: 4, posts: 5 },
    latestMembers: [member],
    latestEvents: [event],
  };

  it('parses a full sample', () => {
    expect(AdminOverviewResponse.safeParse(sample).success).toBe(true);
  });

  it('rejects a negative counter', () => {
    const bad = { ...sample, kpis: { ...sample.kpis, totalUsers: -1 } };
    expect(AdminOverviewResponse.safeParse(bad).success).toBe(false);
  });

  it('rejects more than 5 latest members', () => {
    const bad = { ...sample, latestMembers: Array.from({ length: 6 }, () => member) };
    expect(AdminOverviewResponse.safeParse(bad).success).toBe(false);
  });

  it('rejects a windowDays other than 7', () => {
    expect(AdminOverviewResponse.safeParse({ ...sample, windowDays: 30 }).success).toBe(false);
  });

  it('strips fields outside the allow-list, such as email', () => {
    const r = AdminOverviewResponse.safeParse({
      ...sample,
      latestMembers: [{ ...member, email: 'a@example.test' }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.latestMembers[0]).not.toHaveProperty('email');
    }
  });
});
