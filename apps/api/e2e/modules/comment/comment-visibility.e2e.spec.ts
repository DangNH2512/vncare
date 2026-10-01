import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

type Thread = { kind: 'events' | 'posts'; id: string; commentId: string; writer: Actor };

describe('comment writes follow the parent state', { timeout: 60_000 }, () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let pool: Pool;
  let owner: Actor;
  let fan: Actor;

  const http = () => request(app.getHttpServer());

  /** A published event with one comment by `writer`. */
  const eventThread = async (): Promise<Thread> => {
    const created = await http()
      .post('/api/v1/events')
      .set(owner.headers)
      .send({
        title: 'Visibility event',
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: '2026-12-01T09:00:00.000Z',
        capacity: 10,
      })
      .expect(201);
    const id: string = created.body.data.id;
    await http()
      .put(`/api/v1/events/${id}/status`)
      .set(owner.headers)
      .send({ status: 'published' })
      .expect(200);
    // A fresh writer per thread keeps clear of the 5-per-minute quota.
    const writer = await createActor(app, { trustLevel: 5 });
    const c = await http()
      .post(`/api/v1/events/${id}/comments`)
      .set(writer.headers)
      .send({ body: 'Looking forward to it' })
      .expect(201);
    return { kind: 'events', id, commentId: c.body.data.id, writer };
  };

  const postThread = async (): Promise<Thread> => {
    const p = await http()
      .post('/api/v1/posts')
      .set(owner.headers)
      .send({ kind: 'question', body: 'Visibility post', areaId })
      .expect(201);
    const id: string = p.body.data.id;
    const writer = await createActor(app, { trustLevel: 5 });
    const c = await http()
      .post(`/api/v1/posts/${id}/comments`)
      .set(writer.headers)
      .send({ body: 'An answer' })
      .expect(201);
    return { kind: 'posts', id, commentId: c.body.data.id, writer };
  };

  const edit = (t: Thread) =>
    http().patch(`/api/v1/comments/${t.commentId}`).set(t.writer.headers).send({ body: 'edited' });
  const pin = (t: Thread) => http().put(`/api/v1/comments/${t.commentId}/pin`).set(owner.headers);
  const remove = (t: Thread) => http().delete(`/api/v1/comments/${t.commentId}`).set(t.writer.headers);
  const react = (t: Thread) =>
    http()
      .put(`/api/v1/comments/${t.commentId}/reactions`)
      .set(fan.headers)
      .send({ kind: 'like' });
  const read = (t: Thread) => http().get(`/api/v1/comments/${t.commentId}`);

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    owner = await createActor(app, { trustLevel: 5 });
    fan = await createActor(app, { trustLevel: 5 });
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  it('cancelled event: read ok, edit/pin 403 COMMENTS_CLOSED, reaction ok, own delete ok', async () => {
    const t = await eventThread();
    await http()
      .put(`/api/v1/events/${t.id}/status`)
      .set(owner.headers)
      .send({ status: 'cancelled' })
      .expect(200);

    await read(t).expect(200);
    expect((await edit(t).expect(403)).body.code).toBe('COMMENTS_CLOSED');
    expect((await pin(t).expect(403)).body.code).toBe('COMMENTS_CLOSED');
    await react(t).expect(200);
    await remove(t).expect(204);
  });

  const hiddenEventStates: [string, (id: string) => Promise<unknown>][] = [
    ['draft', (id) => http().put(`/api/v1/events/${id}/status`).set(owner.headers).send({ status: 'draft' })],
    [
      'pending_review',
      (id) =>
        http().put(`/api/v1/events/${id}/status`).set(owner.headers).send({ status: 'pending_review' }),
    ],
    ['suspended', (id) => pool.query(`UPDATE events SET status = 'suspended' WHERE id = $1`, [id])],
    ['taken_down', (id) => pool.query(`UPDATE events SET status = 'taken_down' WHERE id = $1`, [id])],
    ['deleted', (id) => pool.query(`UPDATE events SET deleted_at = now() WHERE id = $1`, [id])],
  ];

  for (const [state, hide] of hiddenEventStates) {
    it(`event ${state}: every operation on its comment is 404`, async () => {
      const t = await eventThread();
      await hide(t.id);
      await read(t).expect(404);
      await edit(t).expect(404);
      await pin(t).expect(404);
      await remove(t).expect(404);
      await react(t).expect(404);
    });
  }

  for (const state of ['hidden', 'removed', 'pending_review']) {
    it(`post ${state}: every operation on its comment is 404`, async () => {
      const t = await postThread();
      await pool.query(`UPDATE posts SET status = $2 WHERE id = $1`, [t.id, state]);
      await read(t).expect(404);
      await edit(t).expect(404);
      await pin(t).expect(404);
      await remove(t).expect(404);
      await react(t).expect(404);
    });
  }

  it('deleted post: every operation on its comment is 404', async () => {
    const t = await postThread();
    await pool.query(`UPDATE posts SET deleted_at = now() WHERE id = $1`, [t.id]);
    await read(t).expect(404);
    await edit(t).expect(404);
    await pin(t).expect(404);
    await remove(t).expect(404);
    await react(t).expect(404);
  });

  it('visible post and published event keep working', async () => {
    for (const t of [await postThread(), await eventThread()]) {
      await read(t).expect(200);
      await react(t).expect(200);
      await edit(t).expect(200);
      await pin(t).expect(200);
      await remove(t).expect(204);
    }
  });

  it('a comment hidden by a moderator can no longer be edited by its author', async () => {
    const t = await postThread();
    await pool.query(`UPDATE comments SET status = 'hidden' WHERE id = $1`, [t.commentId]);
    await edit(t).expect(404);
    const { rows } = await pool.query(`SELECT body, is_edited FROM comments WHERE id = $1`, [
      t.commentId,
    ]);
    expect(rows[0].body).toBe('An answer');
    expect(rows[0].is_edited).toBe(false);
  });
});
