import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, ReportResponse } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';
import {
  countRows,
  createEventComment,
  createPost,
  http,
  idempotencyKey,
  openDb,
  postReport,
  publishEvent,
} from '../moderation/moderation-fixtures.js';

/**
 * POST /api/v1/reports — T-API-1 (brief E8-S1; task board D8, D9).
 *
 * AC-1 (API), AC-2, AC-5, AC-6, AC-7, AC-9, AC-10, AC-11, AC-24, AC-46.
 */
describe('report module', () => {
  let app: INestApplication;
  let db: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let reporter: Actor; // A
  let owner: Actor; // B
  let other: Actor;
  let staff: Actor; // reads the ticket detail

  let eventId: string;
  let postId: string;
  let commentId: string;

  const ticketOf = async (reportId: string) => {
    const { rows } = await db.query<{
      ticket_id: string;
      severity: string;
      report_count: number;
      first_reported_at: Date;
      sla_due_at: Date;
      target_owner_user_id: string;
      related_event_organizer_id: string | null;
    }>(
      `SELECT r.ticket_id, t.severity, t.report_count, t.first_reported_at, t.sla_due_at,
              t.target_owner_user_id, t.related_event_organizer_id
         FROM reports r JOIN moderation_tickets t ON t.id = r.ticket_id
        WHERE r.id = $1`,
      [reportId],
    );
    return rows[0];
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = openDb();
    // T3 (20 a day): this file files more than the T1 allowance through A.
    reporter = await createActor(app, { trustLevel: 3 });
    owner = await createActor(app);
    other = await createActor(app, { trustLevel: 3 });
    staff = await createActor(app, { role: 'moderator' });
    ({ eventId } = await publishEvent(app, owner, areaId, 'Crypto meetup with guaranteed returns'));
    postId = await createPost(app, owner, areaId, 'Selling a scooter, message me for price.');
    commentId = await createEventComment(app, owner, eventId);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await cleanup();
  });

  describe('access (AC-10)', () => {
    it('rejects a missing token with 401', async () => {
      await http(app)
        .post('/api/v1/reports')
        .set('Idempotency-Key', idempotencyKey())
        .send({ targetType: 'post', targetId: postId, reason: 'spam' })
        .expect(401);
    });

    it('rejects a missing Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
      const res = await http(app)
        .post('/api/v1/reports')
        .set(reporter.headers)
        .send({ targetType: 'post', targetId: postId, reason: 'spam' })
        .expect(400);
      expect(res.body).toEqual({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        messageKey: 'errors.common.idempotencyKeyRequired',
      });
    });

    it('rejects a key shorter than 8 characters', async () => {
      await postReport(app, reporter, { targetType: 'post', targetId: postId, reason: 'spam' }, 'short')
        .expect(400);
    });
  });

  describe('filing (AC-1, AC-2)', () => {
    it('reports a published event as scam: 201, receipt only, P0 ticket due in exactly 2 hours', async () => {
      const res = await postReport(app, reporter, {
        targetType: 'event',
        targetId: eventId,
        reason: 'scam',
        description: 'Asks everyone to transfer a deposit first.',
      }).expect(201);

      const parsed = envelope(ReportResponse).parse(res.body);
      expect(parsed.data.status).toBe('received');
      // Nothing about the ticket, severity or other reporters reaches the reporter.
      expect(Object.keys(res.body.data).sort()).toEqual(['createdAt', 'id', 'status']);

      const ticket = await ticketOf(parsed.data.id);
      expect(ticket?.severity).toBe('critical');
      expect(ticket?.target_owner_user_id).toBe(owner.id);
      expect((ticket?.sla_due_at.getTime() ?? 0) - (ticket?.first_reported_at.getTime() ?? 0)).toBe(
        2 * 60 * 60 * 1000,
      );

      const { rows } = await db.query<{ content_snapshot: Record<string, unknown>; description: string }>(
        `SELECT content_snapshot, description FROM reports WHERE id = $1`,
        [parsed.data.id],
      );
      expect(rows[0]?.content_snapshot).toMatchObject({
        title: 'Crypto meetup with guaranteed returns',
        status: 'published',
      });
      expect(rows[0]?.description).toBe('Asks everyone to transfer a deposit first.');
    });

    it.each([
      ['post', () => postId],
      ['comment', () => commentId],
      ['user', () => owner.id],
    ] as const)('reports a %s with the right target type and owner', async (targetType, id) => {
      const res = await postReport(app, reporter, {
        targetType,
        targetId: id(),
        reason: 'spam',
      }).expect(201);
      const { rows } = await db.query<{ target_type: string; target_owner_user_id: string }>(
        `SELECT target_type, target_owner_user_id FROM reports WHERE id = $1`,
        [res.body.data.id],
      );
      expect(rows[0]).toEqual({ target_type: targetType, target_owner_user_id: owner.id });
    });

    it('records the organizer of the event a reported comment sits on (conflict of interest)', async () => {
      const commenter = await createActor(app);
      const onEvent = await createEventComment(app, commenter, eventId, 'Totally legit, I joined.');
      const res = await postReport(app, other, {
        targetType: 'comment',
        targetId: onEvent,
        reason: 'spam',
      }).expect(201);
      const ticket = await ticketOf(res.body.data.id);
      expect(ticket?.related_event_organizer_id).toBe(owner.id);
    });

    it('stores an all-whitespace description as no description', async () => {
      const post = await createPost(app, owner, areaId, 'Second hand books for sale.');
      const res = await postReport(app, reporter, {
        targetType: 'post',
        targetId: post,
        reason: 'other',
        description: '    ',
      }).expect(201);
      const { rows } = await db.query<{ description: string | null }>(
        `SELECT description FROM reports WHERE id = $1`,
        [res.body.data.id],
      );
      expect(rows[0]?.description).toBeNull();
    });
  });

  describe('duplicates (AC-5)', () => {
    it('returns the first report on a retry with the same key and on a second report of the same target', async () => {
      const post = await createPost(app, owner, areaId, 'Room for rent near the beach.');
      const key = idempotencyKey();
      const first = await postReport(app, other, { targetType: 'post', targetId: post, reason: 'spam' }, key)
        .expect(201);
      const replay = await postReport(app, other, { targetType: 'post', targetId: post, reason: 'spam' }, key)
        .expect(201);
      const again = await postReport(app, other, {
        targetType: 'post',
        targetId: post,
        reason: 'other',
      }).expect(201);

      expect(replay.body.data.id).toBe(first.body.data.id);
      expect(again.body.data.id).toBe(first.body.data.id);
      expect(await countRows(db, 'reports WHERE target_id = $1', [post])).toBe(1);
      const ticket = await ticketOf(first.body.data.id);
      expect(ticket?.report_count).toBe(1);
      // A milder duplicate changes nothing on the ticket.
      expect(ticket?.severity).toBe('normal');
    });

    it('a strictly graver reason from the same reporter files a second report in the same ticket (FU-4)', async () => {
      const post = await createPost(app, owner, areaId, 'Seems like spam at first sight.');
      const first = await postReport(app, other, { targetType: 'post', targetId: post, reason: 'spam' })
        .expect(201);
      const opened = await ticketOf(first.body.data.id);
      expect(opened?.severity).toBe('normal');

      // The spam report came at T, an hour ago.
      await db.query(
        `UPDATE moderation_tickets
            SET first_reported_at = first_reported_at - interval '1 hour',
                last_reported_at  = last_reported_at  - interval '1 hour',
                sla_due_at        = sla_due_at        - interval '1 hour'
          WHERE id = $1`,
        [opened?.ticket_id],
      );

      const graver = await postReport(app, other, {
        targetType: 'post',
        targetId: post,
        reason: 'danger',
        description: 'He said he would wait for me outside.',
      }).expect(201);
      expect(graver.body.data.id).not.toBe(first.body.data.id);

      // Two rows, each with its own reason and description, in one ticket.
      const { rows } = await db.query<{ reason: string; description: string | null; ticket_id: string }>(
        `SELECT reason::text, description, ticket_id FROM reports WHERE target_id = $1 ORDER BY created_at`,
        [post],
      );
      expect(rows.map((r) => r.reason)).toEqual(['spam', 'danger']);
      expect(rows[1]?.description).toBe('He said he would wait for me outside.');
      expect(new Set(rows.map((r) => r.ticket_id))).toEqual(new Set([opened?.ticket_id]));

      // P0, due T+3h, and still one person.
      const after = await ticketOf(graver.body.data.id);
      expect(after?.severity).toBe('critical');
      expect(after?.report_count).toBe(1);
      const expected = (after?.first_reported_at.getTime() ?? 0) + 3 * 60 * 60 * 1000;
      expect(Math.abs((after?.sla_due_at.getTime() ?? 0) - expected)).toBeLessThan(5_000);

      // The console shows both reasons; the same reporter on both reports.
      const detail = await http(app)
        .get(`/api/v1/admin/moderation/tickets/${opened?.ticket_id}`)
        .set(staff.headers)
        .expect(200);
      expect(detail.body.data.reasons).toEqual(['danger', 'spam']);
      expect(detail.body.data.reportCount).toBe(1);
      expect(detail.body.data.reports).toHaveLength(2);
      expect(
        new Set(detail.body.data.reports.map((r: { reporter: { userId: string } }) => r.reporter.userId)),
      ).toEqual(new Set([other.id]));

      // Equal or milder from here on is a duplicate of the gravest report (AC-5).
      for (const reason of ['danger', 'scam', 'spam'] as const) {
        const again = await postReport(app, other, { targetType: 'post', targetId: post, reason }).expect(201);
        expect(again.body.data.id).toBe(graver.body.data.id);
      }
      expect(await countRows(db, 'reports WHERE target_id = $1', [post])).toBe(2);
      expect((await ticketOf(first.body.data.id))?.severity).toBe('critical');
    });
  });

  describe('refusals (AC-6)', () => {
    it.each([
      ['event', () => eventId],
      ['post', () => postId],
      ['comment', () => commentId],
      ['user', () => owner.id],
    ] as const)('refuses reporting your own %s with 422 REPORT_SELF_NOT_ALLOWED', async (targetType, id) => {
      const res = await postReport(app, owner, { targetType, targetId: id(), reason: 'spam' }).expect(422);
      expect(res.body).toEqual({
        code: 'REPORT_SELF_NOT_ALLOWED',
        messageKey: 'errors.report.selfNotAllowed',
      });
    });

    it('answers 404 for a target that does not exist', async () => {
      const res = await postReport(app, reporter, {
        targetType: 'post',
        targetId: unknownId(),
        reason: 'spam',
      }).expect(404);
      expect(res.body).toEqual({
        code: 'REPORT_TARGET_NOT_FOUND',
        messageKey: 'errors.report.targetNotFound',
      });
    });

    it('answers 404 for a target the reporter cannot see (a draft event)', async () => {
      const draft = await http(app)
        .post('/api/v1/events')
        .set(owner.headers)
        .send({
          title: 'Unpublished draft',
          areaId,
          lat: 16.06,
          lng: 108.247,
          startsAt: '2027-06-01T09:00:00.000Z',
          capacity: 5,
        })
        .expect(201);
      await postReport(app, reporter, {
        targetType: 'event',
        targetId: draft.body.data.id,
        reason: 'ghost_event',
      }).expect(404);
    });

    it('rejects a description over 2000 characters with 400 carrying the message key', async () => {
      const res = await postReport(app, reporter, {
        targetType: 'post',
        targetId: postId,
        reason: 'other',
        description: 'x'.repeat(2001),
      }).expect(400);
      expect(JSON.stringify(res.body)).toContain('errors.report.descriptionTooLong');
    });

    it('rejects an unknown reason with 400', async () => {
      await postReport(app, reporter, {
        targetType: 'post',
        targetId: postId,
        reason: 'not_a_reason',
      }).expect(400);
    });
  });

  describe('blocking and reporting (AC-4 API, AC-7)', () => {
    it('alsoBlock blocks the owner of the target in the same request', async () => {
      const victim = await createActor(app);
      const harasser = await createActor(app);
      const post = await createPost(app, harasser, areaId, 'You again? I know where you live.');
      await postReport(app, victim, {
        targetType: 'post',
        targetId: post,
        reason: 'harassment',
        alsoBlock: true,
      }).expect(201);
      expect(
        await countRows(db, 'blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2', [
          victim.id,
          harasser.id,
        ]),
      ).toBe(1);
    });

    it('still lets a member report someone they have blocked', async () => {
      const blocker = await createActor(app);
      const blocked = await createActor(app);
      await db.query(`INSERT INTO blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)`, [
        blocker.id,
        blocked.id,
      ]);
      await postReport(app, blocker, {
        targetType: 'user',
        targetId: blocked.id,
        reason: 'impersonation',
      }).expect(201);
    });
  });

  describe('blocked by the owner (CR-1)', () => {
    it('a target whose owner blocked the reporter answers the same 404 as an unknown id', async () => {
      const blocker = await createActor(app);
      const blocked = await createActor(app);
      const { eventId: blockerEvent } = await publishEvent(app, blocker, areaId, 'Blocker’s event');
      const blockerPost = await createPost(app, blocker, areaId, 'Blocker’s own post.');
      const blockerComment = await createEventComment(app, blocker, blockerEvent, 'Blocker comment.');
      // Someone else's comment in the blocker's thread is out of sight too.
      const thirdComment = await createEventComment(app, other, blockerEvent, 'Third-party comment.');
      await db.query(`INSERT INTO blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)`, [
        blocker.id,
        blocked.id,
      ]);

      const unknown = await postReport(app, blocked, {
        targetType: 'post',
        targetId: unknownId(),
        reason: 'spam',
      }).expect(404);

      for (const [targetType, targetId] of [
        ['event', blockerEvent],
        ['post', blockerPost],
        ['comment', blockerComment],
        ['comment', thirdComment],
        ['user', blocker.id],
      ] as const) {
        const res = await postReport(app, blocked, { targetType, targetId, reason: 'spam' }).expect(404);
        expect(res.body).toEqual(unknown.body);
      }
      expect(await countRows(db, 'reports WHERE reporter_user_id = $1', [blocked.id])).toBe(0);

      // The other direction is untouched: the blocker still reports (AC-7).
      await postReport(app, blocker, { targetType: 'user', targetId: blocked.id, reason: 'harassment' })
        .expect(201);
    });
  });

  describe('accounts that are not active (CR-3)', () => {
    it('a suspended account and its content are reported like any other, with the usual receipt', async () => {
      const suspended = await createActor(app);
      const post = await createPost(app, suspended, areaId, 'Post by someone later suspended.');
      await db.query(
        `UPDATE users SET status = 'suspended', suspended_until = now() + interval '7 days'
          WHERE id = $1`,
        [suspended.id],
      );

      const first = await postReport(app, reporter, {
        targetType: 'user',
        targetId: suspended.id,
        reason: 'harassment',
      }).expect(201);
      expect(Object.keys(first.body.data).sort()).toEqual(['createdAt', 'id', 'status']);
      expect(JSON.stringify(first.body)).not.toMatch(/suspend|active/i);

      // A second voice merges into the same ticket.
      const second = await postReport(app, other, {
        targetType: 'user',
        targetId: suspended.id,
        reason: 'impersonation',
      }).expect(201);
      const ticket = await ticketOf(second.body.data.id);
      expect(ticket?.ticket_id).toBe((await ticketOf(first.body.data.id))?.ticket_id);
      expect(ticket?.report_count).toBe(2);

      await postReport(app, reporter, { targetType: 'post', targetId: post, reason: 'spam' }).expect(201);
    });

    it('a deleted account is still not found', async () => {
      const gone = await createActor(app);
      await db.query(`UPDATE users SET status = 'deleted', deleted_at = now() WHERE id = $1`, [gone.id]);
      await postReport(app, reporter, { targetType: 'user', targetId: gone.id, reason: 'spam' }).expect(404);
    });
  });

  describe('rate limit (AC-9)', () => {
    /**
     * Pre-fills the sliding window with `n` reports filed "just now" against
     * throwaway targets, so the spec reaches the threshold without creating
     * dozens of real posts. They sit in one ticket owned by `owner`, which
     * the harness teardown removes.
     */
    const prefill = async (reporterId: string, n: number) => {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO moderation_tickets
           (target_type, target_id, target_owner_user_id, severity,
            first_reported_at, last_reported_at, sla_due_at)
         VALUES ('post', $1, $2, 'low', now(), now(), now() + interval '72 hours')
         RETURNING id`,
        [randomUUID(), owner.id],
      );
      const ticketId = rows[0]?.id as string;
      for (let i = 0; i < n; i += 1) {
        await db.query(
          `INSERT INTO reports
             (ticket_id, reporter_user_id, target_type, target_id, target_owner_user_id,
              reason, severity, content_snapshot, idempotency_key)
           VALUES ($1, $2, 'post', $3, $4, 'other', 'low', '{}'::jsonb, $5)`,
          [ticketId, reporterId, randomUUID(), owner.id, idempotencyKey()],
        );
      }
    };

    it.each([
      [1, 5],
      [2, 10],
      [3, 20],
    ] as const)('T%i: report %i is accepted and the next answers 429 with Retry-After', async (trust, limit) => {
      const member = await createActor(app, { trustLevel: trust });
      await prefill(member.id, limit - 1);
      const last = await createPost(app, owner, areaId, `Post number one for T${trust}`);
      const over = await createPost(app, owner, areaId, `Post number two for T${trust}`);

      await postReport(app, member, { targetType: 'post', targetId: last, reason: 'spam' }).expect(201);
      const res = await postReport(app, member, {
        targetType: 'post',
        targetId: over,
        reason: 'spam',
      }).expect(429);

      expect(res.body.code).toBe('RATE_LIMITED');
      expect(res.body.messageKey).toBe('errors.report.rateLimited');
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(24 * 60 * 60);
      expect(res.body.details.retryAfterSeconds).toBe(retryAfter);
      expect(await countRows(db, 'reports WHERE target_id = $1', [over])).toBe(0);
    });

    it('an escalation report counts against the allowance (FU-4)', async () => {
      const member = await createActor(app);
      await prefill(member.id, 4);
      const post = await createPost(app, owner, areaId, 'Looks like spam, turns out worse.');
      await postReport(app, member, { targetType: 'post', targetId: post, reason: 'spam' }).expect(201);
      // Sixth report of the day, even though it is an escalation of the fifth.
      const res = await postReport(app, member, {
        targetType: 'post',
        targetId: post,
        reason: 'danger',
      }).expect(429);
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(await countRows(db, 'reports WHERE target_id = $1', [post])).toBe(1);
    });

    it('T0 gets the T1 allowance', async () => {
      const newcomer = await createActor(app, { trustLevel: 0 });
      await prefill(newcomer.id, 5);
      await postReport(app, newcomer, { targetType: 'post', targetId: postId, reason: 'spam' }).expect(429);
    });

    it('a retry of an accepted report still answers 201 after the limit is reached', async () => {
      const member = await createActor(app);
      await prefill(member.id, 4);
      const post = await createPost(app, owner, areaId, 'Bike repair recommendations?');
      const key = idempotencyKey();
      const first = await postReport(app, member, { targetType: 'post', targetId: post, reason: 'spam' }, key)
        .expect(201);
      const retry = await postReport(app, member, { targetType: 'post', targetId: post, reason: 'spam' }, key)
        .expect(201);
      expect(retry.body.data.id).toBe(first.body.data.id);
    });
  });

  describe('merging (AC-24)', () => {
    it('a harassment report an hour after a spam report raises the ticket to P0, due at T+3h', async () => {
      const post = await createPost(app, owner, areaId, 'Weekly language exchange at the cafe.');
      const first = await postReport(app, reporter, { targetType: 'post', targetId: post, reason: 'spam' })
        .expect(201);
      const opened = await ticketOf(first.body.data.id);
      expect(opened?.severity).toBe('normal');

      // Move the ticket's clock back one hour, as if the spam report came at T.
      await db.query(
        `UPDATE moderation_tickets
            SET first_reported_at = first_reported_at - interval '1 hour',
                last_reported_at  = last_reported_at  - interval '1 hour',
                sla_due_at        = sla_due_at        - interval '1 hour'
          WHERE id = $1`,
        [opened?.ticket_id],
      );

      const second = await postReport(app, other, {
        targetType: 'post',
        targetId: post,
        reason: 'harassment',
      }).expect(201);
      const merged = await ticketOf(second.body.data.id);
      expect(merged?.ticket_id).toBe(opened?.ticket_id);
      expect(merged?.report_count).toBe(2);
      expect(merged?.severity).toBe('critical');
      const expected = (merged?.first_reported_at.getTime() ?? 0) + 3 * 60 * 60 * 1000;
      expect(Math.abs((merged?.sla_due_at.getTime() ?? 0) - expected)).toBeLessThan(5_000);
    });
  });

  describe('privacy (AC-11, AC-46)', () => {
    it('nothing the reported owner reads mentions reports or moderation', async () => {
      const reads = [
        `/api/v1/events/${eventId}`,
        `/api/v1/posts/${postId}`,
        `/api/v1/profiles/${owner.handle}`,
        `/api/v1/auth/me`,
      ];
      for (const path of reads) {
        const res = await http(app).get(path).set(owner.headers).expect(200);
        expect(JSON.stringify(res.body)).not.toMatch(/report|moderation|ticket|reporter/i);
      }
    });

    it('member reports and blocks write nothing to the audit log', async () => {
      expect(
        await countRows(
          db,
          'audit_logs WHERE actor_user_id = ANY($1::uuid[]) OR subject_user_id = ANY($1::uuid[])',
          [[reporter.id, owner.id, other.id]],
        ),
      ).toBe(0);
    });
  });
});
