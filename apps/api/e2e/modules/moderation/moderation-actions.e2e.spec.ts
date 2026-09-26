import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, ModerationActionResponse } from '@dnc/contracts';
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
  NOTE,
  openDb,
  openTicket,
  postAction,
  publishEvent,
  ReporterPool,
} from './moderation-fixtures.js';

const ACTIONS = '/api/v1/admin/moderation/actions';
const ticketPath = (id: string) => `/api/v1/admin/moderation/tickets/${id}`;

/**
 * POST actions / dismiss / severity — T-API-3 (task board D11–D13).
 *
 * AC-25, AC-26 (403 on action), AC-30, AC-31 (API), AC-32, AC-33 (suspend +
 * sessions revoked), AC-35, AC-36, AC-37, AC-38, AC-39, AC-40, AC-42, AC-43,
 * AC-45.
 */
describe('moderation actions', () => {
  let app: INestApplication;
  let db: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let author: Actor; // B
  let bystander: Actor; // a third party
  let member: Actor;
  let curator: Actor;
  let moderator: Actor; // M
  let moderator2: Actor; // M2
  let admin: Actor; // AD
  let superAdmin: Actor; // SA
  let reporters: ReporterPool;

  const ticketOn = (
    targetType: 'event' | 'post' | 'comment' | 'user',
    targetId: string,
    reason = 'scam',
    reporter: Actor = reporters.next(),
  ) => openTicket(app, db, reporter, { targetType, targetId, reason });

  const actionRows = (ticketId: string) =>
    db
      .query<Record<string, unknown>>(
        `SELECT * FROM moderation_actions WHERE ticket_id = $1 ORDER BY created_at, id`,
        [ticketId],
      )
      .then(({ rows }) => rows);

  const auditRowsFor = (actionId: string) =>
    db
      .query<Record<string, unknown>>(
        `SELECT * FROM audit_logs WHERE moderation_action_id = $1`,
        [actionId],
      )
      .then(({ rows }) => rows);

  const ticketStatus = async (ticketId: string) =>
    (
      await db.query<{ status: string }>(`SELECT status FROM moderation_tickets WHERE id = $1`, [
        ticketId,
      ])
    ).rows[0]?.status;

  const column = async (
    table: 'posts' | 'comments' | 'events' | 'users' | 'moderation_tickets',
    id: string,
    col: string,
  ) =>
    (await db.query<Record<string, unknown>>(`SELECT ${col} AS v FROM ${table} WHERE id = $1`, [id]))
      .rows[0]?.['v'];

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = openDb();
    author = await createActor(app);
    bystander = await createActor(app);
    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    moderator2 = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });
    reporters = new ReporterPool([
      await createActor(app, { trustLevel: 3 }),
      await createActor(app, { trustLevel: 3 }),
      await createActor(app, { trustLevel: 3 }),
    ]);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await cleanup();
  });

  describe('access (AC-39)', () => {
    const routes = () => [
      ACTIONS,
      `${ticketPath(unknownId())}/dismiss`,
      `${ticketPath(unknownId())}/severity`,
    ];

    it('401 without a token', async () => {
      for (const path of routes()) {
        await http(app).post(path).send({}).expect(401);
      }
    });

    it.each([
      ['member', () => member],
      ['curator', () => curator],
    ] as const)('403 ROLE_NOT_ALLOWED for a %s, whatever the body', async (_role, actor) => {
      for (const path of routes()) {
        const res = await http(app).post(path).set(actor().headers).send({}).expect(403);
        expect(res.body.code).toBe('ROLE_NOT_ALLOWED');
      }
    });

    it('has no route that edits or deletes a decision (AC-45)', async () => {
      const id = unknownId();
      await http(app).patch(`${ACTIONS}/${id}`).set(superAdmin.headers).send({}).expect(404);
      await http(app).put(`${ACTIONS}/${id}`).set(superAdmin.headers).send({}).expect(404);
      await http(app).delete(`${ACTIONS}/${id}`).set(superAdmin.headers).expect(404);
      await http(app).delete(ticketPath(id)).set(superAdmin.headers).expect(404);
      await http(app).patch(ticketPath(id)).set(superAdmin.headers).send({}).expect(404);
    });
  });

  describe('validation (AC-36)', () => {
    it.each([
      ['a missing reason', { reasonCode: undefined }, 'errors.moderation.reasonRequired'],
      ['a 19-character note', { note: 'x'.repeat(19) }, 'errors.moderation.noteTooShort'],
      ['a note of spaces', { note: ' '.repeat(40) }, 'errors.moderation.noteTooShort'],
      ['a 2001-character note', { note: 'x'.repeat(2001) }, 'errors.moderation.noteTooLong'],
    ] as const)('rejects %s with 400 and changes nothing', async (_case, patch, key) => {
      const post = await createPost(app, author, areaId, 'Post for a validation check.');
      const ticketId = await ticketOn('post', post, 'spam');
      const res = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
        ...patch,
      }).expect(400);
      expect(JSON.stringify(res.body)).toContain(key);
      expect(await column('posts', post, 'status::text')).toBe('visible');
      expect(await actionRows(ticketId)).toHaveLength(0);
      expect(await countRows(db, 'audit_logs WHERE entity_id = $1', [post])).toBe(0);
      expect(await ticketStatus(ticketId)).toBe('open');
    });

    it('rejects a dismiss and a severity change without a long enough note', async () => {
      const ticketId = await ticketOn('post', await createPost(app, author, areaId, 'Another post.'), 'spam');
      const shortNote = { reasonCode: 'spam', note: 'too short' };
      const dismiss = await http(app)
        .post(`${ticketPath(ticketId)}/dismiss`)
        .set(moderator.headers)
        .send(shortNote)
        .expect(400);
      expect(JSON.stringify(dismiss.body)).toContain('errors.moderation.noteTooShort');
      await http(app)
        .post(`${ticketPath(ticketId)}/severity`)
        .set(moderator.headers)
        .send({ severity: 'high', ...shortNote })
        .expect(400);
      expect(await ticketStatus(ticketId)).toBe('open');
      expect(await column('moderation_tickets', ticketId, 'severity::text')).toBe('normal');
    });

    it('requires a ticket for enforcement', async () => {
      const post = await createPost(app, author, areaId, 'No ticket for this one.');
      await postAction(app, moderator, {
        action: 'hide_content',
        targetType: 'post',
        targetId: post,
      }).expect(400);
    });
  });

  describe('taking down an event (AC-30, AC-42)', () => {
    it('takes the event out of discovery, keeps RSVPs, resolves the ticket, writes one action and one audit entry', async () => {
      const organizer = await createActor(app);
      const { eventId, occurrenceId } = await publishEvent(app, organizer, areaId, 'Too good to be true tour');
      const attendees = [await createActor(app), await createActor(app), await createActor(app)];
      for (const attendee of attendees) {
        await http(app)
          .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
          .set(attendee.headers)
          .set('Idempotency-Key', idempotencyKey())
          .expect(201);
      }
      const ticketId = await ticketOn('event', eventId, 'scam');
      const requestId = `e2e-req-${randomUUID()}`;

      const res = await postAction(
        app,
        moderator,
        { action: 'take_down_event', ticketId, targetType: 'event', targetId: eventId },
        { 'x-request-id': requestId },
      ).expect(201);
      const action = envelope(ModerationActionResponse).parse(res.body).data;
      expect(action).toMatchObject({
        ticketId,
        actionType: 'event_taken_down',
        targetType: 'event',
        targetId: eventId,
        targetUserId: organizer.id,
        reasonCode: 'scam',
        note: NOTE,
      });
      expect(action.actor.user?.userId).toBe(moderator.id);

      expect(await column('events', eventId, 'status::text')).toBe('taken_down');
      expect(await ticketStatus(ticketId)).toBe('resolved');
      expect(
        await countRows(db, `reports WHERE ticket_id = $1 AND status <> 'resolved'`, [ticketId]),
      ).toBe(0);

      // Third party: gone from discovery, 404 on detail, cannot RSVP.
      await http(app).get(`/api/v1/events/${eventId}`).set(bystander.headers).expect(404);
      const list = await http(app)
        .get('/api/v1/events')
        .query({ organizerId: organizer.id })
        .set(bystander.headers)
        .expect(200);
      expect(list.body.data.items.map((e: { id: string }) => e.id)).not.toContain(eventId);
      const late = await http(app)
        .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
        .set(bystander.headers)
        .set('Idempotency-Key', idempotencyKey());
      expect(late.status).toBeGreaterThanOrEqual(400);
      expect(late.status).toBeLessThan(500);

      // The organizer still sees it, labelled by status.
      const own = await http(app).get(`/api/v1/events/${eventId}`).set(organizer.headers).expect(200);
      expect(own.body.data.status).toBe('taken_down');

      // RSVPs are kept, untouched.
      expect(
        await countRows(db, `rsvps WHERE occurrence_id = $1 AND status = 'confirmed'`, [occurrenceId]),
      ).toBe(3);

      // Exactly one action row with the full S5-DoD-7 record (AC-40) …
      const rows = await actionRows(ticketId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actor_type: 'staff',
        actor_user_id: moderator.id,
        actor_role: 'moderator',
        action_type: 'event_taken_down',
        target_type: 'event',
        target_id: eventId,
        target_user_id: organizer.id,
        reason_code: 'scam',
        note: NOTE,
      });
      expect(rows[0]?.['created_at']).toBeInstanceOf(Date);

      // … and exactly one audit entry, changed fields only, no personal data (AC-42).
      const audit = await auditRowsFor(action.id);
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actor_type: 'staff',
        actor_user_id: moderator.id,
        actor_role: 'moderator',
        action: 'moderation.event_taken_down',
        entity_type: 'event',
        entity_id: eventId,
        subject_user_id: organizer.id,
        before: { status: 'published' },
        after: { status: 'taken_down' },
        reason_code: 'scam',
        note: NOTE,
        severity: 'warning',
        request_id: requestId,
      });
      expect(JSON.stringify(audit[0])).not.toMatch(/example\.test|Too good to be true/);
    });

    it('generates a request id when the header is not a plausible one', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Event with a bad header');
      const ticketId = await ticketOn('event', eventId, 'ghost_event');
      const res = await postAction(
        app,
        moderator,
        { action: 'suspend_event', ticketId, targetType: 'event', targetId: eventId, reasonCode: 'ghost_event' },
        { 'x-request-id': 'bad id; drop table' },
      ).expect(201);
      const audit = await auditRowsFor(res.body.data.id);
      expect(audit[0]?.['request_id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('hiding and restoring content (AC-31)', () => {
    it('hides a post from everyone but its author and staff, and restores it with a new row', async () => {
      const post = await createPost(app, author, areaId, 'Post that breaks the guidelines.');
      const ticketId = await ticketOn('post', post, 'hate');
      const hide = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
        reasonCode: 'hate',
      }).expect(201);

      expect(await column('posts', post, 'status::text')).toBe('hidden');
      expect(await column('posts', post, 'moderation_state::text')).toBe('actioned');
      await http(app).get(`/api/v1/posts/${post}`).set(bystander.headers).expect(404);
      const feed = await http(app)
        .get('/api/v1/posts')
        .query({ authorUserId: author.id })
        .set(bystander.headers)
        .expect(200);
      expect(feed.body.data.items.map((p: { id: string }) => p.id)).not.toContain(post);
      const own = await http(app).get(`/api/v1/posts/${post}`).set(author.headers).expect(200);
      expect(own.body.data.status).toBe('hidden');

      const hideRow = (await actionRows(ticketId))[0];
      const restore = await postAction(app, moderator, {
        action: 'restore_content',
        targetType: 'post',
        targetId: post,
        reasonCode: 'other',
      }).expect(201);
      expect(restore.body.data.ticketId).toBeNull();
      expect(await column('posts', post, 'status::text')).toBe('visible');
      expect(await column('posts', post, 'moderation_state::text')).toBe('clean');
      await http(app).get(`/api/v1/posts/${post}`).set(bystander.headers).expect(200);

      // The hide row is untouched; the restore is a row of its own.
      expect((await actionRows(ticketId))[0]).toEqual(hideRow);
      expect(
        await countRows(db, `moderation_actions WHERE target_id = $1`, [post]),
      ).toBe(2);
      const restoreAudit = await auditRowsFor(restore.body.data.id);
      expect(restoreAudit[0]).toMatchObject({
        action: 'moderation.content_restored',
        before: { status: 'hidden', moderationState: 'actioned' },
        after: { status: 'visible', moderationState: 'clean' },
      });
      expect(hide.body.data.actionType).toBe('content_hidden');
    });

    it('hides and restores a comment', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Event with a bad comment');
      const comment = await createEventComment(app, author, eventId, 'Offensive comment text.');
      const ticketId = await ticketOn('comment', comment, 'hate');
      await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'comment',
        targetId: comment,
        reasonCode: 'hate',
      }).expect(201);
      expect(await column('comments', comment, 'status::text')).toBe('hidden');
      await http(app).get(`/api/v1/comments/${comment}`).set(bystander.headers).expect(404);

      await postAction(app, moderator, {
        action: 'restore_content',
        ticketId,
        followUp: true,
        targetType: 'comment',
        targetId: comment,
        reasonCode: 'other',
      }).expect(201);
      expect(await column('comments', comment, 'status::text')).toBe('visible');
    });

    it('409 MODERATION_INVALID_STATE when hiding content that is already hidden', async () => {
      const post = await createPost(app, author, areaId, 'Hidden twice?');
      const ticketId = await ticketOn('post', post, 'spam');
      const body = { action: 'hide_content', ticketId, targetType: 'post', targetId: post };
      await postAction(app, moderator, body).expect(201);
      const res = await postAction(app, moderator2, { ...body, followUp: true }).expect(409);
      expect(res.body.code).toBe('MODERATION_INVALID_STATE');
      expect(await actionRows(ticketId)).toHaveLength(1);
    });

    it('protects staff content: a moderator’s post needs an admin (403 MODERATION_TARGET_PROTECTED)', async () => {
      const otherModerator = await createActor(app, { role: 'moderator' });
      const post = await createPost(app, otherModerator, areaId, 'Post written by a moderator.');
      const ticketId = await ticketOn('post', post, 'spam');
      const body = { action: 'hide_content', ticketId, targetType: 'post', targetId: post };
      const res = await postAction(app, moderator, body).expect(403);
      expect(res.body).toEqual({
        code: 'MODERATION_TARGET_PROTECTED',
        messageKey: 'errors.moderation.targetProtected',
      });
      await postAction(app, admin, body).expect(201);
    });
  });

  describe('suspending and restoring events (AC-32)', () => {
    it('a moderator suspends and restores an event', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Event under review');
      const ticketId = await ticketOn('event', eventId, 'unsafe_setup');
      await postAction(app, moderator, {
        action: 'suspend_event',
        ticketId,
        targetType: 'event',
        targetId: eventId,
        reasonCode: 'unsafe_setup',
      }).expect(201);
      expect(await column('events', eventId, 'status::text')).toBe('suspended');
      await http(app).get(`/api/v1/events/${eventId}`).set(bystander.headers).expect(404);

      await postAction(app, moderator, {
        action: 'restore_event',
        targetType: 'event',
        targetId: eventId,
        reasonCode: 'other',
      }).expect(201);
      expect(await column('events', eventId, 'status::text')).toBe('published');
      await http(app).get(`/api/v1/events/${eventId}`).set(bystander.headers).expect(200);
    });

    it('only an admin restores a taken-down event', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Taken down then restored');
      const ticketId = await ticketOn('event', eventId, 'scam');
      await postAction(app, moderator, {
        action: 'take_down_event',
        ticketId,
        targetType: 'event',
        targetId: eventId,
      }).expect(201);

      const restore = { action: 'restore_event', targetType: 'event', targetId: eventId, reasonCode: 'other' };
      const refused = await postAction(app, moderator, restore).expect(403);
      expect(refused.body.code).toBe('ROLE_NOT_ALLOWED');
      expect(await column('events', eventId, 'status::text')).toBe('taken_down');

      await postAction(app, admin, restore).expect(201);
      expect(await column('events', eventId, 'status::text')).toBe('published');
    });

    it('409 when restoring an event that is not suspended or taken down', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Nothing to restore');
      const res = await postAction(app, moderator, {
        action: 'restore_event',
        targetType: 'event',
        targetId: eventId,
      }).expect(409);
      expect(res.body.code).toBe('MODERATION_INVALID_STATE');
    });
  });

  describe('suspending accounts (AC-33, AC-35)', () => {
    const suspend = (actor: Actor, target: Actor, ticketId: string, durationDays = 7) =>
      postAction(app, actor, {
        action: 'suspend_user',
        ticketId,
        targetType: 'user',
        targetId: target.id,
        reasonCode: 'harassment',
        durationDays,
      });

    it('suspends a member for 7 days and revokes every refresh session', async () => {
      const target = await createActor(app);
      const ticketId = await ticketOn('user', target.id, 'harassment');
      const res = await suspend(moderator, target, ticketId).expect(201);

      expect(await column('users', target.id, 'status::text')).toBe('suspended');
      const until = (await column('users', target.id, 'suspended_until')) as Date;
      expect(Math.abs(until.getTime() - (Date.now() + 7 * 86_400_000))).toBeLessThan(60_000);
      expect(await column('users', target.id, 'suspension_reason')).toBe('harassment');
      expect(res.body.data.suspendedUntil).toBe(until.toISOString());
      expect(
        await countRows(db, 'auth_sessions WHERE user_id = $1 AND revoked_at IS NULL', [target.id]),
      ).toBe(0);
      expect(
        await countRows(
          db,
          `auth_sessions WHERE user_id = $1 AND revoked_reason IS DISTINCT FROM 'account_suspended'`,
          [target.id],
        ),
      ).toBe(0);

      const audit = await auditRowsFor(res.body.data.id);
      expect(audit[0]).toMatchObject({
        action: 'moderation.user_suspended',
        entity_type: 'user',
        severity: 'warning',
        before: { status: 'active', suspendedUntil: null },
        after: { status: 'suspended', suspendedUntil: until.toISOString() },
      });
    });

    it('a moderator may suspend for at most 30 days (403 SUSPENSION_TOO_LONG)', async () => {
      const target = await createActor(app);
      const ticketId = await ticketOn('user', target.id, 'harassment');
      const res = await suspend(moderator, target, ticketId, 31).expect(403);
      expect(res.body).toEqual({
        code: 'SUSPENSION_TOO_LONG',
        messageKey: 'errors.moderation.suspensionTooLong',
        details: { maxDays: 30 },
      });
      expect(await column('users', target.id, 'status::text')).toBe('active');
      await suspend(moderator, target, ticketId, 30).expect(201);
    });

    it.each([
      ['moderator', 'curator'],
      ['moderator', 'moderator'],
      ['moderator', 'admin'],
      ['admin', 'admin'],
      ['admin', 'super_admin'],
    ] as const)('a %s cannot suspend a %s (403 MODERATION_TARGET_PROTECTED)', async (actorRole, targetRole) => {
      const actor = actorRole === 'moderator' ? moderator : admin;
      const target = await createActor(app, { role: targetRole });
      const ticketId = await ticketOn('user', target.id, 'impersonation');
      const res = await suspend(actor, target, ticketId).expect(403);
      expect(res.body.code).toBe('MODERATION_TARGET_PROTECTED');
      expect(await column('users', target.id, 'status::text')).toBe('active');
    });

    it('an admin suspends a moderator; a super_admin suspends an admin', async () => {
      const mod = await createActor(app, { role: 'moderator' });
      await suspend(admin, mod, await ticketOn('user', mod.id, 'impersonation'), 60).expect(201);
      const otherAdmin = await createActor(app, { role: 'admin' });
      await suspend(superAdmin, otherAdmin, await ticketOn('user', otherAdmin.id, 'impersonation'))
        .expect(201);
      expect(await column('users', otherAdmin.id, 'status::text')).toBe('suspended');
    });

    it('nobody suspends or lifts their own account (403)', async () => {
      // With a ticket on one's own profile the conflict-of-interest rule answers first.
      const ownTicket = await ticketOn('user', moderator.id, 'impersonation');
      await suspend(moderator, moderator, ownTicket).expect(403);
      // Without a ticket, the self rule does.
      const res = await postAction(app, superAdmin, {
        action: 'unsuspend_user',
        targetType: 'user',
        targetId: superAdmin.id,
      }).expect(403);
      expect(res.body.code).toBe('MODERATION_SELF_NOT_ALLOWED');
    });

    it('lifting a suspension early brings the account back and clears both columns', async () => {
      const target = await createActor(app);
      await suspend(moderator, target, await ticketOn('user', target.id, 'spam')).expect(201);
      const lift = await postAction(app, moderator2, {
        action: 'unsuspend_user',
        targetType: 'user',
        targetId: target.id,
        reasonCode: 'other',
      }).expect(201);
      expect(await column('users', target.id, 'status::text')).toBe('active');
      expect(await column('users', target.id, 'suspended_until')).toBeNull();
      expect(await column('users', target.id, 'suspension_reason')).toBeNull();
      expect((await auditRowsFor(lift.body.data.id))[0]).toMatchObject({
        action: 'moderation.user_unsuspended',
        after: { status: 'active', suspendedUntil: null },
      });
    });
  });

  describe('ticket rules (AC-26, AC-37, D11)', () => {
    it('403 CONFLICT_OF_INTEREST on every decision for a moderator who reported in the ticket', async () => {
      const post = await createPost(app, author, areaId, 'Reported by the moderator.');
      const ticketId = await ticketOn('post', post, 'spam', moderator);
      const expectConflict = (res: { body: { code: string } }) =>
        expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
      expectConflict(
        await postAction(app, moderator, {
          action: 'hide_content',
          ticketId,
          targetType: 'post',
          targetId: post,
        }).expect(403),
      );
      expectConflict(
        await http(app)
          .post(`${ticketPath(ticketId)}/dismiss`)
          .set(moderator.headers)
          .send({ reasonCode: 'other', note: NOTE })
          .expect(403),
      );
      expectConflict(
        await http(app)
          .post(`${ticketPath(ticketId)}/severity`)
          .set(moderator.headers)
          .send({ severity: 'low', reasonCode: 'other', note: NOTE })
          .expect(403),
      );
      await postAction(app, moderator2, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
      }).expect(201);
    });

    it('two moderators acting at once: one 201, one 409 TICKET_ALREADY_CLOSED, one closing action', async () => {
      const post = await createPost(app, author, areaId, 'Race condition bait.');
      const ticketId = await ticketOn('post', post, 'spam');
      const body = { action: 'hide_content', ticketId, targetType: 'post', targetId: post };
      const results = await Promise.all([
        postAction(app, moderator, body),
        postAction(app, moderator2, body),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      const loser = results.find((r) => r.status === 409);
      expect(loser?.body).toEqual({
        code: 'TICKET_ALREADY_CLOSED',
        messageKey: 'errors.moderation.ticketAlreadyClosed',
      });
      expect(await actionRows(ticketId)).toHaveLength(1);
    });

    it('a closed ticket takes a follow-up action only with followUp: true', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Scam event and its organizer');
      const ticketId = await ticketOn('event', eventId, 'scam');
      await postAction(app, moderator, {
        action: 'take_down_event',
        ticketId,
        targetType: 'event',
        targetId: eventId,
      }).expect(201);

      const suspendOrganizer = {
        action: 'suspend_user',
        ticketId,
        targetType: 'user',
        targetId: organizer.id,
        durationDays: 14,
      };
      const closed = await postAction(app, moderator, suspendOrganizer).expect(409);
      expect(closed.body.code).toBe('TICKET_ALREADY_CLOSED');
      await postAction(app, moderator, { ...suspendOrganizer, followUp: true }).expect(201);

      const rows = await actionRows(ticketId);
      expect(rows.map((r) => r['action_type'])).toEqual(['event_taken_down', 'user_suspended']);
      expect(await ticketStatus(ticketId)).toBe('resolved');
    });

    it('422 TARGET_NOT_IN_TICKET when the target is not the ticket’s', async () => {
      const reported = await createPost(app, author, areaId, 'The reported post.');
      const unrelated = await createPost(app, author, areaId, 'An unrelated post.');
      const ticketId = await ticketOn('post', reported, 'spam');
      const res = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: unrelated,
      }).expect(422);
      expect(res.body.code).toBe('TARGET_NOT_IN_TICKET');
      expect(await column('posts', unrelated, 'status::text')).toBe('visible');
    });

    it('404 for an unknown ticket or target', async () => {
      const ticket = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId: unknownId(),
        targetType: 'post',
        targetId: unknownId(),
      }).expect(404);
      expect(ticket.body.code).toBe('MODERATION_TICKET_NOT_FOUND');
      const target = await postAction(app, moderator, {
        action: 'restore_content',
        targetType: 'post',
        targetId: unknownId(),
      }).expect(404);
      expect(target.body.code).toBe('MODERATION_TARGET_NOT_FOUND');
    });
  });

  describe('dismiss and re-rate (AC-38, AC-25)', () => {
    it('dismissing closes the ticket and its reports, leaves the content, records no_action', async () => {
      const post = await createPost(app, author, areaId, 'Perfectly fine post.');
      const ticketId = await ticketOn('post', post, 'spam');
      const res = await http(app)
        .post(`${ticketPath(ticketId)}/dismiss`)
        .set(moderator.headers)
        .send({ reasonCode: 'spam', note: NOTE })
        .expect(201);
      expect(res.body.data).toMatchObject({ actionType: 'no_action', reasonCode: 'spam', note: NOTE });
      expect(await ticketStatus(ticketId)).toBe('dismissed');
      expect(
        await countRows(db, `reports WHERE ticket_id = $1 AND status <> 'dismissed'`, [ticketId]),
      ).toBe(0);
      expect(await column('posts', post, 'status::text')).toBe('visible');
      expect((await auditRowsFor(res.body.data.id))[0]).toMatchObject({
        action: 'moderation.report_dismissed',
        entity_type: 'moderation_ticket',
        entity_id: ticketId,
        before: { status: 'open' },
        after: { status: 'dismissed' },
      });

      const again = await http(app)
        .post(`${ticketPath(ticketId)}/dismiss`)
        .set(moderator2.headers)
        .send({ reasonCode: 'spam', note: NOTE })
        .expect(409);
      expect(again.body.code).toBe('TICKET_ALREADY_CLOSED');
    });

    it('re-rating P2 to P1 restarts the deadline from the first report and records both levels', async () => {
      const post = await createPost(app, author, areaId, 'Borderline hateful post.');
      const ticketId = await ticketOn('post', post, 'spam');
      const res = await http(app)
        .post(`${ticketPath(ticketId)}/severity`)
        .set(moderator.headers)
        .send({ severity: 'high', reasonCode: 'hate', note: NOTE })
        .expect(201);
      expect(res.body.data).toMatchObject({
        actionType: 'severity_changed',
        severityBefore: 'normal',
        severityAfter: 'high',
      });

      const { rows } = await db.query<{ severity: string; status: string; delta: number }>(
        `SELECT severity::text, status::text,
                extract(epoch FROM sla_due_at - first_reported_at)::int AS delta
           FROM moderation_tickets WHERE id = $1`,
        [ticketId],
      );
      expect(rows[0]).toEqual({ severity: 'high', status: 'open', delta: 12 * 3600 });
      const audit = (await auditRowsFor(res.body.data.id))[0];
      expect(audit).toMatchObject({
        action: 'moderation.severity_changed',
        entity_type: 'moderation_ticket',
        before: { severity: 'normal' },
        after: { severity: 'high' },
      });
      expect(Object.keys(audit?.['after'] as object).sort()).toEqual(['severity', 'slaDueAt']);

      const same = await http(app)
        .post(`${ticketPath(ticketId)}/severity`)
        .set(moderator.headers)
        .send({ severity: 'high', reasonCode: 'hate', note: NOTE })
        .expect(409);
      expect(same.body.code).toBe('MODERATION_INVALID_STATE');
    });
  });

  describe('review fixes (CR-4, CR-5, CR-10)', () => {
    it('a reversal without ticketId still refuses the organizer of the related event (CR-4)', async () => {
      const organizerMod = await createActor(app, { role: 'moderator' });
      const { eventId } = await publishEvent(app, organizerMod, areaId, 'Event run by a moderator');
      const comment = await createEventComment(app, author, eventId, 'Rude comment on staff event.');
      const ticketId = await ticketOn('comment', comment, 'harassment');
      await postAction(app, moderator2, {
        action: 'hide_content',
        ticketId,
        targetType: 'comment',
        targetId: comment,
        reasonCode: 'harassment',
      }).expect(201);

      const restore = { action: 'restore_content', targetType: 'comment', targetId: comment, reasonCode: 'other' };
      const refused = await postAction(app, organizerMod, restore).expect(403);
      expect(refused.body.code).toBe('CONFLICT_OF_INTEREST');
      expect(await column('comments', comment, 'status::text')).toBe('hidden');
      await postAction(app, moderator, restore).expect(201);
    });

    it('a reversal without ticketId still refuses someone who reported in a ticket about it (CR-4)', async () => {
      const post = await createPost(app, author, areaId, 'Post the moderator reported.');
      const ticketId = await ticketOn('post', post, 'spam', moderator);
      await postAction(app, moderator2, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
      }).expect(201);
      const res = await postAction(app, moderator, {
        action: 'restore_content',
        targetType: 'post',
        targetId: post,
        reasonCode: 'other',
      }).expect(403);
      expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
      expect(await column('posts', post, 'status::text')).toBe('hidden');
    });

    it('suspending an account whose suspension has lapsed lifts it as the system first (CR-5)', async () => {
      const target = await createActor(app);
      const suspendBody = (ticketId: string, durationDays: number) => ({
        action: 'suspend_user',
        ticketId,
        targetType: 'user',
        targetId: target.id,
        reasonCode: 'harassment',
        durationDays,
      });
      await postAction(app, moderator, suspendBody(await ticketOn('user', target.id), 3)).expect(201);

      // Still running: a second suspension is refused, nothing is lifted.
      const running = await postAction(
        app,
        moderator,
        suspendBody(await ticketOn('user', target.id, 'spam'), 5),
      ).expect(409);
      expect(running.body.code).toBe('MODERATION_INVALID_STATE');
      expect(
        await countRows(db, `moderation_actions WHERE target_user_id = $1 AND actor_type = 'system'`, [
          target.id,
        ]),
      ).toBe(0);

      // Lapsed, never signed in since: the next suspension goes straight through.
      await db.query(
        `UPDATE users SET suspended_until = now() - interval '1 minute' WHERE id = $1`,
        [target.id],
      );
      const openTicketId = (
        await db.query<{ id: string }>(
          `SELECT id FROM moderation_tickets WHERE target_type = 'user' AND target_id = $1 AND status = 'open'`,
          [target.id],
        )
      ).rows[0]?.id as string;
      const res = await postAction(app, moderator, suspendBody(openTicketId, 20)).expect(201);

      const until = (await column('users', target.id, 'suspended_until')) as Date;
      expect(Math.abs(until.getTime() - (Date.now() + 20 * 86_400_000))).toBeLessThan(60_000);

      const system = await db.query<Record<string, unknown>>(
        `SELECT * FROM moderation_actions WHERE target_user_id = $1 AND actor_type = 'system'`,
        [target.id],
      );
      expect(system.rows).toHaveLength(1);
      expect(system.rows[0]).toMatchObject({ action_type: 'user_unsuspended', actor_user_id: null });
      expect(
        await countRows(db, `audit_logs WHERE moderation_action_id = $1 AND actor_type = 'system'`, [
          system.rows[0]?.['id'],
        ]),
      ).toBe(1);
      // No staff "unsuspend" was needed, and the staff entry starts from active.
      expect(
        await countRows(
          db,
          `moderation_actions WHERE target_user_id = $1 AND actor_type = 'staff' AND action_type = 'user_unsuspended'`,
          [target.id],
        ),
      ).toBe(0);
      expect((await auditRowsFor(res.body.data.id))[0]).toMatchObject({
        before: { status: 'active', suspendedUntil: null },
        after: { status: 'suspended' },
      });
    });

    it('a note of 20 UTF-16 units but only 10 characters is a 400, not a 500 (CR-10)', async () => {
      const post = await createPost(app, author, areaId, 'Post for the emoji note check.');
      const ticketId = await ticketOn('post', post, 'spam');
      const emojiNote = '😀'.repeat(10);
      const hide = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
        note: emojiNote,
      }).expect(400);
      // The contract counts code points now (TR-3), so the request is refused
      // by schema validation — the same body shape as the 19-character case.
      expect(JSON.stringify(hide.body)).toContain('errors.moderation.noteTooShort');
      for (const path of [`${ticketPath(ticketId)}/dismiss`, `${ticketPath(ticketId)}/severity`]) {
        const res = await http(app)
          .post(path)
          .set(moderator.headers)
          .send({ severity: 'high', reasonCode: 'spam', note: emojiNote })
          .expect(400);
        expect(JSON.stringify(res.body)).toContain('errors.moderation.noteTooShort');
      }
      expect(await actionRows(ticketId)).toHaveLength(0);
      // Twenty real characters, emoji or not, are accepted.
      await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
        note: '😀'.repeat(20),
      }).expect(201);
    });
  });

  describe('append-only records (AC-40)', () => {
    it('the database refuses UPDATE, DELETE and TRUNCATE on moderation_actions and audit_logs', async () => {
      const post = await createPost(app, author, areaId, 'Post for the immutability check.');
      const ticketId = await ticketOn('post', post, 'spam');
      const res = await postAction(app, moderator, {
        action: 'hide_content',
        ticketId,
        targetType: 'post',
        targetId: post,
      }).expect(201);
      const actionId: string = res.body.data.id;
      const auditId = (await auditRowsFor(actionId))[0]?.['id'];

      /**
       * Runs one forbidden statement inside a transaction that is always
       * rolled back, so a regression in the trigger fails this spec instead
       * of wiping the shared tables.
       */
      const attempt = async (sql: string, params: unknown[] = []): Promise<unknown> => {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql, params);
          return null;
        } catch (error) {
          return error;
        } finally {
          await client.query('ROLLBACK').catch(() => undefined);
          client.release();
        }
      };

      for (const [sql, id] of [
        [`UPDATE moderation_actions SET note = note WHERE id = $1`, actionId],
        [`DELETE FROM moderation_actions WHERE id = $1`, actionId],
        [`UPDATE audit_logs SET note = note WHERE id = $1`, auditId],
        [`DELETE FROM audit_logs WHERE id = $1`, auditId],
      ] as const) {
        expect(await attempt(sql, [id])).toMatchObject({ code: '42501' });
      }
      expect(await attempt('TRUNCATE moderation_actions CASCADE')).toMatchObject({ code: '42501' });
      expect(await attempt('TRUNCATE audit_logs')).toMatchObject({ code: '42501' });
      expect(await countRows(db, 'moderation_actions WHERE id = $1', [actionId])).toBe(1);
    });
  });

  describe('atomicity (AC-43)', () => {
    it('a failing audit insert rolls the whole decision back', async () => {
      const organizer = await createActor(app);
      const { eventId } = await publishEvent(app, organizer, areaId, 'Event whose audit fails');
      const ticketId = await ticketOn('event', eventId, 'scam');
      const name = `e2e_fail_audit_${randomUUID().replaceAll('-', '').slice(0, 12)}`;

      await db.query(
        `CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$
         BEGIN RAISE EXCEPTION 'e2e forced audit failure'; END $$`,
      );
      await db.query(
        `CREATE TRIGGER ${name} BEFORE INSERT ON audit_logs FOR EACH ROW
           WHEN (NEW.note LIKE '%E2E_FAIL_AUDIT%') EXECUTE FUNCTION ${name}()`,
      );
      try {
        const res = await postAction(app, moderator, {
          action: 'take_down_event',
          ticketId,
          targetType: 'event',
          targetId: eventId,
          note: 'E2E_FAIL_AUDIT marker: this audit insert must fail.',
        });
        expect(res.status).toBeGreaterThanOrEqual(500);
      } finally {
        await db.query(`DROP TRIGGER IF EXISTS ${name} ON audit_logs`);
        await db.query(`DROP FUNCTION IF EXISTS ${name}()`);
      }

      expect(await column('events', eventId, 'status::text')).toBe('published');
      expect(await actionRows(ticketId)).toHaveLength(0);
      expect(await ticketStatus(ticketId)).toBe('open');

      // The same decision succeeds on retry once the fault is gone.
      await postAction(app, moderator, {
        action: 'take_down_event',
        ticketId,
        targetType: 'event',
        targetId: eventId,
      }).expect(201);
    });
  });
});
