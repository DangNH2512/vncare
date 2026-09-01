import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, ReactionSummaryResponse } from '@dnc/contracts';
import { asUser, createTestApp, newUserId, seedArea } from '../../support/harness.js';

describe('reaction module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let postId: string;
  let commentId: string;
  let eventId: string;

  const author = newUserId();
  const reader = newUserId();
  const secondReader = newUserId();

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();

    const post = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(author))
      .send({ kind: 'recommendation', body: 'Great banh mi on Le Duan.', areaId })
      .expect(201);
    postId = post.body.data.id;

    const comment = await request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/comments`)
      .set(asUser(reader))
      .send({ body: 'Seconded.' })
      .expect(201);
    commentId = comment.body.data.id;

    const event = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(author))
      .send({
        title: 'Reaction probe event',
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: '2026-11-01T09:00:00.000Z',
        capacity: 10,
      })
      .expect(201);
    eventId = event.body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('sets a reaction and reports it back in the summary', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .send({ kind: 'like' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .expect(200);

    const parsed = envelope(ReactionSummaryResponse).parse(res.body);
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.byKind.like).toBe(1);
    expect(parsed.data.viewerReaction).toBe('like');
  });

  it('reports every kind including the unused ones', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(secondReader))
      .expect(200);
    expect(Object.keys(res.body.data.byKind).toSorted()).toEqual([
      'celebrate',
      'going',
      'helpful',
      'like',
      'love',
    ]);
    expect(res.body.data.viewerReaction).toBeNull();
  });

  it('replaces rather than duplicates when the caller changes their mind', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .send({ kind: 'love' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.byKind.love).toBe(1);
    expect(res.body.data.byKind.like).toBe(0);
  });

  it('is idempotent when the same kind is sent twice', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(secondReader))
      .send({ kind: 'helpful' })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(secondReader))
      .send({ kind: 'helpful' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .expect(200);
    expect(res.body.data.total).toBe(2);
  });

  it('keeps the post reaction_count cache in step with the rows', async () => {
    const post = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}`)
      .set(asUser(reader))
      .expect(200);
    expect(post.body.data.reactionCount).toBe(2);
    expect(post.body.data.viewerReaction).toBe('love');
  });

  it('removes a reaction, and removing it twice still succeeds', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(secondReader))
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(secondReader))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .expect(200);
    expect(res.body.data.total).toBe(1);
  });

  it('rejects an unknown reaction kind', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(asUser(reader))
      .send({ kind: 'thumbs_down' })
      .expect(400);
  });

  it('answers 404 for a target that does not exist', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/posts/${newUserId()}/reactions`)
      .set(asUser(reader))
      .send({ kind: 'like' })
      .expect(404);
  });

  it('reacts to a comment and updates that comment counter', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/comments/${commentId}/reactions`)
      .set(asUser(author))
      .send({ kind: 'celebrate' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/comments/${commentId}`)
      .set(asUser(author))
      .expect(200);
    expect(res.body.data.reactionCount).toBe(1);
    expect(res.body.data.viewerReaction).toBe('celebrate');
  });

  /**
   * The `going` reaction is an interest signal only. It must not appear
   * anywhere near seat accounting, which stays with the RSVP tables and the
   * assert_capacity trigger.
   */
  it('records `going` on an event without touching seatsTaken', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/events/${eventId}/reactions`)
      .set(asUser(reader))
      .send({ kind: 'going' })
      .expect(200);

    const summary = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}/reactions`)
      .set(asUser(reader))
      .expect(200);
    expect(summary.body.data.byKind.going).toBe(1);

    const event = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .set(asUser(author))
      .expect(200);
    expect(event.body.data.seatsTaken).toBe(0);
  });
});
