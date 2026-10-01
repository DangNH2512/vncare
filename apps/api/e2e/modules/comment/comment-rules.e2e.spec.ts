import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

describe('comment rules', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let pool: Pool;
  let organizer: Actor;
  let postId: string;

  const http = () => request(app.getHttpServer());

  const post = async (author: Actor): Promise<string> =>
    (
      await http()
        .post('/api/v1/posts')
        .set(author.headers)
        .send({ kind: 'question', body: 'Rules probe post', areaId })
        .expect(201)
    ).body.data.id;

  const makeEvent = async (status: 'draft' | 'published' | 'cancelled'): Promise<string> => {
    const created = await http()
      .post('/api/v1/events')
      .set(organizer.headers)
      .send({
        title: 'Comment rules event',
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: '2026-12-01T09:00:00.000Z',
        capacity: 10,
      })
      .expect(201);
    const id: string = created.body.data.id;
    if (status !== 'draft') {
      await http()
        .put(`/api/v1/events/${id}/status`)
        .set(organizer.headers)
        .send({ status: 'published' })
        .expect(200);
    }
    if (status === 'cancelled') {
      await http()
        .put(`/api/v1/events/${id}/status`)
        .set(organizer.headers)
        .send({ status: 'cancelled' })
        .expect(200);
    }
    return id;
  };

  const say = (target: string, user: Actor, body = 'A fine comment', extra = {}, kind = 'posts') =>
    http()
      .post(`/api/v1/${kind}/${target}/comments`)
      .set(user.headers)
      .send({ body, ...extra });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    organizer = await createActor(app, { trustLevel: 5 });
    postId = await post(organizer);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  describe('rate limit', () => {
    it('T1: the 6th comment inside 24h is 429 with Retry-After and the shared key', async () => {
      const t1 = await createActor(app, { trustLevel: 1 });
      for (let i = 0; i < 5; i += 1) await say(postId, t1).expect(201);

      const res = await say(postId, t1).expect(429);
      const retryAfter = Number(res.headers['retry-after']);
      // A 24h window armed on the first comment: close to a full day remains.
      expect(retryAfter).toBeGreaterThan(86_000);
      expect(retryAfter).toBeLessThanOrEqual(86_400);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.messageKey).toBe('errors.rateLimit.exceeded');
    });

    it('T3: the 6th comment inside one minute is 429 although the daily cap is 100', async () => {
      const t3 = await createActor(app, { trustLevel: 3 });
      for (let i = 0; i < 5; i += 1) await say(postId, t3).expect(201);

      const res = await say(postId, t3).expect(429);
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('does not spend a slot on validation failures or a missing parent', async () => {
      const t1 = await createActor(app, { trustLevel: 1 });
      for (let i = 0; i < 3; i += 1) await say(postId, t1, '   ').expect(400);
      for (let i = 0; i < 3; i += 1) {
        await say(postId, t1, 'orphan', { parentId: unknownId() }).expect(404);
      }
      for (let i = 0; i < 5; i += 1) await say(postId, t1).expect(201);
      await say(postId, t1).expect(429);
    });

    it('hands the slot back when the insert itself fails', async () => {
      const t1 = await createActor(app, { trustLevel: 1 });
      const eventId = await makeEvent('published');
      // An occurrence that does not exist trips the foreign key at insert time.
      for (let i = 0; i < 3; i += 1) {
        const bad = await say(eventId, t1, 'bad fk', { occurrenceId: unknownId() }, 'events');
        expect(bad.status).toBeGreaterThanOrEqual(400);
        expect(bad.status).toBeLessThan(500);
        expect(bad.status).not.toBe(429);
      }
      for (let i = 0; i < 5; i += 1) await say(postId, t1).expect(201);
      await say(postId, t1).expect(429);
    });

    it('T5 has no daily rule: only the per-minute ceiling applies', async () => {
      // The 5/minute ceiling stops a spec from posting more than five in a
      // minute, so assert on the rule table that defines the daily ceiling.
      const { COMMENT_DAILY_MAX_BY_TRUST } = await import(
        '../../../src/common/rate-limit/rate-limit.config.js'
      );
      expect(COMMENT_DAILY_MAX_BY_TRUST[5]).toBeUndefined();
      const t5 = await createActor(app, { trustLevel: 5 });
      for (let i = 0; i < 5; i += 1) await say(postId, t5).expect(201);
      const res = await say(postId, t5).expect(429);
      // A minute-window rejection, not a day-window one.
      expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(60);
    });

    it('fails open when Redis is unreachable', async () => {
      const saved = process.env['REDIS_CACHE_URL'];
      process.env['REDIS_CACHE_URL'] = 'redis://127.0.0.1:1';
      let degraded: INestApplication | undefined;
      try {
        degraded = await createTestApp();
      } finally {
        if (saved === undefined) delete process.env['REDIS_CACHE_URL'];
        else process.env['REDIS_CACHE_URL'] = saved;
      }
      try {
        const t1 = await createActor(degraded, { trustLevel: 1 });
        for (let i = 0; i < 7; i += 1) {
          await request(degraded.getHttpServer())
            .post(`/api/v1/posts/${postId}/comments`)
            .set(t1.headers)
            .send({ body: 'Posted while the limiter is down' })
            .expect(201);
        }
      } finally {
        await degraded.close();
      }
    });
  });

  describe('access', () => {
    it('guest gets 401 and T0 gets 403 on write', async () => {
      await http().post(`/api/v1/posts/${postId}/comments`).send({ body: 'x' }).expect(401);
      const t0 = await createActor(app, { trustLevel: 0 });
      await say(postId, t0).expect(403);
    });
  });

  describe('pinning', () => {
    it('refuses a reply with 403 CANNOT_PIN_REPLY and keeps the existing pin', async () => {
      const writer = await createActor(app, { trustLevel: 5 });
      const target = await post(organizer);
      const root = (await say(target, writer, 'root').expect(201)).body.data.id;
      const reply = (await say(target, writer, 'reply', { parentId: root }).expect(201)).body.data
        .id;
      await http().put(`/api/v1/comments/${root}/pin`).set(organizer.headers).expect(200);

      const res = await http()
        .put(`/api/v1/comments/${reply}/pin`)
        .set(organizer.headers)
        .expect(403);
      expect(res.body.code).toBe('CANNOT_PIN_REPLY');

      const old = await pool.query('SELECT is_pinned FROM comments WHERE id = $1', [root]);
      expect(old.rows[0].is_pinned).toBe(true);
    });

    it('answers 404 for a deleted comment and keeps the existing pin', async () => {
      const writer = await createActor(app, { trustLevel: 5 });
      const target = await post(organizer);
      const pinned = (await say(target, writer, 'pinned').expect(201)).body.data.id;
      const doomed = (await say(target, writer, 'doomed').expect(201)).body.data.id;
      await http().put(`/api/v1/comments/${pinned}/pin`).set(organizer.headers).expect(200);
      await http().delete(`/api/v1/comments/${doomed}`).set(writer.headers).expect(204);

      await http().put(`/api/v1/comments/${doomed}/pin`).set(organizer.headers).expect(404);
      const old = await pool.query('SELECT is_pinned FROM comments WHERE id = $1', [pinned]);
      expect(old.rows[0].is_pinned).toBe(true);
    });

    it('a comment on another thread cannot be pinned by this thread owner', async () => {
      const other = await createActor(app, { trustLevel: 5 });
      const foreignPost = await post(other);
      const foreign = (await say(foreignPost, other, 'foreign').expect(201)).body.data.id;
      const mine = (await say(postId, other, 'mine').expect(201)).body.data.id;
      await http().put(`/api/v1/comments/${mine}/pin`).set(organizer.headers).expect(200);

      await http().put(`/api/v1/comments/${foreign}/pin`).set(organizer.headers).expect(403);
      const old = await pool.query('SELECT is_pinned FROM comments WHERE id = $1', [mine]);
      expect(old.rows[0].is_pinned).toBe(true);
    });
  });

  describe('delete cascade', () => {
    it('deleting a root with two replies soft-deletes three rows and fixes comment_count', async () => {
      const writer = await createActor(app, { trustLevel: 5 });
      const target = await post(organizer);
      const root = (await say(target, writer, 'root').expect(201)).body.data.id;
      await say(target, writer, 'r1', { parentId: root }).expect(201);
      await say(target, writer, 'r2', { parentId: root }).expect(201);
      await say(target, writer, 'sibling root').expect(201);

      const before = await pool.query('SELECT comment_count FROM posts WHERE id = $1', [target]);
      expect(before.rows[0].comment_count).toBe(4);

      await http().delete(`/api/v1/comments/${root}`).set(writer.headers).expect(204);

      const rows = await pool.query(
        'SELECT count(*)::int AS n FROM comments WHERE post_id = $1 AND deleted_at IS NOT NULL',
        [target],
      );
      expect(rows.rows[0].n).toBe(3);
      const after = await pool.query('SELECT comment_count FROM posts WHERE id = $1', [target]);
      expect(after.rows[0].comment_count).toBe(1);
    });
  });

  describe('event state', () => {
    it('cancelled: read 200, write 403 COMMENTS_CLOSED', async () => {
      const id = await makeEvent('cancelled');
      await http().get(`/api/v1/events/${id}/comments`).expect(200);
      const res = await say(id, organizer, 'late', {}, 'events').expect(403);
      expect(res.body.code).toBe('COMMENTS_CLOSED');
      expect(res.body.messageKey).toBe('errors.comment.closed');
    });

    it('draft: 404 on read and write', async () => {
      const id = await makeEvent('draft');
      await http().get(`/api/v1/events/${id}/comments`).expect(404);
      await say(id, organizer, 'early', {}, 'events').expect(404);
    });

    it('unknown event: 404 EVENT_NOT_FOUND', async () => {
      const res = await say(unknownId(), organizer, 'x', {}, 'events').expect(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('published event that already ended still accepts comments', async () => {
      const id = await makeEvent('published');
      await pool.query(
        `UPDATE event_occurrences SET starts_at = now() - interval '3 days',
                           ends_at = now() - interval '2 days' WHERE event_id = $1`,
        [id],
      );
      await say(id, organizer, 'Great evening', {}, 'events').expect(201);
    });
  });
});
