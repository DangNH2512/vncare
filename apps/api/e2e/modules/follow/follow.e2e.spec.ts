import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cursorPage,
  envelope,
  FollowingItem,
  FollowResponse,
  SuggestionsResponse,
} from '@dnc/contracts';
import { FollowRepository } from '../../../src/modules/follow/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const ids = (res: request.Response): string[] =>
  envelope(SuggestionsResponse)
    .parse(res.body)
    .data.items.map((i) => i.userId);

describe('follow module', { timeout: 60_000 }, () => {
  let app: INestApplication;
  let pool: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  const http = () => request(app.getHttpServer());
  const follow = (target: string, actor: Actor) =>
    http().post(`/api/v1/users/${target}/follow`).set(actor.headers);
  const unfollow = (target: string, actor: Actor) =>
    http().delete(`/api/v1/users/${target}/follow`).set(actor.headers);
  const edges = async (followerId: string, targetId: string): Promise<number> => {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM follows WHERE follower_user_id = $1 AND target_id = $2`,
      [followerId, targetId],
    );
    return rows[0]?.n ?? 0;
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await cleanup();
  });

  describe('follow and unfollow', () => {
    let a: Actor;
    let x: Actor;

    beforeAll(async () => {
      a = await createActor(app);
      x = await createActor(app);
    });

    it('creates the edge, and a second POST is a 200 with the same edge and one row', async () => {
      const first = await follow(x.id, a).expect(200);
      const parsed = envelope(FollowResponse).parse(first.body);
      expect(parsed.data).toMatchObject({ userId: x.id, following: true, notify: true });

      const second = await follow(x.id, a).expect(200);
      expect(second.body.data.createdAt).toBe(first.body.data.createdAt);
      expect(await edges(a.id, x.id)).toBe(1);
    });

    it('unfollow is 204 every time, including when nothing was followed', async () => {
      await unfollow(x.id, a).expect(204);
      expect(await edges(a.id, x.id)).toBe(0);
      await unfollow(x.id, a).expect(204);
      await unfollow(unknownId(), a).expect(204);
    });

    it('refuses to follow yourself with 403, and the CHECK backs it up', async () => {
      const res = await follow(a.id, a).expect(403);
      expect(res.body.code).toBe('CANNOT_FOLLOW_SELF');
      expect(res.body.messageKey).toBe('errors.follow.cannotFollowSelf');
      expect(await edges(a.id, a.id)).toBe(0);

      await expect(
        pool.query(
          `INSERT INTO follows (follower_user_id, target_type, target_id) VALUES ($1, 'user', $1)`,
          [a.id],
        ),
      ).rejects.toMatchObject({ constraint: 'ck_follows_no_self' });
    });

    it('answers the same 404 for a missing, private, anonymised, deleted or inactive target', async () => {
      const mk = () => createActor(app);
      const priv = await mk();
      await pool.query(`UPDATE profiles SET visibility = 'private' WHERE user_id = $1`, [priv.id]);
      const anon = await mk();
      await pool.query(`UPDATE users SET anonymized_at = now() WHERE id = $1`, [anon.id]);
      const gone = await mk();
      await pool.query(`UPDATE users SET deleted_at = now(), status = 'deleted' WHERE id = $1`, [
        gone.id,
      ]);
      const suspended = await mk();
      await pool.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [suspended.id]);

      const bodies = [];
      for (const id of [unknownId(), priv.id, anon.id, gone.id, suspended.id]) {
        const res = await follow(id, a).expect(404);
        expect(res.body.code).toBe('USER_NOT_FOUND');
        expect(res.body.messageKey).toBe('errors.profile.notFound');
        bodies.push({ code: res.body.code, messageKey: res.body.messageKey });
        expect(await edges(a.id, id)).toBe(0);
      }
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);

      await follow('not-a-uuid', a).expect(400);
    });

    it('lets a members_only profile be followed', async () => {
      const m = await createActor(app);
      await pool.query(`UPDATE profiles SET visibility = 'members_only' WHERE user_id = $1`, [m.id]);
      await follow(m.id, a).expect(200);
      await unfollow(m.id, a).expect(204);
    });
  });

  describe('permissions', () => {
    it('401 for guests, 403 for T0 on POST, but T0 may still unfollow', async () => {
      const target = await createActor(app);
      await http().post(`/api/v1/users/${target.id}/follow`).expect(401);
      await http().delete(`/api/v1/users/${target.id}/follow`).expect(401);
      await http().get('/api/v1/me/following').expect(401);

      const t0 = await createActor(app, { trustLevel: 0 });
      const res = await follow(target.id, t0).expect(403);
      expect(res.body.code).toBe('TRUST_LEVEL_TOO_LOW');
      expect(await edges(t0.id, target.id)).toBe(0);
      await unfollow(target.id, t0).expect(204);
      await http().get('/api/v1/me/following').set(t0.headers).expect(200);

      await follow(target.id, await createActor(app)).expect(200);
    });
  });

  describe('GET /me/following', () => {
    it('lists newest first with a cursor, and exposes only UserSummary fields', async () => {
      const a = await createActor(app);
      const targets: Actor[] = [];
      for (let i = 0; i < 5; i += 1) targets.push(await createActor(app));
      for (const t of targets) await follow(t.id, a).expect(200);

      const page1 = await http().get('/api/v1/me/following?limit=3').set(a.headers).expect(200);
      const p1 = envelope(cursorPage(FollowingItem)).parse(page1.body).data;
      expect(p1.items.map((i) => i.user.userId)).toEqual(
        targets.toReversed().slice(0, 3).map((t) => t.id),
      );
      expect(p1.nextCursor).toEqual(expect.any(String));
      expect(Object.keys(page1.body.data.items[0].user).toSorted()).toEqual([
        'displayName',
        'handle',
        'trustLevel',
        'userId',
      ]);

      const page2 = await http()
        .get(`/api/v1/me/following?limit=3&cursor=${p1.nextCursor}`)
        .set(a.headers)
        .expect(200);
      const p2 = envelope(cursorPage(FollowingItem)).parse(page2.body).data;
      expect(p2.items.map((i) => i.user.userId)).toEqual(
        targets.toReversed().slice(3).map((t) => t.id),
      );
      expect(p2.nextCursor).toBeNull();

      // A garbage cursor restarts from the first page rather than failing.
      const bad = await http()
        .get(`/api/v1/me/following?cursor=${Buffer.from('{"at":"x","id":"y"}').toString('base64url')}`)
        .set(a.headers)
        .expect(200);
      expect(bad.body.data.items).toHaveLength(5);
      const badValue = await http()
        .get(
          `/api/v1/me/following?cursor=${Buffer.from(
            JSON.stringify({ at: '2026-13-45T99:99:99.000000+00', id: randomUUID() }),
          ).toString('base64url')}`,
        )
        .set(a.headers)
        .expect(200);
      expect(badValue.body.data.items).toHaveLength(5);

      await http().get('/api/v1/me/following?limit=51').set(a.headers).expect(400);
    });

    it('hides members who turned private after being followed', async () => {
      const a = await createActor(app);
      const t = await createActor(app);
      await follow(t.id, a).expect(200);
      await pool.query(`UPDATE profiles SET visibility = 'private' WHERE user_id = $1`, [t.id]);
      const res = await http().get('/api/v1/me/following').set(a.headers).expect(200);
      expect(res.body.data.items).toEqual([]);
    });
  });

  describe('isolation', () => {
    it('gives B no way to learn that A follows X', async () => {
      const a = await createActor(app);
      const b = await createActor(app);
      const x = await createActor(app);
      await follow(x.id, a).expect(200);

      const bFollowing = await http().get('/api/v1/me/following').set(b.headers).expect(200);
      expect(bFollowing.body.data.items).toEqual([]);

      const xAsB = await http().get(`/api/v1/profiles/${x.handle}`).set(b.headers).expect(200);
      expect(xAsB.body.data.viewerIsFollowing).toBe(false);
      const xAsX = await http().get(`/api/v1/profiles/${x.handle}`).set(x.headers).expect(200);
      expect(xAsX.body.data.viewerIsFollowing).toBeNull();
      const aAsB = await http().get(`/api/v1/profiles/${a.handle}`).set(b.headers).expect(200);
      expect(JSON.stringify(aAsB.body)).not.toContain(x.id);

      // No route reads followers of anyone.
      await http().get(`/api/v1/users/${x.id}/followers`).set(x.headers).expect(404);
      await http().get(`/api/v1/users/${x.id}/follow`).set(x.headers).expect(404);
      const xFollowing = await http().get('/api/v1/me/following').set(x.headers).expect(200);
      expect(xFollowing.body.data.items).toEqual([]);
    });
  });

  describe('limits', () => {
    it('refuses the 501st follow, and two racing requests at 499 let exactly one through', async () => {
      const a = await createActor(app);
      // Edges to ids that belong to nobody: target_id has no FK, so this fills
      // the ceiling without registering 499 accounts.
      await pool.query(
        `INSERT INTO follows (follower_user_id, target_type, target_id)
         SELECT $1, 'user', gen_random_uuid() FROM generate_series(1, 499)`,
        [a.id],
      );
      const t1 = await createActor(app);
      const t2 = await createActor(app);
      const t3 = await createActor(app);

      const [r1, r2] = await Promise.all([follow(t1.id, a), follow(t2.id, a)]);
      expect([r1.status, r2.status].toSorted((x, y) => x - y)).toEqual([200, 403]);
      const refused = r1.status === 403 ? r1 : r2;
      expect(refused.body.code).toBe('FOLLOW_LIMIT_REACHED');
      expect(refused.body.messageKey).toBe('errors.follow.limitReached');

      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM follows WHERE follower_user_id = $1`,
        [a.id],
      );
      expect(rows[0]?.n).toBe(500);

      const winner = r1.status === 200 ? t1 : t2;
      await follow(t3.id, a).expect(403);
      // Replaying an existing edge at the ceiling is still a success, and unfollow frees a seat.
      await follow(winner.id, a).expect(200);
      await unfollow(winner.id, a).expect(204);
      await follow(t3.id, a).expect(200);
    });

    it('429s the 31st follow in an hour with Retry-After, while DELETE stays 204', async () => {
      const a = await createActor(app);
      const t = await createActor(app);
      for (let i = 0; i < 30; i += 1) {
        await follow(t.id, a).expect(200);
        await unfollow(t.id, a).expect(204);
      }
      const res = await follow(t.id, a).expect(429);
      expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(1);
      expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(3_600);
      expect(res.body.messageKey).toBe('errors.rateLimit.exceeded');
      expect(await edges(a.id, t.id)).toBe(0);
      await unfollow(t.id, a).expect(204);
    });
  });

  describe('suggestions', () => {
    it('ranks deterministically and excludes viewer, followed, private, T0 and anonymised members', async () => {
      const viewer = await createActor(app);
      await pool.query(`UPDATE profiles SET home_area_id = $2 WHERE user_id = $1`, [
        viewer.id,
        areaId,
      ]);

      const host = async (trustLevel: number, hosted: number, inArea: boolean) => {
        const actor = await createActor(app, { trustLevel });
        await pool.query(
          `UPDATE profiles SET events_hosted_count = $2, home_area_id = $3 WHERE user_id = $1`,
          [actor.id, hosted, inArea ? areaId : null],
        );
        return actor;
      };
      const publishUpcoming = async (organizer: Actor) => {
        const created = await http()
          .post('/api/v1/events')
          .set(organizer.headers)
          .send({
            title: 'Suggestion ranking event',
            areaId,
            lat: 16.06,
            lng: 108.247,
            startsAt: '2027-06-01T09:00:00.000Z',
            capacity: 10,
          })
          .expect(201);
        await http()
          .put(`/api/v1/events/${created.body.data.id}/status`)
          .set(organizer.headers)
          .send({ status: 'published' })
          .expect(200);
      };

      // Upcoming event + same area: the strongest tier, split by trust level.
      const second = await host(4, 1, true);
      const first = await host(5, 1, true);
      // Upcoming event, other area: below any area match, above everyone without an event.
      const third = await host(5, 99_999, false);
      for (const a of [second, first, third]) await publishUpcoming(a);

      // Would sit at the very top if not excluded.
      const followed = await host(5, 99_999, true);
      await publishUpcoming(followed);
      await follow(followed.id, viewer).expect(200);
      const priv = await host(5, 99_999, true);
      await publishUpcoming(priv);
      await pool.query(`UPDATE profiles SET visibility = 'private' WHERE user_id = $1`, [priv.id]);
      const t0 = await host(5, 99_999, true);
      await publishUpcoming(t0);
      await pool.query(`UPDATE users SET trust_level = 0 WHERE id = $1`, [t0.id]);
      const anon = await host(5, 99_999, true);
      await publishUpcoming(anon);
      await pool.query(`UPDATE users SET anonymized_at = now() WHERE id = $1`, [anon.id]);
      await pool.query(`UPDATE users SET trust_level = 5 WHERE id = $1`, [viewer.id]);
      await publishUpcoming(viewer);

      const call = () =>
        http().get('/api/v1/users/suggestions?limit=10').set(viewer.headers).expect(200);
      const one = await call();
      const two = await call();
      expect(ids(one).slice(0, 3)).toEqual([first.id, second.id, third.id]);
      // Only the rows this test owns: spec files share the database and run in
      // parallel, so members further down the list can change between calls.
      expect(ids(two).slice(0, 3)).toEqual(ids(one).slice(0, 3));
      for (const excluded of [viewer, followed, priv, t0, anon]) {
        expect(ids(one)).not.toContain(excluded.id);
      }
      expect(Object.keys(one.body.data.items[0]).toSorted()).toEqual([
        'displayName',
        'handle',
        'trustLevel',
        'userId',
      ]);
    });

    it('gives the same-area bonus only to members who show their area, and guests are fine', async () => {
      const viewer = await createActor(app);
      await pool.query(`UPDATE profiles SET home_area_id = $2 WHERE user_id = $1`, [viewer.id, areaId]);
      const make = async (trust: number, hosted: number, showArea: boolean) => {
        const actor = await createActor(app, { trustLevel: trust });
        await pool.query(
          `UPDATE profiles SET events_hosted_count = $2, home_area_id = $3, show_area_publicly = $4
            WHERE user_id = $1`,
          [actor.id, hosted, areaId, showArea],
        );
        const created = await http()
          .post('/api/v1/events')
          .set(actor.headers)
          .send({
            title: 'Area bonus event',
            areaId,
            lat: 16.06,
            lng: 108.247,
            startsAt: '2027-06-01T09:00:00.000Z',
            capacity: 10,
          })
          .expect(201);
        await http()
          .put(`/api/v1/events/${created.body.data.id}/status`)
          .set(actor.headers)
          .send({ status: 'published' })
          .expect(200);
        return actor;
      };
      // The hidden one beats the shown one on trust and hosted count, so it
      // only ranks lower if its area really earned no bonus.
      const shown = await make(3, 10, true);
      const hidden = await make(5, 99_999, false);

      const res = await http().get('/api/v1/users/suggestions?limit=10').set(viewer.headers).expect(200);
      const order = ids(res);
      expect(order).toContain(shown.id);
      expect(order).toContain(hidden.id);
      expect(order.indexOf(shown.id)).toBeLessThan(order.indexOf(hidden.id));

      await http().get('/api/v1/users/suggestions?limit=10').expect(200);
    });

    it('is public, honours limit, and rejects out-of-range limits', async () => {
      const guest = await http().get('/api/v1/users/suggestions').expect(200);
      expect(guest.body.data.items.length).toBeLessThanOrEqual(3);
      for (const item of guest.body.data.items) {
        expect(item.trustLevel).toBeGreaterThanOrEqual(1);
      }
      await http().get('/api/v1/users/suggestions?limit=11').expect(400);
      await http().get('/api/v1/users/suggestions?limit=0').expect(400);
    });
  });

  describe('deleteAllForUser', () => {
    it('removes edges in both directions and leaves unrelated ones', async () => {
      const repo = app.get(FollowRepository, { strict: false });
      const a = await createActor(app);
      const b = await createActor(app);
      const c = await createActor(app);
      await follow(b.id, a).expect(200);
      await follow(a.id, b).expect(200);
      await follow(c.id, b).expect(200);
      await follow(a.id, c).expect(200);
      // Orphan-shaped edge whose follower is gone-by-id: still matched by target_id.
      expect(await repo.deleteAllForUser(a.id)).toBe(3);

      const { rows } = await pool.query(
        `SELECT 1 FROM follows
          WHERE follower_user_id = $1 OR target_id = $1`,
        [a.id],
      );
      expect(rows).toHaveLength(0);
      expect(await edges(b.id, c.id)).toBe(1);
      const bFollowing = await http().get('/api/v1/me/following').set(b.headers).expect(200);
      expect(bFollowing.body.data.items.map((i: { user: { userId: string } }) => i.user.userId)).toEqual([
        c.id,
      ]);
    });
  });
});
