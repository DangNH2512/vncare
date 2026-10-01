import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOpenApiDocument } from '../../../src/common/openapi.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

/**
 * Time-window filter of GET /api/v1/events: `from` inclusive, `to` exclusive,
 * both on the event's starting time. Rows are inserted directly so each case
 * controls status and start time exactly; every query is scoped by `areaId` so
 * rows from other specs sharing the dev database cannot leak into assertions.
 */
describe('event list time window', () => {
  const HOUR = 3_600_000;
  // Far enough ahead that no other spec's data can sit inside the windows.
  const BASE = Date.parse('2031-03-01T00:00:00.000Z');
  const iso = (ms: number): string => new Date(ms).toISOString();

  let app: INestApplication;
  let pool: Pool;
  let areaId: string;
  let otherAreaId: string;
  let cleanupArea: () => Promise<void>;
  let cleanupOther: () => Promise<void>;
  let organizer: Actor;
  let stranger: Actor;

  const ids: Record<string, string> = {};

  async function insertEvent(
    key: string,
    opts: {
      startsAt: number;
      status?: string;
      area?: string;
      lat?: number;
      lng?: number;
    },
  ): Promise<void> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7::event_status_enum)
       RETURNING id`,
      [
        organizer.id,
        opts.area ?? areaId,
        `win-${randomUUID().slice(0, 12)}`,
        `Window ${key}`,
        opts.lng ?? 108.247,
        opts.lat ?? 16.06,
        opts.status ?? 'published',
      ],
    );
    const id = rows[0]?.id as string;
    await pool.query(
      `INSERT INTO event_occurrences (event_id, starts_at, capacity) VALUES ($1, $2, 10)`,
      [id, iso(opts.startsAt)],
    );
    ids[key] = id;
  }

  async function list(
    query: Record<string, string | number>,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; ids: string[]; nextCursor: string | null; body: any }> {
    const res = await request(app.getHttpServer())
      .get('/api/v1/events')
      .set(headers)
      .query({ areaId, limit: 50, ...query });
    return {
      status: res.status,
      ids: (res.body?.data?.items ?? []).map((e: { id: string }) => e.id),
      nextCursor: res.body?.data?.nextCursor ?? null,
      body: res.body,
    };
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    ({ areaId, cleanup: cleanupArea } = await seedArea());
    ({ areaId: otherAreaId, cleanup: cleanupOther } = await seedArea());
    app = await createTestApp();
    organizer = await createActor(app);
    stranger = await createActor(app);

    await insertEvent('past', { startsAt: Date.parse('2020-01-01T00:00:00Z') });
    await insertEvent('a', { startsAt: BASE });
    await insertEvent('b', { startsAt: BASE + HOUR });
    await insertEvent('c', { startsAt: BASE + 2 * HOUR });
    // Same window as `b` but in another area, and one 25 km away in this area.
    await insertEvent('otherArea', { startsAt: BASE + HOUR, area: otherAreaId });
    await insertEvent('far', { startsAt: BASE + HOUR, lat: 15.88, lng: 108.33 });
  });

  afterAll(async () => {
    await app.close();
    // Events must go before the areas they reference; the first cleanup removes
    // every event owned by this file's actors.
    await cleanupArea();
    await cleanupOther();
    await pool.end();
  });

  it('includes an event starting exactly at `from` (inclusive)', async () => {
    const r = await list({ from: iso(BASE + HOUR) });
    expect(r.status).toBe(200);
    expect(r.ids).toContain(ids['b']);
    expect(r.ids).not.toContain(ids['a']);
  });

  it('excludes an event starting exactly at `to` (exclusive)', async () => {
    const r = await list({ from: iso(BASE), to: iso(BASE + 2 * HOUR) });
    expect(r.ids).toContain(ids['a']);
    expect(r.ids).toContain(ids['b']);
    expect(r.ids).not.toContain(ids['c']);
  });

  it('accepts `from` alone and `to` alone as independent bounds', async () => {
    const onlyFrom = await list({ from: iso(BASE + HOUR) });
    expect(onlyFrom.ids).toEqual(expect.arrayContaining([ids['b'], ids['c']]));
    expect(onlyFrom.ids).not.toContain(ids['past']);

    const onlyTo = await list({ to: iso(BASE + HOUR) });
    expect(onlyTo.ids).toEqual(expect.arrayContaining([ids['past'], ids['a']]));
    expect(onlyTo.ids).not.toContain(ids['b']);
  });

  it('ANDs the window with areaId', async () => {
    const window = { from: iso(BASE), to: iso(BASE + 3 * HOUR) };
    const here = await list(window);
    expect(here.ids).not.toContain(ids['otherArea']);

    const there = await list({ ...window, areaId: otherAreaId });
    expect(there.ids).toEqual([ids['otherArea']]);
  });

  it('ANDs the window with a radius search', async () => {
    const r = await list({
      from: iso(BASE),
      to: iso(BASE + 3 * HOUR),
      lat: 16.06,
      lng: 108.247,
      radiusMeters: 1500,
    });
    expect(r.ids).toEqual(expect.arrayContaining([ids['a'], ids['b'], ids['c']]));
    expect(r.ids).not.toContain(ids['far']);

    const narrow = await list({
      from: iso(BASE + 2 * HOUR),
      to: iso(BASE + 3 * HOUR),
      lat: 16.06,
      lng: 108.247,
      radiusMeters: 1500,
    });
    expect(narrow.ids).toEqual([ids['c']]);
  });

  it('paginates a window across two pages without repeating an event', async () => {
    const window = { from: iso(BASE), to: iso(BASE + 3 * HOUR), lat: 16.06, lng: 108.247, radiusMeters: 1500 };
    const first = await list({ ...window, limit: 2 });
    expect(first.ids).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await list({ ...window, limit: 2, cursor: first.nextCursor as string });
    expect(second.ids).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    const all = [...first.ids, ...second.ids];
    expect(new Set(all).size).toBe(3);
    expect(all).toEqual([ids['a'], ids['b'], ids['c']]);
  });

  it('keeps the old behaviour when neither bound is sent (past events included)', async () => {
    const r = await list({});
    expect(r.status).toBe(200);
    expect(r.ids).toEqual(expect.arrayContaining([ids['past'], ids['a'], ids['b'], ids['c']]));
  });

  it('status=published excludes drafts, cancelled and already-started events', async () => {
    const now = Date.now();
    await insertEvent('started', { startsAt: now - HOUR });
    await insertEvent('upcoming', { startsAt: now + HOUR });
    await insertEvent('draft', { startsAt: now + HOUR, status: 'draft' });
    await insertEvent('cancelled', { startsAt: now + HOUR, status: 'cancelled' });

    const r = await list({ status: 'published', from: iso(now) }, organizer.headers);
    expect(r.status).toBe(200);
    expect(r.ids).toContain(ids['upcoming']);
    expect(r.ids).not.toContain(ids['started']);
    expect(r.ids).not.toContain(ids['draft']);
    expect(r.ids).not.toContain(ids['cancelled']);
  });

  it('answers a guest with 200 and hides another organizer\'s draft', async () => {
    await insertEvent('guestDraft', { startsAt: BASE + HOUR, status: 'draft' });
    const guest = await list({ from: iso(BASE), to: iso(BASE + 3 * HOUR) });
    expect(guest.status).toBe(200);
    expect(guest.ids).not.toContain(ids['guestDraft']);

    const other = await list({ from: iso(BASE), to: iso(BASE + 3 * HOUR) }, stranger.headers);
    expect(other.ids).not.toContain(ids['guestDraft']);

    const owner = await list({ from: iso(BASE), to: iso(BASE + 3 * HOUR) }, organizer.headers);
    expect(owner.ids).toContain(ids['guestDraft']);
  });

  describe('rejects an invalid window with 400', () => {
    const KEY = 'to: errors.event.dateRangeInvalid';

    it.each([
      ['to before from', iso(BASE), iso(BASE - HOUR)],
      ['to equal to from', iso(BASE), iso(BASE)],
      ['window of 93 days', iso(BASE), iso(BASE + 93 * 24 * HOUR)],
    ])('%s', async (_name, from, to) => {
      const r = await list({ from, to });
      expect(r.status).toBe(400);
      expect(Array.isArray(r.body.message)).toBe(true);
      expect(r.body.message).toContain(KEY);
    });

    it('accepts a window of exactly 92 days', async () => {
      const r = await list({ from: iso(BASE), to: iso(BASE + 92 * 24 * HOUR) });
      expect(r.status).toBe(200);
    });

    it.each([
      ['an offset instead of Z', '2031-03-01T07:00:00+07:00'],
      ['a non-date string', 'abc'],
    ])('rejects `from` with %s', async (_name, from) => {
      const r = await list({ from });
      expect(r.status).toBe(400);
      expect(Array.isArray(r.body.message)).toBe(true);
    });
  });

  it('documents `from` and `to` as query parameters in OpenAPI', () => {
    const doc = createOpenApiDocument(app);
    const get = doc.paths['/api/v1/events']?.get as Record<string, any> | undefined;
    expect(get).toBeDefined();
    const names = (get?.['parameters'] ?? []).map((p: { name: string }) => p.name);
    expect(names).toEqual(expect.arrayContaining(['from', 'to']));
  });
});
