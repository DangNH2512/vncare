import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  seatsTakenFromStats,
  type AdminEventDetailResponseT,
  type AdminEventListItemT,
} from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const LIST = '/api/v1/admin/events';
const BANNED = [
  'email', 'phone', 'passwordHash', 'password_hash', 'ip', 'userAgent', 'attendees', 'attendee',
  'participants', 'userId', 'users', 'rsvps', 'deviceId', 'tokenHash', 'metadata',
];

function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...allKeys(v)]);
  }
  return [];
}

// Old creation dates and far-away schedules keep these rows out of every
// "latest" and "upcoming" figure the overview spec asserts on.
const T = (n: number) => `2002-01-${String(n).padStart(2, '0')}T08:00:00.000Z`;

describe('admin events', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanupA: () => Promise<void>;
  let cleanupB: () => Promise<void>;
  let areaA: string;
  let areaB: string;
  const tag = randomBytes(3).toString('hex');

  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let admin: Actor;
  let superAdmin: Actor;
  let hostOne: Actor;
  let hostTwo: Actor;
  let crowd: Actor[] = [];

  const ids: Record<string, string> = {};
  const occ: Record<string, string> = {};

  const get = (path: string, actor?: Actor) => {
    const req = request(app.getHttpServer()).get(path);
    return actor ? req.set(actor.headers) : req;
  };
  const list = (qs: string) => get(`${LIST}?${qs}`, moderator);
  const scoped = (extra = '') => `q=${tag}${extra ? `&${extra}` : ''}`;
  const items = async (qs: string) => {
    const res = await list(qs);
    expect(res.status).toBe(200);
    return res.body.data.items as AdminEventListItemT[];
  };
  const titles = (rows: AdminEventListItemT[]) => rows.map((r) => r.title.replace(`${tag} `, ''));

  async function insertEvent(
    key: string,
    host: Actor,
    area: string,
    status: string,
    createdAt: string,
    opts: { deleted?: boolean; slug?: string; description?: string } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, description, location, status,
                           created_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, ST_GeogFromText('POINT(108.25 16.05)'),
               $6::event_status_enum, $7::timestamptz,
               CASE WHEN $8::boolean THEN now() ELSE NULL END)
       RETURNING id`,
      [host.id, area, opts.slug ?? `ae-${tag}-${key}`, `${tag} ${key}`,
       opts.description ?? `Description of ${key}`, status, createdAt, opts.deleted ?? false],
    );
    ids[key] = rows[0]?.id as string;
    return ids[key];
  }

  async function insertOccurrence(
    key: string,
    eventKey: string,
    startsAt: string,
    capacity = 20,
    deleted = false,
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity, deleted_at)
       VALUES ($1, $2::timestamptz, $2::timestamptz + interval '2 hours', $3,
               CASE WHEN $4::boolean THEN now() ELSE NULL END)
       RETURNING id`,
      [ids[eventKey], startsAt, capacity, deleted],
    );
    occ[key] = rows[0]?.id as string;
    return occ[key];
  }

  const rsvp = (occKey: string, actor: Actor, status: string) =>
    pool.query(
      // Older than the overview KPI window so these rows never skew the overview figures.
      `INSERT INTO rsvps (occurrence_id, user_id, status, created_at)
       VALUES ($1, $2, $3::rsvp_status_enum, now() - interval '8 days')`,
      [occ[occKey], actor.id, status],
    );

  beforeAll(async () => {
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    const a = await seedArea();
    const b = await seedArea();
    areaA = a.areaId;
    areaB = b.areaId;
    cleanupA = a.cleanup;
    cleanupB = b.cleanup;

    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });
    hostOne = await createActor(app);
    hostTwo = await createActor(app);
    for (let i = 0; i < 10; i += 5) {
      crowd.push(...(await Promise.all(Array.from({ length: 5 }, () => createActor(app)))));
    }
    await pool.query(`UPDATE profiles SET handle = $2, display_name = 'Host <b>One</b>' WHERE user_id = $1`, [
      hostOne.id,
      `h1${tag}`,
    ]);
    await pool.query(`UPDATE profiles SET handle = $2 WHERE user_id = $1`, [hostTwo.id, `h2${tag}`]);

    // One event per status, created one day apart, all with one occurrence.
    const statuses = ['pending_review', 'published', 'suspended', 'taken_down', 'cancelled', 'draft'];
    for (const [i, status] of statuses.entries()) {
      await insertEvent(status, i % 2 === 0 ? hostOne : hostTwo, i < 3 ? areaA : areaB, status, T(i + 1));
      await insertOccurrence(status, status, `2002-03-0${i + 1}T10:00:00.000Z`);
    }
    // Soft-deleted, and a published event with no live occurrence (dropped from lists).
    await insertEvent('deleted', hostOne, areaA, 'published', T(10), { deleted: true });
    await insertOccurrence('deleted', 'deleted', '2002-03-10T10:00:00.000Z');
    await insertEvent('norun', hostOne, areaA, 'published', T(11));
    await insertOccurrence('norun-gone', 'norun', '2002-03-11T10:00:00.000Z', 20, true);

    // Seat figures: confirmed 6, held 1, cancelled 2, waitlisted 3 -> seatsTaken 7, waiting 3.
    await insertEvent('seats', hostOne, areaA, 'published', T(12), { description: 'Seat <script>x</script> test' });
    await insertOccurrence('seats1', 'seats', '2002-04-01T10:00:00.000Z', 10);
    await insertOccurrence('seats2', 'seats', '2002-04-08T10:00:00.000Z', 10);
    for (const c of crowd.slice(0, 6)) await rsvp('seats1', c, 'confirmed');
    await rsvp('seats1', crowd[6] as Actor, 'held');
    for (const c of crowd.slice(0, 2)) await rsvp('seats1', c, 'cancelled');
    for (const [i, c] of crowd.slice(7, 10).entries()) {
      await rsvp('seats1', c, 'waitlisted');
      await pool.query(
        `INSERT INTO waitlist_entries (occurrence_id, user_id, position) VALUES ($1, $2, $3)`,
        [occ['seats1'], c.id, i + 1],
      );
    }
    // A promoted entry is not "waiting".
    await pool.query(
      `INSERT INTO waitlist_entries (occurrence_id, user_id, position, status)
       VALUES ($1, $2, 9, 'promoted')`,
      [occ['seats1'], crowd[0]?.id],
    );
    // Second occurrence: attended and no_show also occupy seats; occurrences must not bleed together.
    await rsvp('seats2', crowd[0] as Actor, 'attended');
    await rsvp('seats2', crowd[1] as Actor, 'no_show');

    await pool.query(
      `INSERT INTO comments (event_id, user_id, body, status) VALUES
         ($1, $2, 'one', 'visible'), ($1, $2, 'two', 'visible'), ($1, $2, 'three', 'hidden')`,
      [ids['seats'], hostTwo.id],
    );

    // Boundary events for startsTo (exclusive) and timing.
    await insertEvent('edge-in', hostTwo, areaB, 'published', T(13));
    await insertOccurrence('edge-in', 'edge-in', '2003-05-01T16:59:59.000Z');
    await insertEvent('edge-out', hostTwo, areaB, 'published', T(14));
    await insertOccurrence('edge-out', 'edge-out', '2003-05-01T17:00:00.000Z');
    await insertEvent('future', hostTwo, areaB, 'published', T(15));
    await insertOccurrence('future', 'future', '2045-01-01T10:00:00.000Z');
    // Two occurrences: the earliest live one drives the list; the deleted earlier one is ignored.
    await insertEvent('multi', hostTwo, areaB, 'published', T(16));
    await insertOccurrence('multi-del', 'multi', '2001-01-01T10:00:00.000Z', 20, true);
    await insertOccurrence('multi-b', 'multi', '2002-08-08T10:00:00.000Z');
    await insertOccurrence('multi-a', 'multi', '2002-07-07T10:00:00.000Z');
    await insertEvent('50%off', hostOne, areaA, 'published', T(17), { slug: `ae-${tag}-pct` });
    await insertOccurrence('pct', '50%off', '2002-09-09T10:00:00.000Z');
  }, 240_000);

  afterAll(async () => {
    await pool.query(`DELETE FROM waitlist_entries WHERE occurrence_id = ANY($1::uuid[])`, [Object.values(occ)]);
    await pool.end();
    await app.close();
    await cleanupA();
    await cleanupB();
  });

  describe('access', () => {
    it('answers 401 to a guest on both routes', async () => {
      await get(LIST).expect(401);
      await get(`${LIST}/${unknownId()}`).expect(401);
    });

    it.each(['member', 'curator'] as const)('answers 403 to %s', async (role) => {
      const actor = { member, curator }[role];
      await get(LIST, actor).expect(403);
      await get(`${LIST}/${unknownId()}`, actor).expect(403);
    });

    it.each(['moderator', 'admin', 'superAdmin'] as const)('answers 200 to %s', async (role) => {
      const actor = { moderator, admin, superAdmin }[role];
      await get(`${LIST}?limit=1`, actor).expect(200);
      await get(`${LIST}/${ids['published']}`, actor).expect(200);
    });
  });

  describe('list scope', () => {
    it('lists live events except drafts, deleted ones and ones with no live occurrence', async () => {
      const rows = await items(scoped('limit=100&sort=createdAt&dir=asc'));
      expect(titles(rows)).toEqual([
        'pending_review', 'published', 'suspended', 'taken_down', 'cancelled',
        'seats', 'edge-in', 'edge-out', 'future', 'multi', '50%off',
      ]);
    });

    it('rejects archived and other unknown statuses with 400', async () => {
      const res = await list(scoped('status=archived'));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 'ADMIN_QUERY_INVALID', messageKey: 'errors.admin.queryInvalid' });
    });

    it('shows a draft only when asked for by status, with schedule and capacity withheld', async () => {
      const rows = await items(scoped('status=draft'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        title: `${tag} draft`, status: 'draft', areaId: null, startsAt: null, endsAt: null,
        capacity: null, seatsTaken: null, waitlistWaiting: null,
      });
      const mixed = await items(scoped('status=draft,published&limit=100'));
      expect(mixed.some((r) => r.status === 'draft')).toBe(true);
      expect(mixed.filter((r) => r.status === 'draft').every((r) => r.startsAt === null)).toBe(true);
    });

    it('does not let area or schedule filters probe a draft', async () => {
      expect(await items(scoped(`status=draft&areaId=${areaB}`))).toHaveLength(0);
      expect(await items(scoped('status=draft&timing=past'))).toHaveLength(0);
      expect(await items(scoped('status=draft&startsFrom=2000-01-01T00:00:00.000Z'))).toHaveLength(0);
    });
  });

  describe('filters', () => {
    it('filters by status set, area and host', async () => {
      const byStatus = await items(scoped('status=suspended,taken_down&sort=createdAt&dir=asc'));
      expect(titles(byStatus)).toEqual(['suspended', 'taken_down']);
      const byArea = await items(scoped(`areaId=${areaB}&status=suspended,taken_down,cancelled`));
      expect(titles(byArea).sort()).toEqual(['cancelled', 'taken_down']);
      const byHostId = await items(scoped(`hostId=${hostTwo.id}&limit=100`));
      expect(byHostId.every((r) => r.organizer.id === hostTwo.id)).toBe(true);
      expect(byHostId.length).toBeGreaterThan(3);
      const byHandle = await items(scoped(`hostHandle=${`H1${tag}`.toUpperCase()}&limit=100`));
      expect(byHandle.length).toBeGreaterThan(0);
      expect(byHandle.every((r) => r.organizer.id === hostOne.id)).toBe(true);
    });

    it('treats startsTo as exclusive and startsFrom as inclusive', async () => {
      const win = await items(
        scoped('startsFrom=2003-05-01T00:00:00.000Z&startsTo=2003-05-01T17:00:00.000Z'),
      );
      expect(titles(win)).toEqual(['edge-in']);
      const from = await items(
        scoped('startsFrom=2003-05-01T17:00:00.000Z&startsTo=2003-05-02T00:00:00.000Z'),
      );
      expect(titles(from)).toEqual(['edge-out']);
    });

    it('uses the earliest live occurrence for the start time', async () => {
      const rows = await items(`q=${tag} multi`);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.startsAt).toBe('2002-07-07T10:00:00.000Z');
      expect(rows[0]?.capacity).toBe(20);
    });

    it('filters by creation window with an exclusive upper bound', async () => {
      const rows = await items(
        scoped(`createdFrom=${T(1)}&createdTo=${T(3)}&sort=createdAt&dir=asc`),
      );
      expect(titles(rows)).toEqual(['pending_review', 'published']);
    });

    it('splits upcoming from past by the current time', async () => {
      expect(titles(await items(scoped('timing=upcoming')))).toEqual(['future']);
      const past = await items(scoped('timing=past&limit=100'));
      expect(past.some((r) => r.title.endsWith(' future'))).toBe(false);
      expect(past.length).toBe(10);
      expect((await items(scoped('timing=all&limit=100'))).length).toBe(11);
    });

    it('A2-AC-7: an event in progress counts as past, never upcoming', async () => {
      const mark = randomBytes(3).toString('hex');
      const ev = await pool.query<{ id: string }>(
        `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
         VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.25 16.05)'), 'published') RETURNING id`,
        [hostTwo.id, areaB, `ae-${tag}-live-${mark}`, `liveevent${mark}`],
      );
      await pool.query(
        `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
         VALUES ($1, now() - interval '1 hour', now() + interval '1 hour', 10)`,
        [ev.rows[0]?.id],
      );
      expect((await items(`q=liveevent${mark}&timing=past`)).map((r) => r.id)).toEqual([ev.rows[0]?.id]);
      expect(await items(`q=liveevent${mark}&timing=upcoming`)).toHaveLength(0);
    });

    it('matches title by substring ignoring case, an id, and a slug', async () => {
      expect(titles(await items(`q=${tag.toUpperCase()}%20TAKEN_D`))).toEqual(['taken_down']);
      const byId = await items(`q=${ids['published']}`);
      expect(byId.map((r) => r.id)).toEqual([ids['published']]);
      const bySlug = await items(`q=ae-${tag}-published`);
      expect(bySlug.map((r) => r.id)).toEqual([ids['published']]);
    });

    it('takes LIKE wildcards literally', async () => {
      expect(titles(await items(`q=${encodeURIComponent(`${tag} 50%`)}`))).toEqual(['50%off']);
      expect(await items(`q=${encodeURIComponent(`${tag} _ublished`)}`)).toHaveLength(0);
      expect(await items(`q=${encodeURIComponent(`${tag} %`)}`)).toHaveLength(0);
    });
  });

  describe('seat figures', () => {
    it('reports the earliest occurrence with SEAT_OCCUPYING semantics', async () => {
      const row = (await items(`q=${tag} seats`))[0];
      expect(row?.seatsTaken).toBe(7);
      expect(row?.waitlistWaiting).toBe(3);
      expect(row?.capacity).toBe(10);
      expect(row?.startsAt).toBe('2002-04-01T10:00:00.000Z');
    });
  });

  describe('sorting and cursor', () => {
    async function walk(qs: string): Promise<AdminEventListItemT[]> {
      const out: AdminEventListItemT[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 20; i++) {
        const res = await list(`${qs}${cursor ? `&cursor=${cursor}` : ''}`);
        expect(res.status).toBe(200);
        out.push(...(res.body.data.items as AdminEventListItemT[]));
        cursor = res.body.data.nextCursor;
        if (!cursor) return out;
      }
      throw new Error('cursor never ended');
    }

    it.each(['startsAt', 'createdAt', 'title'])('walks %s both ways with no gap or repeat', async (sort) => {
      const one = await items(scoped(`status=draft,published,pending_review,suspended,taken_down,cancelled&limit=100&sort=${sort}&dir=asc`));
      for (const dir of ['asc', 'desc'] as const) {
        const qs = `status=draft,published,pending_review,suspended,taken_down,cancelled&sort=${sort}&dir=${dir}`;
        const paged = await walk(scoped(`${qs}&limit=4`));
        const whole = await items(scoped(`${qs}&limit=100`));
        expect(paged.map((r) => r.id)).toEqual(whole.map((r) => r.id));
        expect(new Set(paged.map((r) => r.id)).size).toBe(paged.length);
      }
      expect(one.length).toBe(12);
    });

    it('puts drafts (no start time) last for startsAt in both directions', async () => {
      for (const dir of ['asc', 'desc']) {
        const rows = await items(scoped(`status=draft,published&sort=startsAt&dir=${dir}&limit=100`));
        expect(rows.at(-1)?.status).toBe('draft');
      }
    });

    it('returns nextCursor null when the page is exactly full', async () => {
      const total = (await items(scoped('limit=100'))).length;
      const res = await list(scoped(`limit=${total}`));
      expect(res.body.data.nextCursor).toBeNull();
      const short = await list(scoped(`limit=${total - 1}`));
      expect(short.body.data.nextCursor).not.toBeNull();
    });

    it('rejects a tampered cursor and one made for another sort or direction', async () => {
      const first = await list(scoped('limit=2&sort=createdAt&dir=desc'));
      const cursor = first.body.data.nextCursor as string;
      const expectBad = (res: { status: number; body: unknown }) => {
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ code: 'ADMIN_CURSOR_INVALID', messageKey: 'errors.admin.cursorInvalid' });
      };
      expectBad(await list(scoped(`limit=2&sort=title&dir=desc&cursor=${cursor}`)));
      expectBad(await list(scoped(`limit=2&sort=createdAt&dir=asc&cursor=${cursor}`)));
      expectBad(await list(scoped(`limit=2&cursor=${cursor.slice(0, -3)}A`)));
      expectBad(await list(scoped('cursor=%%%')));
    });

    it('pages sort=title through titles holding a tab or a newline', async () => {
      const mark = `ctl${randomBytes(3).toString('hex')}`;
      const titles = [`${mark} a\tb`, `${mark} c\nd`, `${mark} e\u0085f`, `${mark} g`];
      for (const [i, title] of titles.entries()) {
        const ev = await pool.query<{ id: string }>(
          `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
           VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.25 16.05)'), 'published') RETURNING id`,
          [hostTwo.id, areaB, `ae-${tag}-${mark}-${i}`, title],
        );
        await pool.query(
          `INSERT INTO event_occurrences (event_id, starts_at, capacity) VALUES ($1, '2002-03-03T10:00:00Z', 5)`,
          [ev.rows[0]?.id],
        );
      }
      for (const dir of ['asc', 'desc']) {
        const seen: string[] = [];
        let cursor: string | null = null;
        for (let i = 0; i < 10; i++) {
          const res = await list(`q=${mark}&sort=title&dir=${dir}&limit=1${cursor ? `&cursor=${cursor}` : ''}`);
          expect(res.status).toBe(200);
          seen.push(...(res.body.data.items as { title: string }[]).map((r) => r.title));
          cursor = res.body.data.nextCursor as string | null;
          if (!cursor) break;
        }
        expect([...seen].sort()).toEqual([...titles].sort());
      }
    });

    it('answers 400 ADMIN_CURSOR_INVALID to a well-shaped cursor with an impossible value', async () => {
      const id = unknownId();
      const cases: [string, string | null][] = [
        ['startsAt', '2025-99-99T99:99:99.000000Z'],
        ['startsAt', '2025-02-30T10:00:00.000000Z'],
        ['createdAt', '2025-99-99T99:99:99.000000Z'],
        ['createdAt', '2002-13-45T99:99:99.000000Z'],
        ['createdAt', null],
        ['title', 'ab\u0000cd'],
        ['title', 'x'.repeat(301)],
        ['title', ''],
      ];
      for (const [sort, v] of cases) {
        const cursor = Buffer.from(JSON.stringify({ s: sort, d: 'desc', v, id }), 'utf8').toString('base64url');
        const res = await list(scoped(`sort=${sort}&dir=desc&cursor=${cursor}`));
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ code: 'ADMIN_CURSOR_INVALID', messageKey: 'errors.admin.cursorInvalid' });
      }
    });
  });

  describe('bad input', () => {
    it.each([
      'unknown=1', 'q=%00ab', 'hostHandle=%00', 'hostHandle=a%20b', 'startsFrom=0000-01-01T00:00:00.000Z', 'limit=500', 'limit=0', 'q=a', 'sort=capacity', 'dir=sideways', 'timing=soon',
      'areaId=not-a-uuid', 'hostId=nope', 'startsFrom=yesterday',
      'startsFrom=2003-01-02T00:00:00.000Z&startsTo=2003-01-01T00:00:00.000Z',
      'startsFrom=2003-01-01T00:00:00.000Z&startsTo=2003-01-01T00:00:00.000Z',
    ])('answers 400 ADMIN_QUERY_INVALID to %s', async (qs) => {
      const res = await list(qs);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 'ADMIN_QUERY_INVALID', messageKey: 'errors.admin.queryInvalid' });
    });

    it('answers 400 to an id that is not a UUID and 404 to an unknown one', async () => {
      expect((await get(`${LIST}/not-a-uuid`, moderator)).status).toBe(400);
      const res = await get(`${LIST}/${unknownId()}`, moderator);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ code: 'EVENT_NOT_FOUND', messageKey: 'errors.admin.eventNotFound' });
    });
  });

  describe('detail', () => {
    it('lists every live occurrence in time order with per-occurrence figures', async () => {
      const res = await get(`${LIST}/${ids['seats']}`, admin);
      expect(res.status).toBe(200);
      const d = res.body.data as AdminEventDetailResponseT;
      expect(d.occurrences.map((o) => o.id)).toEqual([occ['seats1'], occ['seats2']]);
      expect(d.occurrences[0]?.stats).toEqual({
        confirmed: 6, held: 1, waitlisted: 3, cancelled: 2, attended: 0, noShow: 0,
        waitlistWaiting: 3, seatsTaken: 7,
      });
      expect(d.occurrences[1]?.stats).toMatchObject({
        confirmed: 0, attended: 1, noShow: 1, waitlistWaiting: 0, seatsTaken: 2,
      });
      for (const o of d.occurrences) expect(o.stats.seatsTaken).toBe(seatsTakenFromStats(o.stats));
      expect(d.commentCount).toBe(2);
      expect(d.description).toBe('Seat <script>x</script> test');
      expect(d.lat).toBeCloseTo(16.05, 4);
      expect(d.lng).toBeCloseTo(108.25, 4);
      expect(d.areaId).toBe(areaA);
      expect(d.slug).toBe(`ae-${tag}-seats`);
      expect(d.host).toEqual({
        id: hostOne.id, handle: `h1${tag}`, displayName: 'Host <b>One</b>',
        trustLevel: 1, role: 'member', status: 'active',
      });
    });

    it('omits soft-deleted occurrences', async () => {
      const d = (await get(`${LIST}/${ids['multi']}`, moderator)).body.data as AdminEventDetailResponseT;
      expect(d.occurrences.map((o) => o.id)).toEqual([occ['multi-a'], occ['multi-b']]);
    });

    it('carries no attendee names, contact data or other internals at any depth', async () => {
      const res = await get(`${LIST}/${ids['seats']}`, moderator);
      const keys = allKeys(res.body);
      for (const banned of BANNED) expect(keys).not.toContain(banned);
      const raw = JSON.stringify(res.body);
      for (const a of [hostOne, hostTwo, ...crowd]) expect(raw).not.toContain(a.email);
      const lines = allKeys((await list(scoped('limit=100'))).body);
      for (const banned of BANNED) expect(lines).not.toContain(banned);
    });

    it('redacts a draft and still answers 200', async () => {
      const d = (await get(`${LIST}/${ids['draft']}`, moderator)).body.data as AdminEventDetailResponseT;
      expect(d).toMatchObject({
        status: 'draft', description: null, areaId: null, lat: null, lng: null,
        occurrences: [], commentCount: 0,
      });
      expect(d.title).toBe(`${tag} draft`);
    });

    it('does not reveal when a draft was last edited', async () => {
      await pool.query(`UPDATE events SET updated_at = now() WHERE id = $1`, [ids['draft']]);
      const d = (await get(`${LIST}/${ids['draft']}`, moderator)).body.data as AdminEventDetailResponseT;
      expect(d.updatedAt).toBe(d.createdAt);
      const live = (await get(`${LIST}/${ids['published']}`, moderator)).body.data as AdminEventDetailResponseT;
      expect(Date.parse(live.updatedAt)).toBeGreaterThanOrEqual(Date.parse(live.createdAt));
    });

    it('shows cancelled, suspended and taken-down events but not soft-deleted ones', async () => {
      for (const key of ['cancelled', 'suspended', 'taken_down', 'pending_review']) {
        const res = await get(`${LIST}/${ids[key]}`, moderator);
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe(key);
      }
      expect((await get(`${LIST}/${ids['deleted']}`, moderator)).status).toBe(404);
    });
  });
});
