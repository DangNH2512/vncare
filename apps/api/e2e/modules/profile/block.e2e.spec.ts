import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BlockedUserResponse, cursorPage, envelope } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

/**
 * Blocking (E8-S2, S5-DoD-8): the block endpoints, and the two-way effect of a
 * block on every member-facing surface that exists today (task board T-API-5,
 * T-API-6, §4 "Thay đổi hành vi endpoint hiện có").
 *
 * The matrix runs every row in both directions, from one block row: A blocks
 * B, then B looks at A's things and A looks at B's things. C, who is in
 * neither side, must keep seeing both (AC-14). Every 404 caused by a block is
 * compared whole against the 404 of an id that does not exist (AC-17).
 */
describe('blocking', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let pool: Pool;
  const mine: string[] = [];

  const http = () => request(app.getHttpServer());

  /** T2 throughout so the direct-message rows can be exercised too. */
  const actor = async (): Promise<Actor> => {
    const created = await createActor(app, { trustLevel: 2 });
    mine.push(created.id);
    return created;
  };

  const block = (by: Actor, target: string) =>
    http().post(`/api/v1/users/${target}/block`).set(by.headers);
  const unblock = (by: Actor, target: string) =>
    http().delete(`/api/v1/users/${target}/block`).set(by.headers);

  const publishEvent = async (organizer: Actor): Promise<{ id: string; occurrenceId: string }> => {
    const created = await http()
      .post('/api/v1/events')
      .set(organizer.headers)
      .send({
        title: `Block probe ${randomUUID().slice(0, 8)}`,
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        capacity: 10,
      })
      .expect(201);
    await http()
      .put(`/api/v1/events/${created.body.data.id}/status`)
      .set(organizer.headers)
      .send({ status: 'published' })
      .expect(200);
    return { id: created.body.data.id, occurrenceId: created.body.data.occurrenceId };
  };

  const createPost = async (author: Actor): Promise<string> => {
    const res = await http()
      .post('/api/v1/posts')
      .set(author.headers)
      .send({ kind: 'question', body: `Block probe post ${randomUUID()}`, areaId })
      .expect(201);
    return res.body.data.id as string;
  };

  const comment = async (
    author: Actor,
    postId: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const res = await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(author.headers)
      .send({ body: `Block probe comment ${randomUUID().slice(0, 8)}`, ...extra })
      .expect(201);
    return res.body.data.id as string;
  };

  const eventComment = async (author: Actor, eventId: string): Promise<string> => {
    const res = await http()
      .post(`/api/v1/events/${eventId}/comments`)
      .set(author.headers)
      .send({ body: `Block probe event comment ${randomUUID().slice(0, 8)}` })
      .expect(201);
    return res.body.data.id as string;
  };

  const attendeeList = (occurrenceId: string, who: Actor) =>
    http().get(`/api/v1/occurrences/${occurrenceId}/rsvps`).set(who.headers);

  const join = (occurrenceId: string, who: Actor) =>
    http()
      .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set({ ...who.headers, 'idempotency-key': randomUUID() });

  const ids = (res: request.Response): string[] =>
    (res.body.data.items as Array<{ id: string }>).map((item) => item.id);

  const openDirect = (from: Actor, to: Actor) =>
    http()
      .post('/api/v1/conversations')
      .set(from.headers)
      .send({ type: 'direct', recipientUserId: to.id });

  const send = (conversationId: string, from: Actor) =>
    http()
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(from.headers)
      .send({ type: 'text', body: 'Block probe message', clientMessageId: randomUUID() });

  /** Every 404 caused by a block must be this, byte for byte. */
  let unknown: {
    event: unknown;
    post: unknown;
    comment: unknown;
    profile: unknown;
    occurrence: unknown;
    postThread: unknown;
    eventThread: unknown;
    reaction: unknown;
    attendees: unknown;
  };

  const blockCount = async (blocker: string, blocked: string): Promise<number> => {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
      [blocker, blocked],
    );
    return rows[0]?.n ?? 0;
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

    const probe = await actor();
    const notFound = async (req: request.Test) => (await req.expect(404)).body as unknown;
    unknown = {
      event: await notFound(http().get(`/api/v1/events/${unknownId()}`).set(probe.headers)),
      post: await notFound(http().get(`/api/v1/posts/${unknownId()}`).set(probe.headers)),
      comment: await notFound(http().get(`/api/v1/comments/${unknownId()}`).set(probe.headers)),
      profile: await notFound(http().get('/api/v1/profiles/no_such_handle_zz').set(probe.headers)),
      occurrence: await notFound(join(unknownId(), probe)),
      postThread: await notFound(
        http().get(`/api/v1/posts/${unknownId()}/comments`).set(probe.headers),
      ),
      eventThread: await notFound(
        http().get(`/api/v1/events/${unknownId()}/comments`).set(probe.headers),
      ),
      reaction: await notFound(
        http().put(`/api/v1/posts/${unknownId()}/reactions`).set(probe.headers).send({ kind: 'like' }),
      ),
      attendees: await notFound(attendeeList(unknownId(), probe)),
    };
  });

  afterAll(async () => {
    // `blocks` cascades when the harness deletes the users; clearing it here
    // first keeps this file's rows from depending on that order.
    await pool.query(
      `DELETE FROM blocks WHERE blocker_user_id = ANY($1::uuid[]) OR blocked_user_id = ANY($1::uuid[])`,
      [mine],
    );
    await pool.end();
    await app.close();
    await cleanup();
  });

  /* ------------------------------------------------------ T-API-5: E2–E4 */

  describe('block endpoints', () => {
    it('AC-20: requires an account on every block route', async () => {
      const target = unknownId();
      await http().post(`/api/v1/users/${target}/block`).expect(401);
      await http().delete(`/api/v1/users/${target}/block`).expect(401);
      const res = await http().get('/api/v1/me/blocks').expect(401);
      expect(res.body).toEqual({
        code: 'UNAUTHENTICATED',
        messageKey: 'errors.auth.unauthenticated',
      });
    });

    it('AC-16: refuses a self-block with 422 and an unknown account with 404', async () => {
      const a = await actor();

      const self = await block(a, a.id).expect(422);
      expect(self.body).toEqual({
        code: 'BLOCK_SELF_NOT_ALLOWED',
        messageKey: 'errors.block.selfNotAllowed',
      });

      const missing = await block(a, unknownId()).expect(404);
      expect(missing.body).toEqual({
        code: 'PROFILE_NOT_FOUND',
        messageKey: 'errors.profile.notFound',
      });

      await block(a, 'not-a-uuid').expect(400);
    });

    /**
     * CR-3 (task board E2 amended): an account that is not `active` but still
     * has a visible profile is blocked like any other — a 404 here would tell
     * the blocker the account is under moderation, and would keep a victim
     * from blocking someone who is only suspended for a week.
     */
    it('CR-3: blocks a suspended or deactivated account with 204, like an active one', async () => {
      const a = await actor();
      for (const status of ['suspended', 'deactivated', 'pending'] as const) {
        const target = await actor();
        await pool.query(
          `UPDATE users SET status = $2,
                  suspended_until = CASE WHEN $2 = 'suspended' THEN now() + interval '7 days' END
            WHERE id = $1`,
          [target.id, status],
        );
        const res = await block(a, target.id).expect(204);
        expect(res.body).toEqual({});
        expect(await blockCount(a.id, target.id)).toBe(1);
        await pool.query(
          `UPDATE users SET status = 'active', suspended_until = NULL WHERE id = $1`,
          [target.id],
        );
      }
    });

    it('CR-3: only a deleted account answers 404, the same 404 as an unknown id', async () => {
      const a = await actor();
      const unknownBody = (await block(a, unknownId()).expect(404)).body as unknown;

      const byStatus = await actor();
      await pool.query(`UPDATE users SET status = 'deleted' WHERE id = $1`, [byStatus.id]);
      expect((await block(a, byStatus.id).expect(404)).body).toEqual(unknownBody);
      await pool.query(`UPDATE users SET status = 'active' WHERE id = $1`, [byStatus.id]);

      const byColumn = await actor();
      await pool.query(`UPDATE users SET deleted_at = now() WHERE id = $1`, [byColumn.id]);
      expect((await block(a, byColumn.id).expect(404)).body).toEqual(unknownBody);
      await pool.query(`UPDATE users SET deleted_at = NULL WHERE id = $1`, [byColumn.id]);

      expect(await blockCount(a.id, byStatus.id)).toBe(0);
      expect(await blockCount(a.id, byColumn.id)).toBe(0);
    });

    it('AC-16: blocking twice answers 204 both times and keeps one row', async () => {
      const [a, b] = [await actor(), await actor()];
      await block(a, b.id).expect(204);
      await block(a, b.id).expect(204);
      expect(await blockCount(a.id, b.id)).toBe(1);
    });

    it('AC-16: unblocking someone never blocked answers 204', async () => {
      const [a, b] = [await actor(), await actor()];
      await unblock(a, b.id).expect(204);
      expect(await blockCount(a.id, b.id)).toBe(0);
    });

    it('AC-12, AC-20: the blocker sees the person in their own list, and only there', async () => {
      const [a, b] = [await actor(), await actor()];
      await block(a, b.id).expect(204);

      const mineList = await http().get('/api/v1/me/blocks').set(a.headers).expect(200);
      const parsed = envelope(cursorPage(BlockedUserResponse)).parse(mineList.body);
      const entry = parsed.data.items.find((item) => item.userId === b.id);
      expect(entry).toBeDefined();
      expect(entry?.handle).toBe(b.handle);
      expect(entry?.avatarUrl).toBeNull();
      expect(Object.keys(entry ?? {}).sort()).toEqual(
        ['avatarUrl', 'blockedAt', 'displayName', 'handle', 'userId'],
      );

      // The blocked side learns nothing: B's own list is B's blocks, not A's.
      const theirs = await http().get('/api/v1/me/blocks').set(b.headers).expect(200);
      expect(theirs.body.data.items).toEqual([]);
    });

    it('lists blocks newest first across pages', async () => {
      const a = await actor();
      const targets = [await actor(), await actor(), await actor()];
      for (const [i, t] of targets.entries()) {
        await block(a, t.id).expect(204);
        // Distinct timestamps so the order under test is not a tie-break.
        await pool.query(
          `UPDATE blocks SET created_at = now() - ($3 || ' minutes')::interval
            WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
          [a.id, t.id, String(10 - i)],
        );
      }

      const first = await http().get('/api/v1/me/blocks').query({ limit: 2 }).set(a.headers).expect(200);
      expect(first.body.data.items.map((i: { userId: string }) => i.userId)).toEqual([
        targets[2]?.id,
        targets[1]?.id,
      ]);
      expect(first.body.data.nextCursor).toEqual(expect.any(String));

      const second = await http()
        .get('/api/v1/me/blocks')
        .query({ limit: 2, cursor: first.body.data.nextCursor })
        .set(a.headers)
        .expect(200);
      expect(second.body.data.items.map((i: { userId: string }) => i.userId)).toEqual([
        targets[0]?.id,
      ]);
      expect(second.body.data.nextCursor).toBeNull();
    });

    it('AC-46: blocking and unblocking write no audit entry', async () => {
      const [a, b] = [await actor(), await actor()];
      await block(a, b.id).expect(204);
      await unblock(a, b.id).expect(204);
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM audit_logs
          WHERE actor_user_id = ANY($1::uuid[]) OR subject_user_id = ANY($1::uuid[])`,
        [[a.id, b.id]],
      );
      expect(rows[0]?.n).toBe(0);
    });
  });

  /* ----------------------------------------------- T-API-6: the matrix */

  describe('two-way effect on every surface', () => {
    let a: Actor;
    let b: Actor;
    let c: Actor;
    const things: Record<string, {
      event: { id: string; occurrenceId: string };
      post: string;
      commentOnThird: string;
      replyOnThird: string;
      /** C's comments inside the owner's threads (CR-8). */
      thirdOnPost: string;
      thirdOnEvent: string;
    }> = {};
    let thirdPost: string;
    let thirdRoot: string;
    let thirdEvent: { id: string; occurrenceId: string };
    let directId: string;

    beforeAll(async () => {
      [a, b, c] = [await actor(), await actor(), await actor()];

      thirdPost = await createPost(c);
      thirdRoot = await comment(c, thirdPost);
      thirdEvent = await publishEvent(c);

      for (const who of [a, b]) {
        const event = await publishEvent(who);
        const post = await createPost(who);
        things[who.id] = {
          event,
          post,
          commentOnThird: await comment(who, thirdPost),
          replyOnThird: await comment(who, thirdPost, { parentId: thirdRoot }),
          thirdOnPost: await comment(c, post),
          thirdOnEvent: await eventComment(c, event.id),
        };
        await join(thirdEvent.occurrenceId, who).expect(201);
      }

      // AC-15: B holds a seat at A's event before the block.
      await join(things[a.id]!.event.occurrenceId, b).expect(201);

      // A direct thread between them, accepted before the block.
      const opened = await openDirect(a, b).expect(201);
      directId = opened.body.data.id;
      await http()
        .put(`/api/v1/conversations/${directId}/request`)
        .set(b.headers)
        .send({ decision: 'accepted' })
        .expect(200);
      await send(directId, a).expect(201);

      await block(a, b.id).expect(204);
    });

    /** [viewer, owner]: one block row, looked at from both sides. */
    const directions = (): Array<[string, () => Actor, () => Actor]> => [
      ['B looking at A (blocked looks at blocker)', () => b, () => a],
      ['A looking at B (blocker looks at blocked)', () => a, () => b],
    ];

    for (const [label, viewerOf, ownerOf] of directions()) {
      describe(label, () => {
        it('events: gone from discovery, detail 404 like an unknown id', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const mineOwn = things[viewer.id]!.event.id;
          const theirs = things[owner.id]!.event.id;

          const list = await http()
            .get('/api/v1/events')
            .query({ areaId, limit: 50 })
            .set(viewer.headers)
            .expect(200);
          expect(ids(list)).not.toContain(theirs);
          expect(ids(list)).toContain(mineOwn);

          const nearby = await http()
            .get('/api/v1/events')
            .query({ areaId, limit: 50, lat: 16.06, lng: 108.247, radiusMeters: 5000 })
            .set(viewer.headers)
            .expect(200);
          expect(ids(nearby)).not.toContain(theirs);

          const detail = await http().get(`/api/v1/events/${theirs}`).set(viewer.headers).expect(404);
          expect(detail.body).toEqual(unknown.event);
        });

        it('RSVP: joining the other side’s occurrence is a 404 like an unknown one', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const res = await join(things[owner.id]!.event.occurrenceId, viewer).expect(404);
          expect(res.body).toEqual(unknown.occurrence);
        });

        it('RSVP: the other side is missing from an attendee list, the count is not', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const res = await http()
            .get(`/api/v1/occurrences/${thirdEvent.occurrenceId}/rsvps`)
            .set(viewer.headers)
            .expect(200);
          const people = (res.body.data as Array<{ userId: string }>).map((p) => p.userId);
          expect(people).toContain(viewer.id);
          expect(people).not.toContain(owner.id);

          const event = await http().get(`/api/v1/events/${thirdEvent.id}`).set(viewer.headers).expect(200);
          expect(event.body.data.seatsTaken).toBe(2);
        });

        it('posts: gone from the feed and from the author filter, detail 404', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const theirs = things[owner.id]!.post;

          const feed = await http().get('/api/v1/posts').query({ areaId, limit: 50 }).set(viewer.headers).expect(200);
          expect(ids(feed)).not.toContain(theirs);
          expect(ids(feed)).toContain(things[viewer.id]!.post);

          const byAuthor = await http()
            .get('/api/v1/posts')
            .query({ authorUserId: owner.id, limit: 50 })
            .set(viewer.headers)
            .expect(200);
          expect(byAuthor.body.data.items).toEqual([]);

          const detail = await http().get(`/api/v1/posts/${theirs}`).set(viewer.headers).expect(404);
          expect(detail.body).toEqual(unknown.post);
        });

        it('comments: the other side’s thread 404s for reading and writing', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const { post, event } = things[owner.id]!;

          const readPost = await http().get(`/api/v1/posts/${post}/comments`).set(viewer.headers).expect(404);
          expect(readPost.body).toEqual(unknown.postThread);
          const writePost = await http()
            .post(`/api/v1/posts/${post}/comments`)
            .set(viewer.headers)
            .send({ body: 'Should not land' })
            .expect(404);
          expect(writePost.body).toEqual(unknown.postThread);

          const readEvent = await http()
            .get(`/api/v1/events/${event.id}/comments`)
            .set(viewer.headers)
            .expect(404);
          expect(readEvent.body).toEqual(unknown.eventThread);
          await http()
            .post(`/api/v1/events/${event.id}/comments`)
            .set(viewer.headers)
            .send({ body: 'Should not land' })
            .expect(404);
        });

        it('comments: on a third person’s post, the other side’s roots and replies are filtered', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const theirs = things[owner.id]!;
          const own = things[viewer.id]!;

          const roots = await http()
            .get(`/api/v1/posts/${thirdPost}/comments`)
            .query({ limit: 50 })
            .set(viewer.headers)
            .expect(200);
          expect(ids(roots)).not.toContain(theirs.commentOnThird);
          expect(ids(roots)).toContain(own.commentOnThird);
          expect(ids(roots)).toContain(thirdRoot);

          const replies = await http()
            .get(`/api/v1/posts/${thirdPost}/comments`)
            .query({ parentId: thirdRoot, limit: 50 })
            .set(viewer.headers)
            .expect(200);
          expect(ids(replies)).not.toContain(theirs.replyOnThird);
          expect(ids(replies)).toContain(own.replyOnThird);

          const detail = await http()
            .get(`/api/v1/comments/${theirs.commentOnThird}`)
            .set(viewer.headers)
            .expect(404);
          expect(detail.body).toEqual(unknown.comment);

          // Replying to the other side's comment: its parent is not there.
          const reply = await http()
            .post(`/api/v1/posts/${thirdPost}/comments`)
            .set(viewer.headers)
            .send({ body: 'Reply to a hidden parent', parentId: theirs.commentOnThird })
            .expect(404);
          expect(reply.body.code).toBe('PARENT_COMMENT_NOT_FOUND');

          // The third person's thread itself stays writable.
          await comment(viewer, thirdPost);
        });

        it('reactions: every reaction route on the other side’s content is a 404', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const theirs = things[owner.id]!;
          const targets = [
            `/api/v1/posts/${theirs.post}/reactions`,
            `/api/v1/comments/${theirs.commentOnThird}/reactions`,
            `/api/v1/events/${theirs.event.id}/reactions`,
          ];
          for (const path of targets) {
            const put = await http().put(path).set(viewer.headers).send({ kind: 'like' }).expect(404);
            expect(put.body.code).toBe('REACTION_TARGET_NOT_FOUND');
            await http().get(path).set(viewer.headers).expect(404);
            await http().delete(path).set(viewer.headers).expect(404);
          }
          const post = await http()
            .put(`/api/v1/posts/${theirs.post}/reactions`)
            .set(viewer.headers)
            .send({ kind: 'like' })
            .expect(404);
          expect(post.body).toEqual(unknown.reaction);
        });

        it('CR-8: a third person’s comment inside the other side’s thread is a 404', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const theirs = things[owner.id]!;
          for (const id of [theirs.thirdOnPost, theirs.thirdOnEvent]) {
            const res = await http().get(`/api/v1/comments/${id}`).set(viewer.headers).expect(404);
            expect(res.body).toEqual(unknown.comment);
            const reacted = await http()
              .put(`/api/v1/comments/${id}/reactions`)
              .set(viewer.headers)
              .send({ kind: 'like' })
              .expect(404);
            expect(reacted.body.code).toBe('REACTION_TARGET_NOT_FOUND');
          }
        });

        it('CR-8: the attendee list of the other side’s event is a 404 like an unknown occurrence', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const res = await attendeeList(things[owner.id]!.event.occurrenceId, viewer).expect(404);
          expect(res.body).toEqual(unknown.attendees);
        });

        it('profile: 404 identical to a handle nobody holds', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const res = await http().get(`/api/v1/profiles/${owner.handle}`).set(viewer.headers).expect(404);
          expect(res.body).toEqual(unknown.profile);
          // Their own profile is unaffected.
          await http().get(`/api/v1/profiles/${viewer.handle}`).set(viewer.headers).expect(200);
        });

        /**
         * AC-13 as amended by acceptance Q-A1: a pair that already has a thread
         * gets it back (201, like a declined pair), and sending is refused both
         * ways. The no-thread case is the FU-1 test further down.
         */
        it('direct messages: the old thread comes back, sending is refused, history readable', async () => {
          const [viewer, owner] = [viewerOf(), ownerOf()];
          const refused = { code: 'CONVERSATION_REQUEST_REFUSED', messageKey: 'errors.chat.requestRefused' };

          const opened = await openDirect(viewer, owner).expect(201);
          expect(opened.body.data.id).toBe(directId);

          const sent = await send(directId, viewer).expect(403);
          expect(sent.body).toEqual(refused);

          const history = await http()
            .get(`/api/v1/conversations/${directId}/messages`)
            .set(viewer.headers)
            .expect(200);
          expect(history.body.data.items.length).toBeGreaterThan(0);
        });
      });
    }

    it('AC-15: an RSVP made before the block is untouched', async () => {
      const occurrenceId = things[a.id]!.event.occurrenceId;
      const own = await http().get(`/api/v1/occurrences/${occurrenceId}/rsvps/me`).set(b.headers).expect(200);
      expect(own.body.data.status).toBe('confirmed');
      const { rows } = await pool.query<{ status: string }>(
        `SELECT status FROM rsvps WHERE occurrence_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [occurrenceId, b.id],
      );
      expect(rows.map((r) => r.status)).toEqual(['confirmed']);
    });

    it('AC-14: a third person still sees both sides everywhere', async () => {
      const roots = await http()
        .get(`/api/v1/posts/${thirdPost}/comments`)
        .query({ limit: 50 })
        .set(c.headers)
        .expect(200);
      expect(ids(roots)).toEqual(
        expect.arrayContaining([things[a.id]!.commentOnThird, things[b.id]!.commentOnThird]),
      );

      const replies = await http()
        .get(`/api/v1/posts/${thirdPost}/comments`)
        .query({ parentId: thirdRoot, limit: 50 })
        .set(c.headers)
        .expect(200);
      expect(ids(replies)).toEqual(
        expect.arrayContaining([things[a.id]!.replyOnThird, things[b.id]!.replyOnThird]),
      );

      const attendees = await http()
        .get(`/api/v1/occurrences/${thirdEvent.occurrenceId}/rsvps`)
        .set(c.headers)
        .expect(200);
      expect((attendees.body.data as Array<{ userId: string }>).map((p) => p.userId)).toEqual(
        expect.arrayContaining([a.id, b.id]),
      );

      for (const who of [a, b]) {
        await http().get(`/api/v1/comments/${things[who.id]!.thirdOnPost}`).set(c.headers).expect(200);
        await http().get(`/api/v1/comments/${things[who.id]!.thirdOnEvent}`).set(c.headers).expect(200);
        await attendeeList(things[who.id]!.event.occurrenceId, c).expect(200);
        await http().get(`/api/v1/events/${things[who.id]!.event.id}`).set(c.headers).expect(200);
        await http().get(`/api/v1/posts/${things[who.id]!.post}`).set(c.headers).expect(200);
        await http().get(`/api/v1/profiles/${who.handle}`).set(c.headers).expect(200);
      }
    });

    it('guests are unaffected', async () => {
      for (const who of [a, b]) {
        await http().get(`/api/v1/events/${things[who.id]!.event.id}`).expect(200);
        await http().get(`/api/v1/posts/${things[who.id]!.post}`).expect(200);
        await http().get(`/api/v1/profiles/${who.handle}`).expect(200);
        await http().get(`/api/v1/posts/${things[who.id]!.post}/comments`).expect(200);
      }
      const feed = await http().get('/api/v1/posts').query({ areaId, limit: 50 }).expect(200);
      expect(ids(feed)).toEqual(expect.arrayContaining([things[a.id]!.post, things[b.id]!.post]));
    });

    it('AC-16: after unblocking, every surface comes back on the next request', async () => {
      await unblock(a, b.id).expect(204);

      for (const [viewer, owner] of [[b, a], [a, b]] as const) {
        const theirs = things[owner.id]!;
        await http().get(`/api/v1/events/${theirs.event.id}`).set(viewer.headers).expect(200);
        const list = await http().get('/api/v1/events').query({ areaId, limit: 50 }).set(viewer.headers).expect(200);
        expect(ids(list)).toContain(theirs.event.id);
        await http().get(`/api/v1/posts/${theirs.post}`).set(viewer.headers).expect(200);
        await http().get(`/api/v1/comments/${theirs.commentOnThird}`).set(viewer.headers).expect(200);
        await http().get(`/api/v1/posts/${theirs.post}/comments`).set(viewer.headers).expect(200);
        await http().get(`/api/v1/profiles/${owner.handle}`).set(viewer.headers).expect(200);
        await http().put(`/api/v1/posts/${theirs.post}/reactions`).set(viewer.headers).send({ kind: 'like' }).expect(200);

        const attendees = await http()
          .get(`/api/v1/occurrences/${thirdEvent.occurrenceId}/rsvps`)
          .set(viewer.headers)
          .expect(200);
        expect((attendees.body.data as Array<{ userId: string }>).map((p) => p.userId)).toContain(owner.id);

        await http().get(`/api/v1/comments/${theirs.thirdOnPost}`).set(viewer.headers).expect(200);
        await http().get(`/api/v1/comments/${theirs.thirdOnEvent}`).set(viewer.headers).expect(200);
        await attendeeList(theirs.event.occurrenceId, viewer).expect(200);

        await send(directId, viewer).expect(201);
      }

      // A was never registered at B's event, so the join now goes through.
      await join(things[b.id]!.event.occurrenceId, a).expect(201);
    });
  });

  it('the effect does not depend on which side wrote the row', async () => {
    const [x, y] = [await actor(), await actor()];
    const post = await createPost(x);
    // Y blocks X: X (the blocked side) is the one reading here.
    await block(y, x.id).expect(204);
    await http().get(`/api/v1/profiles/${y.handle}`).set(x.headers).expect(404);
    await http().get(`/api/v1/posts/${post}`).set(y.headers).expect(404);
    // Only the blocker can lift it: X's unblock touches nothing.
    await unblock(x, y.id).expect(204);
    expect(await blockCount(y.id, x.id)).toBe(1);
    await http().get(`/api/v1/profiles/${y.handle}`).set(x.headers).expect(404);
  });

  /* --------------------------------------- chat "blocked" answer (D5) */

  /* ---------------- FU-1 (Q-A1): opening a direct thread across a block */

  it('FU-1: a blocked pair with no thread gets the unknown-user answer, and nothing is written', async () => {
    const [blocker, blocked] = [await actor(), await actor()];
    const probe = await actor();
    const unknownRecipient = (await openDirect(probe, { ...probe, id: unknownId() }).expect(404))
      .body as unknown;
    expect(unknownRecipient).toEqual({
      code: 'PROFILE_NOT_FOUND',
      messageKey: 'errors.profile.notFound',
    });

    await block(blocker, blocked.id).expect(204);

    for (const [from, to] of [[blocked, blocker], [blocker, blocked]] as const) {
      const res = await openDirect(from, to).expect(404);
      expect(res.body).toEqual(unknownRecipient);
    }

    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM conversations
        WHERE type = 'direct'
          AND user_a_id = LEAST($1::uuid, $2::uuid) AND user_b_id = GREATEST($1::uuid, $2::uuid)`,
      [blocker.id, blocked.id],
    );
    expect(rows[0]?.n).toBe(0);
    // No invitation reaches the blocker's inbox.
    const inbox = await http().get('/api/v1/conversations').set(blocker.headers).expect(200);
    expect(inbox.body.data.items).toEqual([]);

    // Once unblocked, the pair can open a thread as normal.
    await unblock(blocker, blocked.id).expect(204);
    await openDirect(blocked, blocker).expect(201);
  });

  it('FU-1: a deleted recipient gets the same fixed 404', async () => {
    const [from, gone] = [await actor(), await actor()];
    await pool.query(`UPDATE users SET deleted_at = now() WHERE id = $1`, [gone.id]);
    const res = await openDirect(from, gone).expect(404);
    expect(res.body).toEqual({ code: 'PROFILE_NOT_FOUND', messageKey: 'errors.profile.notFound' });
    await pool.query(`UPDATE users SET deleted_at = NULL WHERE id = $1`, [gone.id]);
  });

  /* ------------ FU-2 (TR-6): an event's group room follows the event */

  describe('FU-2: event group room of an event that is not published', () => {
    let organizer: Actor;
    let member: Actor;
    let event: { id: string; occurrenceId: string };
    let roomId: string;
    let unknownRoom: unknown;
    const closed = { code: 'CONVERSATION_CLOSED', messageKey: 'errors.chat.conversationClosed' };

    const joinRoom = (id: string, who: Actor) =>
      http().post(`/api/v1/conversations/${id}/participants`).set(who.headers);
    const setStatus = (status: string) =>
      pool.query(`UPDATE events SET status = $2 WHERE id = $1`, [event.id, status]);

    beforeAll(async () => {
      [organizer, member] = [await actor(), await actor()];
      event = await publishEvent(organizer);
      const room = await http()
        .post('/api/v1/conversations')
        .set(organizer.headers)
        .send({ type: 'event_group', eventId: event.id })
        .expect(201);
      roomId = room.body.data.id;
      await joinRoom(roomId, member).expect(201);
      await send(roomId, member).expect(201);
      await send(roomId, organizer).expect(201);
      unknownRoom = (await joinRoom(unknownId(), member).expect(404)).body as unknown;
      expect(unknownRoom).toEqual({
        code: 'CONVERSATION_NOT_FOUND',
        messageKey: 'errors.chat.conversationNotFound',
      });
    });

    for (const status of ['suspended', 'taken_down'] as const) {
      it(`${status}: joining 404s, sending is refused for everyone, history stays readable`, async () => {
        await setStatus(status);
        try {
          const newcomer = await actor();
          const joined = await joinRoom(roomId, newcomer).expect(404);
          expect(joined.body).toEqual(unknownRoom);

          for (const who of [member, organizer]) {
            const sent = await send(roomId, who).expect(403);
            expect(sent.body).toEqual(closed);
            const history = await http()
              .get(`/api/v1/conversations/${roomId}/messages`)
              .set(who.headers)
              .expect(200);
            expect(history.body.data.items.length).toBeGreaterThanOrEqual(2);
          }
        } finally {
          await setStatus('published');
        }
      });
    }

    it('reopens when the event is restored', async () => {
      await setStatus('taken_down');
      await setStatus('published');
      await send(roomId, member).expect(201);
      await send(roomId, organizer).expect(201);
      await joinRoom(roomId, await actor()).expect(201);
    });

    it('a direct thread cannot be joined as if it were a room', async () => {
      const [x, y, outsider] = [await actor(), await actor(), await actor()];
      const opened = await openDirect(x, y).expect(201);
      const res = await joinRoom(opened.body.data.id, outsider).expect(404);
      expect(res.body).toEqual(unknownRoom);
    });
  });

  /* --------------- FU-5 (Q-A5a): comments under a hidden or removed post */

  it('FU-5: a comment under a hidden or removed post is a 404 to everyone but the post author', async () => {
    const [author, commenter, third] = [await actor(), await actor(), await actor()];
    const post = await createPost(author);
    const id = await comment(commenter, post);

    for (const status of ['hidden', 'removed'] as const) {
      await pool.query(`UPDATE posts SET status = $2 WHERE id = $1`, [post, status]);
      try {
        for (const who of [third, commenter]) {
          const detail = await http().get(`/api/v1/comments/${id}`).set(who.headers).expect(404);
          expect(detail.body).toEqual(unknown.comment);
          const list = await http().get(`/api/v1/posts/${post}/comments`).set(who.headers).expect(404);
          expect(list.body).toEqual(unknown.postThread);
          await http().put(`/api/v1/comments/${id}/reactions`).set(who.headers).send({ kind: 'like' }).expect(404);
        }
        const guest = await http().get(`/api/v1/comments/${id}`).expect(404);
        expect(guest.body).toEqual(unknown.comment);
        // The post author keeps the access the post rule gives them.
        await http().get(`/api/v1/comments/${id}`).set(author.headers).expect(200);
      } finally {
        await pool.query(`UPDATE posts SET status = 'visible' WHERE id = $1`, [post]);
      }
    }

    // Visible again: exactly as before, for members and guests.
    await http().get(`/api/v1/comments/${id}`).set(third.headers).expect(200);
    await http().get(`/api/v1/comments/${id}`).expect(200);
  });

  it('answering a request with "blocked" also blocks the requester globally', async () => {
    const [requester, recipient] = [await actor(), await actor()];
    const opened = await openDirect(requester, recipient).expect(201);
    const id: string = opened.body.data.id;

    await http()
      .put(`/api/v1/conversations/${id}/request`)
      .set(recipient.headers)
      .send({ decision: 'blocked' })
      .expect(200);

    expect(await blockCount(recipient.id, requester.id)).toBe(1);
    await http().get(`/api/v1/profiles/${recipient.handle}`).set(requester.headers).expect(404);

    // Unblocking lifts the global block but does not reopen the closed thread.
    await unblock(recipient, requester.id).expect(204);
    await http().get(`/api/v1/profiles/${recipient.handle}`).set(requester.headers).expect(200);
    const thread = await http().get(`/api/v1/conversations/${id}`).set(recipient.headers).expect(200);
    expect(thread.body.data.status).toBe('closed');
    expect(thread.body.data.requestStatus).toBe('blocked');
  });

  /* ------------------------------- AC-31: editing content under moderation */

  describe('editing hidden content', () => {
    const conflict = {
      code: 'CONTENT_UNDER_MODERATION',
      messageKey: 'errors.content.underModeration',
    };

    it('refuses the author’s edit of a hidden or removed post with 409, changing nothing', async () => {
      const [author, stranger] = [await actor(), await actor()];
      for (const status of ['hidden', 'removed'] as const) {
        const post = await createPost(author);
        await pool.query(`UPDATE posts SET status = $2 WHERE id = $1`, [post, status]);

        const res = await http()
          .patch(`/api/v1/posts/${post}`)
          .set(author.headers)
          .send({ body: 'Rewriting the evidence' })
          .expect(409);
        expect(res.body).toEqual(conflict);

        const { rows } = await pool.query<{ body: string; is_edited: boolean }>(
          `SELECT body, is_edited FROM posts WHERE id = $1`,
          [post],
        );
        expect(rows[0]?.body).not.toBe('Rewriting the evidence');
        expect(rows[0]?.is_edited).toBe(false);

        // Ownership is still checked first: a stranger gets the old 403.
        await http()
          .patch(`/api/v1/posts/${post}`)
          .set(stranger.headers)
          .send({ body: 'Not mine' })
          .expect(403);
      }
    });

    it('still lets the author delete a hidden post (BA #10)', async () => {
      const author = await actor();
      const post = await createPost(author);
      await pool.query(`UPDATE posts SET status = 'hidden' WHERE id = $1`, [post]);
      await http().delete(`/api/v1/posts/${post}`).set(author.headers).expect(204);
    });

    it('refuses the author’s edit of a hidden comment with 409', async () => {
      const author = await actor();
      const post = await createPost(author);
      const id = await comment(author, post);
      await pool.query(`UPDATE comments SET status = 'hidden' WHERE id = $1`, [id]);

      const res = await http()
        .patch(`/api/v1/comments/${id}`)
        .set(author.headers)
        .send({ body: 'Rewriting the evidence' })
        .expect(409);
      expect(res.body).toEqual(conflict);
    });

    it('leaves editing of visible content as it was', async () => {
      const author = await actor();
      const post = await createPost(author);
      await http().patch(`/api/v1/posts/${post}`).set(author.headers).send({ body: 'An honest edit' }).expect(200);
      const id = await comment(author, post);
      await http().patch(`/api/v1/comments/${id}`).set(author.headers).send({ body: 'An honest edit' }).expect(200);
    });
  });

  /* ---------- CR-2: an event's thread, reactions and attendees follow the event */

  /**
   * Everything hanging off an event obeys the GET /events/:id rule: when the
   * event is suspended, taken down, or a draft that is not yours, its comment
   * thread, comment detail, reactions and attendee list answer the
   * unknown-id 404 — for members and guests alike. The organizer keeps
   * access, as they do to the event itself.
   */
  describe('CR-2: surfaces follow the event’s visibility', () => {
    let organizer: Actor;
    let member: Actor;
    let event: { id: string; occurrenceId: string };
    let eventCommentId: string;

    beforeAll(async () => {
      [organizer, member] = [await actor(), await actor()];
      event = await publishEvent(organizer);
      eventCommentId = await eventComment(member, event.id);
      await join(event.occurrenceId, member).expect(201);
    });

    const setStatus = (status: string) =>
      pool.query(`UPDATE events SET status = $2 WHERE id = $1`, [event.id, status]);

    /** Every event-bound read and write, as `who` (null = guest). */
    const expectAllHidden = async (who: Actor | null) => {
      const as = (req: request.Test) => (who ? req.set(who.headers) : req);

      const thread = await as(http().get(`/api/v1/events/${event.id}/comments`)).expect(404);
      expect(thread.body).toEqual(unknown.eventThread);
      const detail = await as(http().get(`/api/v1/comments/${eventCommentId}`)).expect(404);
      expect(detail.body).toEqual(unknown.comment);
      await as(http().get(`/api/v1/events/${event.id}/reactions`)).expect(404);
      await as(http().get(`/api/v1/comments/${eventCommentId}/reactions`)).expect(404);

      if (who) {
        await http()
          .post(`/api/v1/events/${event.id}/comments`)
          .set(who.headers)
          .send({ body: 'Should not land' })
          .expect(404);
        await http().put(`/api/v1/events/${event.id}/reactions`).set(who.headers).send({ kind: 'like' }).expect(404);
        await http().delete(`/api/v1/events/${event.id}/reactions`).set(who.headers).expect(404);
        await http()
          .put(`/api/v1/comments/${eventCommentId}/reactions`)
          .set(who.headers)
          .send({ kind: 'like' })
          .expect(404);
        const list = await attendeeList(event.occurrenceId, who).expect(404);
        expect(list.body).toEqual(unknown.attendees);
      }
    };

    const expectOrganizerKeepsAccess = async () => {
      await http().get(`/api/v1/events/${event.id}/comments`).set(organizer.headers).expect(200);
      await http().get(`/api/v1/comments/${eventCommentId}`).set(organizer.headers).expect(200);
      await http().get(`/api/v1/events/${event.id}/reactions`).set(organizer.headers).expect(200);
      await attendeeList(event.occurrenceId, organizer).expect(200);
    };

    it('leaves a published event exactly as before, for members and guests', async () => {
      const list = await http().get(`/api/v1/events/${event.id}/comments`).expect(200);
      expect(ids(list)).toContain(eventCommentId);
      await http().get(`/api/v1/comments/${eventCommentId}`).expect(200);
      await http().get(`/api/v1/events/${event.id}/reactions`).expect(200);
      await http().put(`/api/v1/events/${event.id}/reactions`).set(member.headers).send({ kind: 'like' }).expect(200);
      await http().delete(`/api/v1/events/${event.id}/reactions`).set(member.headers).expect(204);
      const people = await attendeeList(event.occurrenceId, member).expect(200);
      expect((people.body.data as Array<{ userId: string }>).map((p) => p.userId)).toContain(member.id);
    });

    for (const status of ['suspended', 'taken_down'] as const) {
      it(`closes everything on a ${status} event except for its organizer`, async () => {
        await setStatus(status);
        try {
          await http().get(`/api/v1/events/${event.id}`).set(member.headers).expect(404);
          await expectAllHidden(member);
          await expectAllHidden(null);
          await expectOrganizerKeepsAccess();
        } finally {
          await setStatus('published');
        }
      });
    }

    it('treats a draft that is not yours the same way', async () => {
      const draft = await http()
        .post('/api/v1/events')
        .set(organizer.headers)
        .send({
          title: `Draft probe ${randomUUID().slice(0, 8)}`,
          areaId,
          lat: 16.06,
          lng: 108.247,
          startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          capacity: 5,
        })
        .expect(201);
      const id: string = draft.body.data.id;

      const thread = await http().get(`/api/v1/events/${id}/comments`).set(member.headers).expect(404);
      expect(thread.body).toEqual(unknown.eventThread);
      await http().put(`/api/v1/events/${id}/reactions`).set(member.headers).send({ kind: 'like' }).expect(404);
      await attendeeList(draft.body.data.occurrenceId, member).expect(404);

      // The organizer works on their own draft as before.
      await eventComment(organizer, id);
      await http().put(`/api/v1/events/${id}/reactions`).set(organizer.headers).send({ kind: 'like' }).expect(200);
    });

    it('opens everything again once the event is restored', async () => {
      await setStatus('taken_down');
      await setStatus('published');
      await http().get(`/api/v1/events/${event.id}/comments`).set(member.headers).expect(200);
      await http().get(`/api/v1/comments/${eventCommentId}`).expect(200);
      await attendeeList(event.occurrenceId, member).expect(200);
    });
  });
});
