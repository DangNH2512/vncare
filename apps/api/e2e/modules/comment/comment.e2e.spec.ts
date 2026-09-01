import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CommentResponse, envelope } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

describe('comment module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let postId: string;

  let postAuthor: Actor;
  let commenter: Actor;
  let otherCommenter: Actor;
  let newcomer: Actor;

  const comment = (target: string, text: string, user: Actor, extra = {}) =>
    request(app.getHttpServer())
      .post(`/api/v1/posts/${target}/comments`)
      .set(user.headers)
      .send({ body: text, ...extra });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    postAuthor = await createActor(app);
    commenter = await createActor(app);
    otherCommenter = await createActor(app);
    newcomer = await createActor(app, { trustLevel: 0 });

    const created = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(postAuthor.headers)
      .send({ kind: 'question', body: 'Best pho in Hai Chau?', areaId })
      .expect(201);
    postId = created.body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('creates a root comment at depth 0 and bumps the post counter', async () => {
    const res = await comment(postId, 'Try the one on Tran Phu.', commenter).expect(201);
    const parsed = envelope(CommentResponse).parse(res.body);
    expect(parsed.data.depth).toBe(0);
    expect(parsed.data.parentId).toBeNull();
    expect(parsed.data.targetType).toBe('post');
    expect(parsed.data.targetId).toBe(postId);

    const post = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}`)
      .set(commenter.headers)
      .expect(200);
    expect(post.body.data.commentCount).toBeGreaterThan(0);
  });

  it('flattens a reply to a reply onto level 1 instead of rejecting it', async () => {
    const root = await comment(postId, 'Root of a thread', commenter).expect(201);
    const rootId: string = root.body.data.id;

    const reply = await comment(postId, 'First reply', otherCommenter, {
      parentId: rootId,
    }).expect(201);
    expect(reply.body.data.depth).toBe(1);
    expect(reply.body.data.parentId).toBe(rootId);

    const nested = await comment(postId, 'Reply to the reply', commenter, {
      parentId: reply.body.data.id,
    }).expect(201);
    // Same branch, still depth 1 — the CHECK constraint allows nothing deeper.
    expect(nested.body.data.depth).toBe(1);
    expect(nested.body.data.parentId).toBe(rootId);
  });

  it('maintains reply_count on the parent', async () => {
    const root = await comment(postId, 'Counted root', commenter).expect(201);
    const rootId: string = root.body.data.id;
    await comment(postId, 'a', otherCommenter, { parentId: rootId }).expect(201);
    await comment(postId, 'b', otherCommenter, { parentId: rootId }).expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/comments/${rootId}`)
      .set(commenter.headers)
      .expect(200);
    expect(res.body.data.replyCount).toBe(2);
  });

  it('rejects an empty or oversized body', async () => {
    await comment(postId, '   ', commenter).expect(400);
    await comment(postId, 'x'.repeat(2001), commenter).expect(400);
  });

  it('answers 404 for a comment on a post that does not exist', async () => {
    await comment(unknownId(), 'orphan', commenter).expect(404);
  });

  it('requires T1 to comment', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/comments`)
      .set(newcomer.headers)
      .send({ body: 'T0 should not get through' })
      .expect(403);
  });

  it('lets the author edit and refuses another member', async () => {
    const created = await comment(postId, 'Editable comment', commenter).expect(201);
    const id: string = created.body.data.id;

    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/comments/${id}`)
      .set(commenter.headers)
      .send({ body: 'Edited comment' })
      .expect(200);
    expect(edited.body.data.isEdited).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/comments/${id}`)
      .set(otherCommenter.headers)
      .send({ body: 'Not mine' })
      .expect(403);
  });

  it('lets the thread owner delete a comment they did not write', async () => {
    const created = await comment(postId, 'Owner will remove this', commenter).expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/comments/${created.body.data.id}`)
      .set(postAuthor.headers)
      .expect(204);
  });

  it('refuses deletion by an unrelated member', async () => {
    const created = await comment(postId, 'Not yours to delete', commenter).expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/comments/${created.body.data.id}`)
      .set(otherCommenter.headers)
      .expect(403);
  });

  it('pins one comment at a time, owner only, roots only', async () => {
    const first = await comment(postId, 'Pin me first', commenter).expect(201);
    const second = await comment(postId, 'Pin me second', commenter).expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/comments/${first.body.data.id}/pin`)
      .set(commenter.headers)
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/comments/${first.body.data.id}/pin`)
      .set(postAuthor.headers)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/comments/${second.body.data.id}/pin`)
      .set(postAuthor.headers)
      .expect(200);

    const previous = await request(app.getHttpServer())
      .get(`/api/v1/comments/${first.body.data.id}`)
      .set(postAuthor.headers)
      .expect(200);
    expect(previous.body.data.isPinned).toBe(false);

    const reply = await comment(postId, 'A reply cannot be pinned', otherCommenter, {
      parentId: second.body.data.id,
    }).expect(201);
    await request(app.getHttpServer())
      .put(`/api/v1/comments/${reply.body.data.id}/pin`)
      .set(postAuthor.headers)
      .expect(403);
  });

  it('lists roots pinned-first and a branch oldest-first', async () => {
    const { areaId: threadArea, cleanup: cleanupThread } = await seedArea();
    try {
      const post = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set(postAuthor.headers)
        .send({ kind: 'notice', body: 'Ordering probe', areaId: threadArea })
        .expect(201);
      const target: string = post.body.data.id;

      const oldest = await comment(target, 'oldest root', commenter).expect(201);
      await comment(target, 'middle root', commenter).expect(201);
      await comment(target, 'newest root', commenter).expect(201);
      await request(app.getHttpServer())
        .put(`/api/v1/comments/${oldest.body.data.id}/pin`)
        .set(postAuthor.headers)
        .expect(200);

      const roots = await request(app.getHttpServer())
        .get(`/api/v1/posts/${target}/comments`)
        .set(commenter.headers)
        .expect(200);
      expect(roots.body.data.items[0].id).toBe(oldest.body.data.id);
      expect(roots.body.data.items).toHaveLength(3);

      const parentId: string = roots.body.data.items[1].id;
      await comment(target, 'reply one', otherCommenter, { parentId }).expect(201);
      await comment(target, 'reply two', otherCommenter, { parentId }).expect(201);

      const branch = await request(app.getHttpServer())
        .get(`/api/v1/posts/${target}/comments`)
        .query({ parentId })
        .set(commenter.headers)
        .expect(200);
      expect(branch.body.data.items.map((c: { body: string }) => c.body)).toEqual([
        'reply one',
        'reply two',
      ]);
    } finally {
      await cleanupThread();
    }
  });
});
