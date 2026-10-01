import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createActor, createTestApp, seedArea, type Actor } from '../../support/harness.js';

describe('reaction rules', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let organizer: Actor;
  let postId: string;

  const http = () => request(app.getHttpServer());

  const makeEvent = async (status: 'draft' | 'published' | 'cancelled'): Promise<string> => {
    const created = await http()
      .post('/api/v1/events')
      .set(organizer.headers)
      .send({
        title: 'Reaction rules event',
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

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    organizer = await createActor(app);
    postId = (
      await http()
        .post('/api/v1/posts')
        .set(organizer.headers)
        .send({ kind: 'question', body: 'Reaction rules post', areaId })
        .expect(201)
    ).body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('event reactions: allowed when published or cancelled, 404 otherwise (read and write)', async () => {
    const reader = await createActor(app);
    const published = await makeEvent('published');
    const cancelled = await makeEvent('cancelled');
    const draft = await makeEvent('draft');

    for (const id of [published, cancelled]) {
      await http()
        .put(`/api/v1/events/${id}/reactions`)
        .set(reader.headers)
        .send({ kind: 'like' })
        .expect(200);
      await http().get(`/api/v1/events/${id}/reactions`).expect(200);
    }

    await http()
      .put(`/api/v1/events/${draft}/reactions`)
      .set(reader.headers)
      .send({ kind: 'like' })
      .expect(404);
    await http().get(`/api/v1/events/${draft}/reactions`).expect(404);
    await http().delete(`/api/v1/events/${draft}/reactions`).set(reader.headers).expect(404);
  });

  it('guest gets 401 and T0 gets 403', async () => {
    await http().put(`/api/v1/posts/${postId}/reactions`).send({ kind: 'like' }).expect(401);
    const t0 = await createActor(app, { trustLevel: 0 });
    await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(t0.headers)
      .send({ kind: 'like' })
      .expect(403);
  });

  it('the 61st reaction write inside a minute is 429 with Retry-After', async () => {
    const fan = await createActor(app);
    for (let i = 0; i < 60; i += 1) {
      await http()
        .put(`/api/v1/posts/${postId}/reactions`)
        .set(fan.headers)
        .send({ kind: i % 2 === 0 ? 'like' : 'love' })
        .expect(200);
    }
    const res = await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(fan.headers)
      .send({ kind: 'like' })
      .expect(429);
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(res.body.messageKey).toBe('errors.rateLimit.exceeded');
  });
});
