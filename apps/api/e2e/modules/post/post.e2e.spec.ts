import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cursorPage, envelope, PostResponse } from '@dnc/contracts';
import { asUser, createTestApp, newUserId, seedArea } from '../../support/harness.js';

describe('post module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;

  const author = newUserId();
  const stranger = newUserId();

  const body = (overrides: Record<string, unknown> = {}) => ({
    kind: 'question',
    body: 'Where can I play badminton in An Thuong on a weekday evening?',
    areaId,
    ...overrides,
  });

  const create = async (overrides: Record<string, unknown> = {}, user = author) =>
    request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(user))
      .send(body(overrides))
      .expect(201);

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('creates a post and returns it in the contract shape', async () => {
    const res = await create();
    const parsed = envelope(PostResponse).parse(res.body);
    expect(parsed.data.authorUserId).toBe(author);
    expect(parsed.data.kind).toBe('question');
    expect(parsed.data.commentCount).toBe(0);
    expect(parsed.data.reactionCount).toBe(0);
    expect(parsed.data.viewerReaction).toBeNull();
  });

  it('takes the author from the caller, never from the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(author))
      .send({ ...body(), authorUserId: stranger })
      .expect(201);
    expect(res.body.data.authorUserId).toBe(author);
  });

  it('never exposes moderation columns', async () => {
    const res = await create();
    for (const leak of ['moderationState', 'moderation_state', 'reportCount', 'report_count']) {
      expect(res.body.data).not.toHaveProperty(leak);
    }
  });

  it('rejects a body over the length cap, and drops unattachable media', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(author))
      .send(body({ body: 'x'.repeat(5001) }))
      .expect(400);

    // Unowned media ids are dropped rather than rejected, so the post still
    // succeeds — with an empty gallery.
    const res = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(author))
      .send(body({ mediaIds: Array.from({ length: 6 }, () => newUserId()) }))
      .expect(201);
    expect(res.body.data.mediaIds).toEqual([]);
  });

  it('rejects an unknown area with a reference error, not a 500', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(asUser(author))
      .send(body({ areaId: newUserId() }))
      .expect(400);
  });

  it('lets the author edit and refuses everyone else', async () => {
    const created = await create();
    const id: string = created.body.data.id;

    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/posts/${id}`)
      .set(asUser(author))
      .send({ body: 'Updated question text' })
      .expect(200);
    expect(edited.body.data.body).toBe('Updated question text');
    expect(edited.body.data.isEdited).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/posts/${id}`)
      .set(asUser(stranger))
      .send({ body: 'Hijacked' })
      .expect(403);
  });

  it('moves a post to city-wide when areaId is explicitly null', async () => {
    const created = await create();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/posts/${created.body.data.id}`)
      .set(asUser(author))
      .send({ areaId: null })
      .expect(200);
    expect(res.body.data.areaId).toBeNull();
  });

  it('soft deletes: gone from reads, refused for a stranger', async () => {
    const created = await create();
    const id: string = created.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${id}`)
      .set(asUser(stranger))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${id}`)
      .set(asUser(author))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/posts/${id}`)
      .set(asUser(author))
      .expect(404);
  });

  it('paginates by cursor without repeating or dropping a row', async () => {
    const { cleanup: cleanupFeed, areaId: feedArea } = await seedArea();
    try {
      const ids: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/posts')
          .set(asUser(author))
          .send({ kind: 'notice', body: `Feed post ${i}`, areaId: feedArea })
          .expect(201);
        ids.push(res.body.data.id);
      }

      const seen: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 5; page += 1) {
        const res: request.Response = await request(app.getHttpServer())
          .get('/api/v1/posts')
          .query({ areaId: feedArea, limit: 2, ...(cursor ? { cursor } : {}) })
          .set(asUser(stranger))
          .expect(200);
        const parsed = envelope(cursorPage(PostResponse)).parse(res.body);
        seen.push(...parsed.data.items.map((p) => p.id));
        cursor = parsed.data.nextCursor;
        if (!cursor) break;
      }

      expect(new Set(seen).size).toBe(5);
      // Newest first, so the insertion order reverses exactly.
      expect(seen).toEqual(ids.toReversed());
    } finally {
      await cleanupFeed();
    }
  });

  it('falls back to the first page for a malformed cursor instead of erroring', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ cursor: 'not-a-real-cursor' })
      .set(asUser(stranger))
      .expect(200);
  });
});
