import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  envelope,
  ModerationQueueResponse,
  ModerationTicketDetailResponse,
} from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';
import {
  collectQueue,
  createEventComment,
  createPost,
  http,
  NOTE,
  openDb,
  openTicket,
  publishEvent,
  ReporterPool,
} from './moderation-fixtures.js';

const QUEUE = '/api/v1/admin/moderation/queue';
const ticketPath = (id: string) => `/api/v1/admin/moderation/tickets/${id}`;

/**
 * GET queue + ticket detail — T-API-2 (task board D10, D14, D15).
 *
 * AC-18, AC-21, AC-22, AC-23 (API), AC-26 (hidden + 403 detail), AC-27,
 * AC-29, AC-39 (GET), AC-41.
 */
describe('moderation queue', () => {
  let app: INestApplication;
  let db: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let author: Actor; // B
  let member: Actor; // A
  let curator: Actor;
  let moderator: Actor; // M
  let moderator2: Actor; // M2
  let admin: Actor; // AD
  let superAdmin: Actor; // SA
  let reporters: ReporterPool;

  const ticketFor = async (
    targetType: 'event' | 'post' | 'comment' | 'user',
    targetId: string,
    reason: string,
    reporter: Actor = reporters.next(),
  ) => openTicket(app, db, reporter, { targetType, targetId, reason });

  const newPostTicket = async (reason: string, body = 'Selling concert tickets, DM me.') =>
    ticketFor('post', await createPost(app, author, areaId, body), reason);

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = openDb();
    author = await createActor(app);
    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    moderator2 = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });
    reporters = new ReporterPool([
      await createActor(app, { trustLevel: 3 }),
      await createActor(app, { trustLevel: 3 }),
    ]);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await cleanup();
  });

  describe('access (AC-21, AC-39)', () => {
    it('401 without a token', async () => {
      await http(app).get(QUEUE).expect(401);
      await http(app).get(ticketPath(unknownId())).expect(401);
    });

    it.each([
      ['member', () => member],
      ['curator', () => curator],
    ] as const)('403 ROLE_NOT_ALLOWED for a %s', async (_role, actor) => {
      for (const path of [QUEUE, ticketPath(unknownId())]) {
        const res = await http(app).get(path).set(actor().headers).expect(403);
        expect(res.body).toEqual({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' });
      }
    });

    it.each([
      ['moderator', () => moderator],
      ['admin', () => admin],
      ['super_admin', () => superAdmin],
    ] as const)('200 for a %s, with the server clock', async (_role, actor) => {
      const res = await http(app).get(QUEUE).set(actor().headers).expect(200);
      const parsed = envelope(ModerationQueueResponse).parse(res.body);
      expect(Math.abs(Date.parse(parsed.data.serverTime) - Date.now())).toBeLessThan(60_000);
    });

    it('404 MODERATION_TICKET_NOT_FOUND for an unknown ticket', async () => {
      const res = await http(app).get(ticketPath(unknownId())).set(moderator.headers).expect(404);
      expect(res.body).toEqual({
        code: 'MODERATION_TICKET_NOT_FOUND',
        messageKey: 'errors.moderation.ticketNotFound',
      });
    });
  });

  describe('ordering and filters (AC-22)', () => {
    it('orders P0 before P2 before P3, then longest waiting first; the P0 filter returns only P0', async () => {
      const p2At8 = await newPostTicket('spam', 'Cheap visa runs, message me.');
      const p0At9 = await newPostTicket('danger', 'Meet me alone at the pier tonight.');
      const p0At830 = await newPostTicket('scam', 'Send a deposit to reserve your seat.');
      const p3At7 = await newPostTicket('other', 'Wrong category for this post.');

      // Fixed, far-past clocks so the relative order is deterministic.
      const setClock = (id: string, at: string, hours: number) =>
        db.query(
          `UPDATE moderation_tickets
              SET first_reported_at = $2::timestamptz, last_reported_at = $2::timestamptz,
                  sla_due_at = $2::timestamptz + make_interval(hours => $3)
            WHERE id = $1`,
          [id, at, hours],
        );
      await setClock(p2At8, '2020-01-01T08:00:00Z', 48);
      await setClock(p0At9, '2020-01-01T09:00:00Z', 2);
      await setClock(p0At830, '2020-01-01T08:30:00Z', 2);
      await setClock(p3At7, '2020-01-01T07:00:00Z', 72);

      const mine = new Set([p2At8, p0At9, p0At830, p3At7]);
      // A small page size so the keyset cursor is exercised across pages.
      const all = await collectQueue(app, moderator, {}, 2);
      const ids = all.map((item) => item.id as string);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.filter((id) => mine.has(id))).toEqual([p0At830, p0At9, p2At8, p3At7]);

      const critical = await collectQueue(app, moderator, { severity: 'critical' });
      expect(critical.every((item) => item.severity === 'critical')).toBe(true);
      expect(critical.map((item) => item.id).filter((id) => mine.has(id as string))).toEqual([
        p0At830,
        p0At9,
      ]);
    });
  });

  describe('SLA deadlines (AC-23, API)', () => {
    it.each([
      ['danger', 'critical', 2],
      ['hate', 'high', 12],
      ['spam', 'normal', 48],
      ['other', 'low', 72],
    ] as const)('%s opens a %s ticket due %i hours after the first report', async (reason, severity, hours) => {
      const id = await newPostTicket(reason, `A post reported for ${reason}.`);
      const res = await http(app).get(ticketPath(id)).set(moderator.headers).expect(200);
      const detail = envelope(ModerationTicketDetailResponse).parse(res.body).data;
      expect(detail.severity).toBe(severity);
      expect(Date.parse(detail.slaDueAt) - Date.parse(detail.firstReportedAt)).toBe(
        hours * 60 * 60 * 1000,
      );
    });
  });

  describe('conflict of interest (AC-26)', () => {
    const expectConflict = async (ticketId: string, conflicted: Actor) => {
      const queue = await collectQueue(app, conflicted);
      expect(queue.some((item) => item.id === ticketId)).toBe(false);
      const res = await http(app).get(ticketPath(ticketId)).set(conflicted.headers).expect(403);
      expect(res.body).toEqual({
        code: 'CONFLICT_OF_INTEREST',
        messageKey: 'errors.moderation.conflictOfInterest',
      });
      // Somebody without the conflict sees and opens it normally.
      const other = await collectQueue(app, moderator2);
      expect(other.some((item) => item.id === ticketId)).toBe(true);
      await http(app).get(ticketPath(ticketId)).set(moderator2.headers).expect(200);
    };

    it('hides a ticket the moderator reported in', async () => {
      const post = await createPost(app, author, areaId, 'Bring cash only, no receipts.');
      const id = await ticketFor('post', post, 'scam', moderator);
      await expectConflict(id, moderator);
    });

    it('hides a ticket on the moderator’s own content', async () => {
      const post = await createPost(app, moderator, areaId, 'Moderator’s own question post.');
      const id = await ticketFor('post', post, 'spam');
      await expectConflict(id, moderator);
    });

    it('hides a ticket on a comment under an event the moderator organizes', async () => {
      const { eventId } = await publishEvent(app, moderator, areaId, 'Staff-run volleyball');
      const comment = await createEventComment(app, author, eventId, 'Buy followers cheap here!');
      const id = await ticketFor('comment', comment, 'spam');
      await expectConflict(id, moderator);
    });
  });

  describe('detail (AC-27, AC-18)', () => {
    it('shows the snapshot as reported even after the author edits and then deletes the post', async () => {
      const original = 'Original text: pay me first and I will hold your spot.';
      const post = await createPost(app, author, areaId, original);
      const reporterA = reporters.next();
      const reporterB = reporters.next();
      const id = await openTicket(app, db, reporterA, {
        targetType: 'post',
        targetId: post,
        reason: 'scam',
        description: 'Asked me to pay by bank transfer.',
      });
      await openTicket(app, db, reporterB, { targetType: 'post', targetId: post, reason: 'spam' });

      await http(app)
        .patch(`/api/v1/posts/${post}`)
        .set(author.headers)
        .send({ body: 'Edited to look innocent.' })
        .expect(200);
      await http(app).delete(`/api/v1/posts/${post}`).set(author.headers).expect(204);

      const res = await http(app).get(ticketPath(id)).set(moderator.headers).expect(200);
      const detail = envelope(ModerationTicketDetailResponse).parse(res.body).data;
      expect(detail.reportCount).toBe(2);
      expect(detail.reasons).toEqual(['scam', 'spam']);
      expect(detail.targetPreview).toBe(original);
      expect(detail.currentTarget.deleted).toBe(true);
      expect(detail.reports).toHaveLength(2);
      expect(detail.reports[0]?.snapshot).toMatchObject({ targetType: 'post', body: original });
      expect(detail.reports[0]?.description).toBe('Asked me to pay by bank transfer.');
      expect(detail.reports.map((r) => r.reporter?.userId)).toEqual([reporterA.id, reporterB.id]);
      expect(detail.targetOwner?.userId).toBe(author.id);
      expect(detail.targetOwner?.role).toBe('member');
      expect(detail.actions).toEqual([]);
      // No contact details of anyone, ever.
      expect(JSON.stringify(res.body)).not.toMatch(/example\.test|"email"|"phone"/);
    });

    it('a member blocking the moderator does not hide their content from the console (AC-18)', async () => {
      const blocker = await createActor(app);
      const post = await createPost(app, blocker, areaId, 'Post by someone who blocked staff.');
      await db.query(`INSERT INTO blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)`, [
        blocker.id,
        moderator.id,
      ]);
      const id = await ticketFor('post', post, 'spam');
      const queue = await collectQueue(app, moderator);
      expect(queue.some((item) => item.id === id)).toBe(true);
      const res = await http(app).get(ticketPath(id)).set(moderator.headers).expect(200);
      expect(res.body.data.reports[0].snapshot.body).toBe('Post by someone who blocked staff.');
    });
  });

  describe('handled tab (AC-29)', () => {
    it('a dismissed ticket leaves the open list and shows under closed with its outcome', async () => {
      const id = await newPostTicket('spam', 'Harmless post that got reported.');
      await http(app)
        .post(`${ticketPath(id)}/dismiss`)
        .set(moderator.headers)
        .send({ reasonCode: 'other', note: NOTE })
        .expect(201);

      const open = await collectQueue(app, moderator2);
      expect(open.some((item) => item.id === id)).toBe(false);
      const closed = await collectQueue(app, moderator2, { status: 'closed' });
      const entry = closed.find((item) => item.id === id);
      expect(entry).toMatchObject({ status: 'dismissed', outcome: 'no_action' });
      expect(typeof entry?.closedAt).toBe('string');

      // Most recently closed first.
      const closedAt = closed.map((item) => Date.parse(item.closedAt as string));
      expect([...closedAt].sort((a, b) => b - a)).toEqual(closedAt);
    });
  });

  describe('staff anonymity (AC-41)', () => {
    it('a moderator sees another moderator only by role; admin and super_admin see who', async () => {
      const id = await newPostTicket('spam', 'Post whose severity gets changed.');
      await http(app)
        .post(`${ticketPath(id)}/severity`)
        .set(moderator2.headers)
        .send({ severity: 'high', reasonCode: 'hate', note: NOTE })
        .expect(201);

      const asModerator = await http(app).get(ticketPath(id)).set(moderator.headers).expect(200);
      const seen = asModerator.body.data.actions[0];
      expect(seen.actor).toEqual({ type: 'staff', role: 'moderator', user: null });

      const asSelf = await http(app).get(ticketPath(id)).set(moderator2.headers).expect(200);
      expect(asSelf.body.data.actions[0].actor.user.userId).toBe(moderator2.id);

      for (const viewer of [admin, superAdmin]) {
        const res = await http(app).get(ticketPath(id)).set(viewer.headers).expect(200);
        expect(res.body.data.actions[0].actor.user.userId).toBe(moderator2.id);
      }
    });
  });
});
