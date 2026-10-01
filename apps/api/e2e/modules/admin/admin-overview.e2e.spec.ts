import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminOverviewResponse, type AdminOverviewResponseT } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

const ENDPOINT = '/api/v1/admin/overview';

/** Collects every object key at any depth, tagged with the dotted path it was found under. */
function collectKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectKeys(item, `${path}[]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [
      `${path}.${key}`,
      ...collectKeys(child, `${path}.${key}`),
    ]);
  }
  return [];
}

/**
 * The shared database already holds rows from other specs and from manual
 * use, so counters cannot be asserted as absolute numbers. Instead each KPI
 * is compared with an independent oracle: the D-16 predicates written again
 * as plain SQL. Polling absorbs rows another spec file writes in between the
 * two reads. Boundary cases (window edge, soft delete, anonymized, hidden)
 * are proven twice: the oracle restricted to this spec's own seeded ids must
 * count exactly the expected rows, and the API must equal the global oracle.
 */
const ORACLE = {
  totalUsers: `SELECT count(*)::int AS n FROM users WHERE deleted_at IS NULL AND anonymized_at IS NULL`,
  newUsers: `SELECT count(*)::int AS n FROM users WHERE deleted_at IS NULL AND anonymized_at IS NULL
               AND created_at >= now() - interval '7 days'`,
  upcomingEvents: `SELECT count(*)::int AS n FROM events e
                    WHERE e.deleted_at IS NULL AND e.status = 'published'
                      AND (SELECT min(o.starts_at) FROM event_occurrences o
                            WHERE o.event_id = e.id AND o.deleted_at IS NULL) > now()`,
  rsvps: `SELECT count(*)::int AS n FROM rsvps WHERE deleted_at IS NULL AND status <> 'cancelled'
            AND created_at >= now() - interval '7 days'`,
  posts: `SELECT count(*)::int AS n FROM posts WHERE deleted_at IS NULL AND status = 'visible'
            AND created_at >= now() - interval '7 days'`,
} as const;

describe('admin overview', () => {
  let app: INestApplication;
  let pool: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let admin: Actor;
  let superAdmin: Actor;

  // Seeded rows.
  let inWindowUser: Actor;
  let edgeInUser: Actor;
  let edgeOutUser: Actor;
  let deletedUser: Actor;
  let anonymizedUser: Actor;
  let scriptUser: Actor;
  let rsvpUsers: Actor[];
  const eventIds: Record<string, string> = {};
  const postIds: string[] = [];
  let occurrenceId: string;

  const get = (actor?: Actor) => {
    const req = request(app.getHttpServer()).get(ENDPOINT);
    return actor ? req.set(actor.headers) : req;
  };

  async function overview(actor: Actor = admin): Promise<AdminOverviewResponseT> {
    const res = await get(actor).expect(200);
    return res.body.data as AdminOverviewResponseT;
  }

  async function count(sql: string): Promise<number> {
    const { rows } = await pool.query<{ n: number }>(sql);
    return rows[0]?.n as number;
  }

  async function insertEvent(
    organizerId: string,
    title: string,
    status: string,
    createdAt: string,
    deleted = false,
  ): Promise<{ id: string; occurrenceId: string }> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, location, status, created_at, deleted_at)
       VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.24 16.06)'), $5::event_status_enum, $6,
               CASE WHEN $7::boolean THEN now() ELSE NULL END)
       RETURNING id`,
      [organizerId, areaId, `ov-${randomUUID().slice(0, 12)}`, title, status, createdAt, deleted],
    );
    const id = rows[0]?.id as string;
    const occ = await pool.query<{ id: string }>(
      `INSERT INTO event_occurrences (event_id, starts_at, capacity)
       VALUES ($1, '2031-06-01T10:00:00Z', 10) RETURNING id`,
      [id],
    );
    return { id, occurrenceId: occ.rows[0]?.id as string };
  }

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });

    inWindowUser = await createActor(app);
    edgeInUser = await createActor(app);
    edgeOutUser = await createActor(app);
    deletedUser = await createActor(app);
    anonymizedUser = await createActor(app);
    scriptUser = await createActor(app);
    rsvpUsers = [await createActor(app), await createActor(app), await createActor(app)];

    // Window edge: 6d23h is inside the rolling 7 days, 7d1h is outside.
    await pool.query(
      `UPDATE users SET created_at = now() - interval '6 days 23 hours' WHERE id = $1`,
      [edgeInUser.id],
    );
    await pool.query(
      `UPDATE users SET created_at = now() - interval '7 days 1 hour' WHERE id = $1`,
      [edgeOutUser.id],
    );
    // Future-dated rows sort first in the "newest" lists, so list assertions
    // do not depend on what other spec files create at the same time.
    await pool.query(`UPDATE users SET created_at = '2031-01-02T00:00:00Z' WHERE id = $1`, [scriptUser.id]);
    await pool.query(
      `UPDATE profiles SET display_name = $2 WHERE user_id = $1`,
      [scriptUser.id, '<script>alert(1)</script>'],
    );
    await pool.query(`UPDATE users SET created_at = '2031-01-03T00:00:00Z' WHERE id = $1`, [inWindowUser.id]);
    await pool.query(
      `UPDATE users SET created_at = '2031-01-04T00:00:00Z', deleted_at = now() WHERE id = $1`,
      [deletedUser.id],
    );
    await pool.query(
      `UPDATE users SET created_at = '2031-01-05T00:00:00Z', anonymized_at = now() WHERE id = $1`,
      [anonymizedUser.id],
    );

    const published = await insertEvent(admin.id, 'ov-published', 'published', '2031-02-01T00:00:00Z');
    eventIds['published'] = published.id;
    occurrenceId = published.occurrenceId;
    eventIds['pending'] = (await insertEvent(admin.id, 'ov-pending', 'pending_review', '2031-02-02T00:00:00Z')).id;
    eventIds['draft'] = (await insertEvent(admin.id, 'ov-draft', 'draft', '2031-02-03T00:00:00Z')).id;
    eventIds['deleted'] = (await insertEvent(admin.id, 'ov-deleted', 'published', '2031-02-04T00:00:00Z', true)).id;

    // RSVPs: counted, cancelled, and outside the window.
    const rsvpSql = `INSERT INTO rsvps (occurrence_id, user_id, status, created_at)
                     VALUES ($1, $2, $3::rsvp_status_enum, $4)`;
    await pool.query(rsvpSql, [occurrenceId, rsvpUsers[0]?.id, 'confirmed', new Date().toISOString()]);
    await pool.query(rsvpSql, [occurrenceId, rsvpUsers[1]?.id, 'cancelled', new Date().toISOString()]);
    await pool.query(rsvpSql, [
      occurrenceId,
      rsvpUsers[2]?.id,
      'confirmed',
      new Date(Date.now() - 8 * 86_400_000).toISOString(),
    ]);

    // Posts: visible counted; hidden, removed and out-of-window are not.
    const postSql = `INSERT INTO posts (author_user_id, body, status, created_at)
                     VALUES ($1, 'overview seed', $2::content_status_enum, $3) RETURNING id`;
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString();
    for (const [status, at] of [
      ['visible', now],
      ['hidden', now],
      ['removed', now],
      ['visible', old],
    ] as const) {
      const { rows } = await pool.query<{ id: string }>(postSql, [member.id, status, at]);
      postIds.push(rows[0]?.id as string);
    }
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  describe('access control', () => {
    it('1. rejects a missing token with 401', async () => {
      const res = await get();
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 'UNAUTHENTICATED', messageKey: 'errors.auth.unauthenticated' });
    });

    it.each([
      ['member', () => member],
      ['curator', () => curator],
      ['moderator', () => moderator],
    ])('2. rejects %s with a flat 403 ROLE_NOT_ALLOWED', async (_name, actor) => {
      const res = await get(actor());
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        code: 'ROLE_NOT_ALLOWED',
        messageKey: 'errors.auth.roleNotAllowed',
      });
    });

    it.each([
      ['admin', () => admin],
      ['super_admin', () => superAdmin],
    ])('3. answers %s with the envelope and a schema-valid body', async (_name, actor) => {
      const res = await get(actor());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(AdminOverviewResponse.safeParse(res.body.data).success).toBe(true);
    });
  });

  describe('response shape', () => {
    it('4. exposes no personal or internal keys at any depth', async () => {
      const data = await overview();
      const keys = collectKeys(data);
      for (const forbidden of ['email', 'phone', 'role', 'passwordHash', 'ip', 'locale']) {
        expect(keys.some((k) => k.endsWith(`.${forbidden}`))).toBe(false);
      }
      // `status` is legitimate on events only, never on members.
      expect(keys.filter((k) => k.startsWith('.latestMembers[]') && k.endsWith('.status'))).toEqual([]);
      for (const forbidden of ['description', 'lat', 'lng', 'viewerRsvpStatus']) {
        expect(keys.some((k) => k.startsWith('.latestEvents[]') && k.endsWith(`.${forbidden}`))).toBe(false);
      }
      for (const m of data.latestMembers) {
        expect(Object.keys(m).sort()).toEqual(['createdAt', 'displayName', 'handle', 'id', 'trustLevel']);
      }
      for (const e of data.latestEvents) {
        expect(Object.keys(e).sort()).toEqual([
          'areaId', 'id', 'organizer', 'startsAt', 'status', 'title',
        ]);
        expect(Object.keys(e.organizer).sort()).toEqual(['displayName', 'handle']);
      }
    });

    it('8. reports windowDays 7 and a UTC generatedAt close to now', async () => {
      const data = await overview();
      expect(data.windowDays).toBe(7);
      expect(data.generatedAt).toMatch(/Z$/);
      expect(Math.abs(Date.now() - Date.parse(data.generatedAt))).toBeLessThan(60_000);
    });

    it('9. passes a <script> display name through verbatim', async () => {
      const data = await overview();
      const found = data.latestMembers.find((m) => m.id === scriptUser.id);
      expect(found?.displayName).toBe('<script>alert(1)</script>');
    });
  });

  describe('counters', () => {
    it.each(Object.keys(ORACLE) as (keyof typeof ORACLE)[])(
      '5/6. %s equals the independent SQL oracle',
      async (key) => {
        await expect
          .poll(async () => (await overview()).kpis[key] === (await count(ORACLE[key])), {
            timeout: 5000,
            interval: 200,
          })
          .toBe(true);
      },
    );

    it('5. window edge: the 6d23h user counts as new, the 7d1h user does not', async () => {
      const count = async (id: string) =>
        (await pool.query<{ n: number }>(`${ORACLE.newUsers} AND id = $1`, [id])).rows[0]?.n;
      expect(await count(edgeInUser.id)).toBe(1);
      expect(await count(edgeOutUser.id)).toBe(0);
    });

    it('5. seeded rsvps and posts count only the in-window, non-cancelled, visible rows', async () => {
      const seededRsvps = await pool.query<{ n: number }>(
        `${ORACLE.rsvps} AND occurrence_id = $1`,
        [occurrenceId],
      );
      expect(seededRsvps.rows[0]?.n).toBe(1);
      const seededPosts = await pool.query<{ n: number }>(
        `${ORACLE.posts} AND id = ANY($1::uuid[])`,
        [postIds],
      );
      expect(seededPosts.rows[0]?.n).toBe(1);
    });

    it('6. a seeded published future event counts as upcoming, draft/deleted/pending do not', async () => {
      const { rows } = await pool.query<{ n: number }>(
        `${ORACLE.upcomingEvents.replace('WHERE e.deleted_at', 'WHERE e.id = ANY($1::uuid[]) AND e.deleted_at')}`,
        [Object.values(eventIds)],
      );
      expect(rows[0]?.n).toBe(1);
    });

    it('7. every counter is a non-negative integer, never null or missing', async () => {
      const { kpis } = await overview();
      for (const key of ['totalUsers', 'newUsers', 'upcomingEvents', 'rsvps', 'posts'] as const) {
        expect(Number.isInteger(kpis[key])).toBe(true);
        expect(kpis[key]).toBeGreaterThanOrEqual(0);
      }
      // The shared database is never empty, so the zero case is proven on the
      // schema instead: a response of all zeros and empty lists is valid.
      expect(
        AdminOverviewResponse.safeParse({
          windowDays: 7,
          generatedAt: new Date().toISOString(),
          kpis: { totalUsers: 0, newUsers: 0, upcomingEvents: 0, rsvps: 0, posts: 0 },
          latestMembers: [],
          latestEvents: [],
        }).success,
      ).toBe(true);
    });
  });

  describe('latest lists', () => {
    it('6. members list omits deleted and anonymized users and keeps live ones', async () => {
      const ids = (await overview()).latestMembers.map((m) => m.id);
      expect(ids).not.toContain(deletedUser.id);
      expect(ids).not.toContain(anonymizedUser.id);
      expect(ids).toContain(inWindowUser.id);
      expect(ids).toContain(scriptUser.id);
      expect(ids.length).toBeLessThanOrEqual(5);
      // Newest first.
      expect(ids.indexOf(inWindowUser.id)).toBeLessThan(ids.indexOf(scriptUser.id));
    });

    it('6. events list omits draft and soft-deleted, keeps published and pending_review', async () => {
      const events = (await overview()).latestEvents;
      const ids = events.map((e) => e.id);
      expect(ids).not.toContain(eventIds['draft']);
      expect(ids).not.toContain(eventIds['deleted']);
      expect(ids).toContain(eventIds['published']);
      expect(ids).toContain(eventIds['pending']);
      expect(events.every((e) => e.status !== 'draft')).toBe(true);
      expect(ids.indexOf(eventIds['pending'] as string)).toBeLessThan(
        ids.indexOf(eventIds['published'] as string),
      );
    });
  });

  describe('read only', () => {
    it('10. leaves the seeded rows untouched', async () => {
      const snapshot = async () => {
        const out: string[] = [];
        for (const [table, col, ids] of [
          ['users', 'id', [member.id, inWindowUser.id, deletedUser.id]],
          ['events', 'id', Object.values(eventIds)],
          ['rsvps', 'occurrence_id', [occurrenceId]],
          ['posts', 'id', postIds],
        ] as const) {
          const { rows } = await pool.query<{ n: string; m: string | null }>(
            `SELECT count(*)::text AS n, max(updated_at)::text AS m FROM ${table} WHERE ${col} = ANY($1::uuid[])`,
            [ids],
          );
          out.push(`${table}:${rows[0]?.n}:${rows[0]?.m}`);
        }
        return out;
      };
      const before = await snapshot();
      await get(admin).expect(200);
      await get(superAdmin).expect(200);
      expect(await snapshot()).toEqual(before);
    });
  });
});
