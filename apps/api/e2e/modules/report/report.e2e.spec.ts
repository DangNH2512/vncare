import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminModerationTarget } from '@dnc/contracts';
import { AuditService } from '../../../src/modules/audit/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const tag = randomBytes(3).toString('hex');
const REASON = 'Reported as misleading by several guests';

interface CaseRow {
  id: string;
  case_number: string;
  severity: string;
  status: string;
  report_count: number;
  auto_hidden: boolean;
  first_reported_at: Date;
  sla_due_at: Date;
}

interface AuditRow {
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  severity: string;
}

const HOUR_MS = 3_600_000;

describe('member reports', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanup: () => Promise<void>;
  let areaId: string;
  const eventIds: string[] = [];
  const postIds: string[] = [];
  const commentIds: string[] = [];
  const actorIds: string[] = [];
  let seq = 0;

  let host: Actor;
  let author: Actor;
  let admin: Actor;
  let r1: Actor;
  let r2: Actor;
  let t0: Actor;

  async function makeActor(options: { trustLevel?: number; role?: 'admin' } = {}): Promise<Actor> {
    const actor = await createActor(app, options);
    actorIds.push(actor.id);
    return actor;
  }

  const send = (who: Actor | null, body: object, key: string | null = randomUUID()) => {
    let req = request(app.getHttpServer()).post('/api/v1/reports');
    if (who) req = req.set(who.headers);
    if (key !== null) req = req.set('idempotency-key', key);
    return req.send(body);
  };
  const reportEvent = (who: Actor, id: string, reasonGroup = 'spam', key?: string) =>
    send(who, { targetType: 'event', targetId: id, reasonGroup }, key);

  async function makeEvent(status = 'published', organizer: Actor = host): Promise<string> {
    seq += 1;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, description, location, status)
       VALUES ($1, $2, $3, $4, 'desc', ST_GeogFromText('POINT(108.25 16.05)'), $5::event_status_enum)
       RETURNING id`,
      [organizer.id, areaId, `rep-${tag}-${seq}`, `Report event ${tag} ${seq}`, status],
    );
    const id = rows[0]?.id as string;
    await pool.query(
      `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
       VALUES ($1, now() + interval '7 days', now() + interval '7 days 2 hours', 10)`,
      [id],
    );
    eventIds.push(id);
    return id;
  }

  async function makePost(status = 'visible', owner: Actor = author): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO posts (author_user_id, area_id, body, status)
       VALUES ($1, $2, $3, $4::content_status_enum) RETURNING id`,
      [owner.id, areaId, `Post body ${tag} ${randomUUID()}`, status],
    );
    postIds.push(rows[0]?.id as string);
    return rows[0]?.id as string;
  }

  async function makeComment(postId: string, owner: Actor = author): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING id`,
      [postId, owner.id, `Comment ${tag} ${randomUUID()}`],
    );
    commentIds.push(rows[0]?.id as string);
    return rows[0]?.id as string;
  }

  const casesOf = async (type: string, id: string) =>
    (await pool.query<CaseRow>(`SELECT * FROM moderation_cases WHERE target_type = $1 AND target_id = $2`, [type, id])).rows;
  const reportsOf = async (id: string) =>
    (await pool.query(`SELECT * FROM reports WHERE target_id = $1 ORDER BY id`, [id])).rows;
  const auditOf = async (id: string) =>
    (await pool.query<AuditRow>(`SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY id`, [id])).rows;
  const eventStatus = async (id: string) =>
    (await pool.query<{ status: string }>(`SELECT status FROM events WHERE id = $1`, [id])).rows[0]?.status;
  const listedPostIds = async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/posts?areaId=${areaId}&limit=50`).expect(200);
    return (res.body.data.items as { id: string }[]).map((p) => p.id);
  };

  /** Closes the case the way the console will: resolved, with a resolver and a code. */
  async function closeCase(caseId: string, code: string): Promise<void> {
    await pool.query(
      `UPDATE moderation_cases SET status = 'resolved', resolved_by_user_id = $2,
              resolution_code = $3, resolved_at = now() WHERE id = $1`,
      [caseId, admin.id, code],
    );
    await pool.query(`UPDATE reports SET status = 'resolved' WHERE case_id = $1`, [caseId]);
  }

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    host = await makeActor({ trustLevel: 3 });
    author = await makeActor({ trustLevel: 3 });
    admin = await makeActor({ trustLevel: 3, role: 'admin' });
    t0 = await makeActor({ trustLevel: 0 });
  }, 120_000);

  // Fresh reporters per test: the daily quota is per account and a shared one runs dry.
  beforeEach(async () => {
    r1 = await makeActor();
    r2 = await makeActor({ trustLevel: 2 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const targets = [...eventIds, ...postIds, ...commentIds, ...actorIds];
    await pool.query(`DELETE FROM reports WHERE target_id = ANY($1::uuid[])`, [targets]);
    await pool.query(`DELETE FROM moderation_cases WHERE target_id = ANY($1::uuid[])`, [targets]);
    // audit_logs is append-only: lift the delete guard inside one transaction.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[]) OR actor_user_id = ANY($2::uuid[])`,
        [targets, actorIds],
      );
      await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    await pool.end();
    await app.close();
    await cleanup();
  });

  describe('access and input', () => {
    it('answers 401 without a token', async () => {
      await send(null, { targetType: 'event', targetId: unknownId(), reasonGroup: 'spam' }).expect(401);
      await request(app.getHttpServer()).get('/api/v1/reports/mine').expect(401);
    });

    it('answers 403 TRUST_LEVEL_TOO_LOW to a T0 account and creates nothing', async () => {
      const id = await makeEvent();
      const res = await reportEvent(t0, id).expect(403);
      expect(JSON.stringify(res.body)).toContain('TRUST_LEVEL_TOO_LOW');
      expect(await reportsOf(id)).toHaveLength(0);
    });

    it('lets a T0 account read its own (empty) list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports/mine').set(t0.headers).expect(200);
      expect(res.body.data).toEqual({ items: [], nextCursor: null });
    });

    it('answers 400 REPORT_IDEMPOTENCY_REQUIRED without the header or with a bad one', async () => {
      const id = await makeEvent();
      for (const key of [null, 'not-a-uuid', '']) {
        const res = await send(r1, { targetType: 'event', targetId: id, reasonGroup: 'spam' }, key);
        expect(res.status, String(key)).toBe(400);
        expect(JSON.stringify(res.body), String(key)).toContain('REPORT_IDEMPOTENCY_REQUIRED');
      }
      expect(await reportsOf(id)).toHaveLength(0);
    });

    it('rejects unknown, missing and invalid body fields with 400', async () => {
      const id = await makeEvent();
      const bad: object[] = [
        { targetType: 'event', targetId: id, reasonGroup: 'spam', evidenceSnapshot: { title: 'x' } },
        { targetType: 'event', targetId: id },
        { targetType: 'message', targetId: id, reasonGroup: 'spam' },
        { targetType: 'event', targetId: 'nope', reasonGroup: 'spam' },
        { targetType: 'event', targetId: id, reasonGroup: 'unknown' },
        { targetType: 'event', targetId: id, reasonGroup: 'spam', description: 'x'.repeat(2001) },
      ];
      for (const body of bad) expect((await send(r1, body)).status, JSON.stringify(body)).toBe(400);
      expect(await reportsOf(id)).toHaveLength(0);
    });
  });

  describe('creating a report', () => {
    it('stores the report, the case and a server-built snapshot (A4-AC-1)', async () => {
      const id = await makeEvent();
      const res = await send(r1, {
        targetType: 'event',
        targetId: id,
        reasonGroup: 'spam',
        description: '  looks like an advert  ',
      }).expect(201);
      expect(res.body.data).toEqual({ reportId: expect.any(String), status: 'received' });

      const [report] = await reportsOf(id);
      expect(report).toMatchObject({
        id: res.body.data.reportId,
        reporter_user_id: r1.id,
        reporter_trust_level: 1,
        target_type: 'event',
        target_owner_user_id: host.id,
        reason_group: 'spam',
        severity: 'normal',
        description: 'looks like an advert',
        status: 'open',
      });
      const [moderationCase] = await casesOf('event', id);
      expect(moderationCase).toMatchObject({ status: 'open', report_count: 1, severity: 'normal', auto_hidden: false });
      expect(moderationCase?.sla_due_at.getTime()).toBe(moderationCase!.first_reported_at.getTime() + 48 * HOUR_MS);
      expect(await eventStatus(id)).toBe('published');

      // The snapshot is whitelist-shaped (strict) and holds the title.
      const parsed = AdminModerationTarget.safeParse({
        id,
        type: 'event',
        currentStatus: 'published',
        currentExcerpt: null,
        snapshot: report.evidence_snapshot,
      });
      expect(parsed.success, JSON.stringify(report.evidence_snapshot)).toBe(true);
      expect(report.evidence_snapshot.title).toContain(`Report event ${tag}`);
      expect(report.evidence_snapshot.startsAt).toEqual(expect.any(String));
    });

    it('snapshots posts, comments and profiles in their own whitelist shapes', async () => {
      const post = await makePost();
      const comment = await makeComment(await makePost());
      await send(r1, { targetType: 'post', targetId: post, reasonGroup: 'spam' }).expect(201);
      await send(r1, { targetType: 'comment', targetId: comment, reasonGroup: 'spam' }).expect(201);
      await send(r1, { targetType: 'user', targetId: author.id, reasonGroup: 'spam' }).expect(201);

      const [postReport] = await reportsOf(post);
      const [commentReport] = await reportsOf(comment);
      const [userReport] = await reportsOf(author.id);
      expect(Object.keys(postReport.evidence_snapshot)).toEqual(['body']);
      expect(Object.keys(commentReport.evidence_snapshot)).toEqual(['body']);
      expect(Object.keys(userReport.evidence_snapshot).toSorted()).toEqual(
        ['avatarUrl', 'bio', 'displayName', 'handle', 'headline'],
      );
      expect(JSON.stringify(userReport.evidence_snapshot)).not.toMatch(/@example\.test|password|phone/i);
      expect(userReport.evidence_snapshot.handle).toBe(author.handle);

      // Non-critical reports count and flag but never hide.
      const { rows } = await pool.query(`SELECT status, moderation_state, report_count FROM posts WHERE id = $1`, [post]);
      expect(rows[0]).toEqual({ status: 'visible', moderation_state: 'flagged', report_count: 1 });
      const c = await pool.query(`SELECT status, moderation_state, report_count FROM comments WHERE id = $1`, [comment]);
      expect(c.rows[0]).toEqual({ status: 'visible', moderation_state: 'flagged', report_count: 1 });
    });

    it('writes an audit line for the report itself, without IP or user agent', async () => {
      const id = await makeEvent();
      const res = await reportEvent(r1, id).expect(201);
      const lines = await auditOf(res.body.data.reportId);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        actor_user_id: r1.id,
        actor_type: 'user',
        action: 'report.created',
        entity_type: 'report',
        after: { targetType: 'event', reasonGroup: 'spam', severity: 'normal', autoHidden: false },
      });
      const raw = await pool.query(`SELECT ip, user_agent FROM audit_logs WHERE entity_id = $1`, [res.body.data.reportId]);
      expect(raw.rows[0]).toEqual({ ip: null, user_agent: null });
    });
  });

  describe('idempotency (A4-AC-10)', () => {
    it('returns the first result for a replayed key', async () => {
      const id = await makeEvent();
      const key = randomUUID();
      const first = await reportEvent(r1, id, 'spam', key).expect(201);
      const second = await reportEvent(r1, id, 'spam', key).expect(201);
      expect(second.body.data.reportId).toBe(first.body.data.reportId);
      expect(await reportsOf(id)).toHaveLength(1);
      expect((await casesOf('event', id))[0]?.report_count).toBe(1);
    });

    it('collapses concurrent requests with one key to one row', async () => {
      const id = await makeEvent();
      const key = randomUUID();
      const results = await Promise.all([1, 2, 3].map(() => reportEvent(r1, id, 'spam', key)));
      expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
      expect(new Set(results.map((r) => r.body.data.reportId)).size).toBe(1);
      expect(await reportsOf(id)).toHaveLength(1);
      expect((await casesOf('event', id))[0]?.report_count).toBe(1);
    });

    it('replays a critical report that auto-hid the target instead of answering 409', async () => {
      const id = await makeEvent();
      const key = randomUUID();
      const first = await reportEvent(r1, id, 'danger', key).expect(201);
      const again = await reportEvent(r1, id, 'danger', key).expect(201);
      expect(again.body.data.reportId).toBe(first.body.data.reportId);
      expect(await eventStatus(id)).toBe('suspended');
    });

    it('does not let one key create a report on a second target', async () => {
      const a = await makeEvent();
      const b = await makeEvent();
      const key = randomUUID();
      const first = await reportEvent(r1, a, 'spam', key).expect(201);
      const second = await reportEvent(r1, b, 'spam', key).expect(201);
      expect(second.body.data.reportId).toBe(first.body.data.reportId);
      expect(await reportsOf(b)).toHaveLength(0);
    });
  });

  describe('merging into one case (A4-AC-3, D-M6)', () => {
    it('two reporters at once make one case with count 2, max severity and the earlier deadline', async () => {
      const id = await makeEvent();
      const results = await Promise.all([reportEvent(r1, id, 'spam'), reportEvent(r2, id, 'scam')]);
      expect(results.map((r) => r.status)).toEqual([201, 201]);

      const cases = await casesOf('event', id);
      expect(cases).toHaveLength(1);
      const [moderationCase] = cases;
      expect(moderationCase).toMatchObject({ report_count: 2, severity: 'high', status: 'open' });
      expect(moderationCase?.sla_due_at.getTime()).toBe(moderationCase!.first_reported_at.getTime() + 12 * HOUR_MS);
      const reports = await reportsOf(id);
      expect(reports).toHaveLength(2);
      expect(new Set(reports.map((r) => r.case_id))).toEqual(new Set([moderationCase?.id]));
    });

    it('a lower severity report never lowers the case or moves the deadline later', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id, 'scam').expect(201);
      const before = (await casesOf('event', id))[0] as CaseRow;
      await reportEvent(r2, id, 'other').expect(201);
      const after = (await casesOf('event', id))[0] as CaseRow;
      expect(after.severity).toBe('high');
      expect(after.report_count).toBe(2);
      expect(after.sla_due_at.getTime()).toBe(before.sla_due_at.getTime());
    });

    it('answers 409 REPORT_ALREADY_REPORTED for the same reporter and opens a new case after closing', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id).expect(201);
      const res = await reportEvent(r1, id, 'scam').expect(409);
      expect(JSON.stringify(res.body)).toContain('REPORT_ALREADY_REPORTED');
      expect(await reportsOf(id)).toHaveLength(1);
      expect((await casesOf('event', id))[0]?.report_count).toBe(1);

      await closeCase((await casesOf('event', id))[0]!.id, 'no_violation');
      await reportEvent(r1, id).expect(201);
      expect(await casesOf('event', id)).toHaveLength(2);
      expect(await reportsOf(id)).toHaveLength(2);
    });
  });

  describe('target rules (A4-AC-11, D-M18)', () => {
    it('refuses to report your own content with 400 REPORT_OWN_CONTENT', async () => {
      const event = await makeEvent();
      const post = await makePost();
      const comment = await makeComment(post);
      const self = await makeActor();
      const cases: [Actor, string, string][] = [
        [host, 'event', event],
        [author, 'post', post],
        [author, 'comment', comment],
        [self, 'user', self.id],
      ];
      for (const [who, targetType, targetId] of cases) {
        const res = await send(who, { targetType, targetId, reasonGroup: 'spam' });
        expect(res.status, targetType).toBe(400);
        expect(JSON.stringify(res.body), targetType).toContain('REPORT_OWN_CONTENT');
        expect(await reportsOf(targetId), targetType).toHaveLength(0);
      }
    });

    it('answers 404 for targets that do not exist or the reporter could not see', async () => {
      const draft = await makeEvent('draft');
      const pending = await makeEvent('pending_review');
      const pendingPost = await makePost('pending_review');
      for (const [targetType, targetId] of [
        ['event', unknownId()],
        ['post', unknownId()],
        ['comment', unknownId()],
        ['user', unknownId()],
        ['event', draft],
        ['event', pending],
        ['post', pendingPost],
      ] as const) {
        const res = await send(r1, { targetType, targetId, reasonGroup: 'spam' });
        expect(res.status, `${targetType} ${targetId}`).toBe(404);
        expect(await reportsOf(targetId)).toHaveLength(0);
      }
    });

    it('answers 409 REPORT_TARGET_UNAVAILABLE for content a moderator already hid', async () => {
      const suspended = await makeEvent('suspended');
      const takenDown = await makeEvent('taken_down');
      const hiddenPost = await makePost('hidden');
      const removedPost = await makePost('removed');
      for (const [targetType, targetId] of [
        ['event', suspended],
        ['event', takenDown],
        ['post', hiddenPost],
        ['post', removedPost],
      ] as const) {
        const res = await send(r1, { targetType, targetId, reasonGroup: 'danger' });
        expect(res.status, targetType).toBe(409);
        expect(JSON.stringify(res.body)).toContain('REPORT_TARGET_UNAVAILABLE');
        expect(await reportsOf(targetId)).toHaveLength(0);
        expect(await casesOf(targetType, targetId)).toHaveLength(0);
      }
    });
  });

  describe('automatic hide of critical reports (A4-AC-4, D-M7)', () => {
    it('hides a critical post inside the request and leaves the feed', async () => {
      const id = await makePost();
      expect(await listedPostIds()).toContain(id);
      await send(r1, { targetType: 'post', targetId: id, reasonGroup: 'danger' }).expect(201);
      expect(await listedPostIds()).not.toContain(id);

      const post = await pool.query(`SELECT status, moderation_state, report_count FROM posts WHERE id = $1`, [id]);
      expect(post.rows[0]).toEqual({ status: 'hidden', moderation_state: 'under_review', report_count: 1 });
      const [moderationCase] = await casesOf('post', id);
      expect(moderationCase).toMatchObject({ severity: 'critical', auto_hidden: true, report_count: 1 });
      expect(moderationCase?.sla_due_at.getTime()).toBe(moderationCase!.first_reported_at.getTime() + 2 * HOUR_MS);

      const system = (await auditOf(id)).filter((a) => a.actor_type === 'system');
      expect(system).toHaveLength(1);
      expect(system[0]).toMatchObject({
        actor_user_id: null,
        action: 'post.hidden',
        entity_type: 'post',
        before: { status: 'visible' },
        after: { status: 'hidden', autoHidden: true },
        severity: 'warning',
      });
    });

    it('hides a critical comment', async () => {
      const id = await makeComment(await makePost());
      await send(r2, { targetType: 'comment', targetId: id, reasonGroup: 'illegal' }).expect(201);
      const { rows } = await pool.query(`SELECT status, moderation_state FROM comments WHERE id = $1`, [id]);
      expect(rows[0]).toEqual({ status: 'hidden', moderation_state: 'under_review' });
      expect((await casesOf('comment', id))[0]?.auto_hidden).toBe(true);
      expect((await auditOf(id)).filter((a) => a.action === 'comment.hidden' && a.actor_type === 'system')).toHaveLength(1);
    });

    it('suspends a critical event, audits event.suspended with the real before status, and AD-9 restore returns it', async () => {
      const id = await makeEvent('published');
      await reportEvent(r1, id, 'privacy').expect(201);
      expect(await eventStatus(id)).toBe('suspended');
      expect((await casesOf('event', id))[0]).toMatchObject({ severity: 'critical', auto_hidden: true });

      const suspended = (await auditOf(id)).filter((a) => a.action === 'event.suspended');
      expect(suspended).toHaveLength(1);
      expect(suspended[0]).toMatchObject({
        actor_user_id: null,
        actor_type: 'system',
        entity_type: 'event',
        before: { status: 'published' },
        after: { status: 'suspended', autoHidden: true },
        severity: 'warning',
      });

      const restored = await request(app.getHttpServer())
        .post(`/api/v1/admin/events/${id}/restore`)
        .set(admin.headers)
        .send({ reason: REASON, confirm: true })
        .expect(200);
      expect(restored.body.data).toEqual({ id, status: 'published' });
      expect(await eventStatus(id)).toBe('published');
    });

    it('lets only one of two concurrent critical reporters through; the other finds it already hidden', async () => {
      const id = await makeEvent();
      const results = await Promise.all([reportEvent(r1, id, 'danger'), reportEvent(r2, id, 'illegal')]);
      expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([201, 409]);
      expect(await casesOf('event', id)).toHaveLength(1);
      expect((await casesOf('event', id))[0]?.report_count).toBe(1);
      expect((await auditOf(id)).filter((a) => a.action === 'event.suspended')).toHaveLength(1);
    });

    it('never suspends the account of a reported user (Q-3)', async () => {
      const victim = await makeActor();
      await send(r1, { targetType: 'user', targetId: victim.id, reasonGroup: 'danger' }).expect(201);
      const { rows } = await pool.query(`SELECT status FROM users WHERE id = $1`, [victim.id]);
      expect(rows[0]?.status).toBe('active');
      expect((await casesOf('user', victim.id))[0]).toMatchObject({ severity: 'critical', auto_hidden: false });
      expect((await auditOf(victim.id)).filter((a) => a.actor_type === 'system')).toHaveLength(0);
    });

    it('rolls everything back when the hide audit line cannot be written', async () => {
      const id = await makePost();
      const audit = app.get(AuditService, { strict: false });
      const original = audit.record.bind(audit);
      let calls = 0;
      vi.spyOn(audit, 'record').mockImplementation((tx, input) => {
        calls += 1;
        // The first line is report.created; fail the system line of the hide.
        return calls === 2 ? Promise.reject(new Error('audit down')) : original(tx, input);
      });
      const res = await send(r1, { targetType: 'post', targetId: id, reasonGroup: 'danger' });
      expect(res.status).toBe(500);
      vi.restoreAllMocks();

      const { rows } = await pool.query(`SELECT status, moderation_state, report_count FROM posts WHERE id = $1`, [id]);
      expect(rows[0]).toEqual({ status: 'visible', moderation_state: 'clean', report_count: 0 });
      expect(await reportsOf(id)).toHaveLength(0);
      expect(await casesOf('post', id)).toHaveLength(0);
      expect(await auditOf(id)).toHaveLength(0);
      // The slot came back: the same reporter can report the same post now.
      await send(r1, { targetType: 'post', targetId: id, reasonGroup: 'danger' }).expect(201);
    });
  });

  describe('review follow-ups (AD-14b)', () => {
    it('merges a new report into an escalated case instead of opening a second one (F-1)', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id, 'spam').expect(201);
      await pool.query(
        `UPDATE moderation_cases SET status = 'escalated' WHERE target_type = 'event' AND target_id = $1`,
        [id],
      );
      await reportEvent(r2, id, 'scam').expect(201);
      const cases = await casesOf('event', id);
      expect(cases).toHaveLength(1);
      expect(cases[0]).toMatchObject({ status: 'escalated', report_count: 2, severity: 'high' });
    });

    it('does not auto-hide again for 7 days after a no_violation decision (R-6)', async () => {
      const id = await makePost();
      await send(r1, { targetType: 'post', targetId: id, reasonGroup: 'spam' }).expect(201);
      await closeCase((await casesOf('post', id))[0]!.id, 'no_violation');

      const second = await makeActor();
      await send(second, { targetType: 'post', targetId: id, reasonGroup: 'danger' }).expect(201);
      expect(await listedPostIds()).toContain(id);
      const { rows } = await pool.query(`SELECT status FROM posts WHERE id = $1`, [id]);
      expect(rows[0]?.status).toBe('visible');
      const open = (await casesOf('post', id)).find((c) => c.status === 'open');
      expect(open).toMatchObject({ severity: 'critical', auto_hidden: false });
      expect(open!.sla_due_at.getTime()).toBe(open!.first_reported_at.getTime() + 2 * HOUR_MS);
      expect((await auditOf(id)).filter((a) => a.actor_type === 'system')).toHaveLength(0);

      // Past the window the same kind of report hides it again.
      await pool.query(
        `UPDATE moderation_cases SET resolved_at = now() - interval '8 days'
          WHERE target_id = $1 AND status = 'resolved'`,
        [id],
      );
      const third = await makeActor();
      await send(third, { targetType: 'post', targetId: id, reasonGroup: 'danger' }).expect(201);
      expect(await listedPostIds()).not.toContain(id);
      expect((await casesOf('post', id)).find((c) => c.status === 'open')?.auto_hidden).toBe(true);
    });

    it('treats malicious_report like no_violation for the cooldown', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id, 'spam').expect(201);
      await closeCase((await casesOf('event', id))[0]!.id, 'malicious_report');
      await reportEvent(r2, id, 'danger').expect(201);
      expect(await eventStatus(id)).toBe('published');
    });

    it('still hides after a confirmed violation was resolved (no cooldown)', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id, 'spam').expect(201);
      await closeCase((await casesOf('event', id))[0]!.id, 'violation_confirmed');
      await reportEvent(r2, id, 'danger').expect(201);
      expect(await eventStatus(id)).toBe('suspended');
    });

    it('hiding a thread root and its reply at the same time does not deadlock (F-2)', async () => {
      for (let i = 0; i < 5; i += 1) {
        const post = await makePost();
        const root = await makeComment(post);
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO comments (post_id, parent_id, depth, user_id, body)
           VALUES ($1, $2, 1, $3, 'reply') RETURNING id`,
          [post, root, author.id],
        );
        const reply = rows[0]?.id as string;
        commentIds.push(reply);
        const a = await makeActor();
        const b = await makeActor();
        const results = await Promise.all([
          send(a, { targetType: 'comment', targetId: root, reasonGroup: 'danger' }),
          send(b, { targetType: 'comment', targetId: reply, reasonGroup: 'danger' }),
        ]);
        expect(results.map((r) => r.status)).toEqual([201, 201]);
        const states = await pool.query(`SELECT status FROM comments WHERE id = ANY($1::uuid[])`, [[root, reply]]);
        expect(states.rows.map((r) => r.status)).toEqual(['hidden', 'hidden']);
      }
    }, 60_000);

    it('takes a reporter off the case they were assigned to and keeps the case usable (F-5)', async () => {
      const id = await makeEvent();
      await reportEvent(r1, id, 'spam').expect(201);
      await pool.query(
        `UPDATE moderation_cases SET status = 'in_review', first_response_at = now(),
                assigned_to_user_id = $2, assigned_at = now()
          WHERE target_type = 'event' AND target_id = $1`,
        [id, admin.id],
      );
      await reportEvent(admin, id, 'scam').expect(201);
      const [moderationCase] = await casesOf('event', id);
      expect(moderationCase).toMatchObject({ status: 'open', report_count: 2, severity: 'high' });
      const { rows } = await pool.query(
        `SELECT assigned_to_user_id, assigned_at FROM moderation_cases WHERE id = $1`,
        [moderationCase!.id],
      );
      expect(rows[0]).toEqual({ assigned_to_user_id: null, assigned_at: null });
      // Another moderator-side update is not blocked by INV-4 on the old assignee.
      await pool.query(`UPDATE moderation_cases SET updated_at = now() WHERE id = $1`, [moderationCase!.id]);
    });
  });

  describe('GET /reports/mine (A4-AC-8, A4-AC-19)', () => {
    it('shows only the caller\'s reports, coarse and without case, owner or moderator data', async () => {
      const reporter = await makeActor();
      const other = await makeActor();
      const id = await makeEvent();
      await reportEvent(reporter, id, 'scam').expect(201);
      await reportEvent(other, id, 'spam').expect(201);

      const res = await request(app.getHttpServer()).get('/api/v1/reports/mine').set(reporter.headers).expect(200);
      const items = res.body.data.items as Record<string, unknown>[];
      expect(items).toHaveLength(1);
      expect(Object.keys(items[0] as object).toSorted()).toEqual(['createdAt', 'id', 'reasonGroup', 'status', 'targetType']);
      expect(items[0]).toMatchObject({ targetType: 'event', reasonGroup: 'scam', status: 'received' });
      const raw = JSON.stringify(res.body);
      for (const forbidden of ['caseId', 'case_id', 'caseNumber', host.handle, host.id, admin.handle, id, other.id, other.handle]) {
        expect(raw, forbidden).not.toContain(forbidden);
      }
    });

    it('follows the case: reviewing once taken, action taken or no action once closed', async () => {
      const reporter = await makeActor();
      const a = await makeEvent();
      const b = await makeEvent();
      const c = await makeEvent();
      const ra = (await reportEvent(reporter, a).expect(201)).body.data.reportId as string;
      const rb = (await reportEvent(reporter, b).expect(201)).body.data.reportId as string;
      const rc = (await reportEvent(reporter, c).expect(201)).body.data.reportId as string;

      await pool.query(
        `UPDATE moderation_cases SET status = 'in_review', first_response_at = now(),
                assigned_to_user_id = $2, assigned_at = now()
          WHERE target_type = 'event' AND target_id = $1`,
        [a, admin.id],
      );
      await closeCase((await casesOf('event', b))[0]!.id, 'violation_confirmed');
      await closeCase((await casesOf('event', c))[0]!.id, 'no_violation');

      const res = await request(app.getHttpServer()).get('/api/v1/reports/mine').set(reporter.headers).expect(200);
      const byId = new Map((res.body.data.items as { id: string; status: string }[]).map((i) => [i.id, i.status]));
      expect(byId.get(ra)).toBe('reviewing');
      expect(byId.get(rb)).toBe('action_taken');
      expect(byId.get(rc)).toBe('no_action');
      // No moderator in the payload.
      expect(JSON.stringify(res.body)).not.toContain(admin.id);
    });

    it('pages newest first with an opaque cursor', async () => {
      const reporter = await makeActor({ trustLevel: 3 });
      const ids: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        ids.push((await reportEvent(reporter, await makeEvent()).expect(201)).body.data.reportId);
      }
      const page1 = await request(app.getHttpServer()).get('/api/v1/reports/mine?limit=2').set(reporter.headers).expect(200);
      expect((page1.body.data.items as { id: string }[]).map((i) => i.id)).toEqual([ids[2], ids[1]]);
      const cursor = page1.body.data.nextCursor as string;
      expect(cursor).toEqual(expect.any(String));
      const page2 = await request(app.getHttpServer())
        .get(`/api/v1/reports/mine?limit=2&cursor=${cursor}`)
        .set(reporter.headers)
        .expect(200);
      expect((page2.body.data.items as { id: string }[]).map((i) => i.id)).toEqual([ids[0]]);
      expect(page2.body.data.nextCursor).toBeNull();
      await request(app.getHttpServer()).get('/api/v1/reports/mine?limit=500').set(reporter.headers).expect(400);
    });

    it('answers the first page, not 500, for a hand-edited cursor (F-3)', async () => {
      const reporter = await makeActor();
      const id = (await reportEvent(reporter, await makeEvent()).expect(201)).body.data.reportId as string;
      for (const value of ['a'.repeat(36), 'x', '', '00000000-0000-0000-0000-00000000000z']) {
        const cursor = Buffer.from(JSON.stringify({ id: value })).toString('base64url');
        const res = await request(app.getHttpServer())
          .get(`/api/v1/reports/mine?cursor=${cursor}`)
          .set(reporter.headers);
        expect(res.status, value).toBe(200);
        expect((res.body.data.items as { id: string }[]).map((i) => i.id), value).toEqual([id]);
      }
    });
  });

  describe('rate limit (A4-AC-14, T-10)', () => {
    it('lets a T1 member send 5 a day and answers 429 with Retry-After on the 6th', async () => {
      const reporter = await makeActor();
      for (let i = 0; i < 5; i += 1) await reportEvent(reporter, await makeEvent()).expect(201);
      const target = await makeEvent();
      const res = await reportEvent(reporter, target).expect(429);
      expect(JSON.stringify(res.body)).toContain('RATE_LIMIT_EXCEEDED');
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
      expect(await reportsOf(target)).toHaveLength(0);
    });

    it('gives the slot back for refused and replayed requests', async () => {
      const reporter = await makeActor();
      const own = await makeEvent('published', reporter);
      const key = randomUUID();
      const first = await reportEvent(reporter, await makeEvent(), 'spam', key).expect(201);
      // 1 slot spent. Replays and refusals below must not spend more.
      for (let i = 0; i < 6; i += 1) {
        await reportEvent(reporter, own).expect(400);
        await reportEvent(reporter, unknownId()).expect(404);
        await reportEvent(reporter, await makeEvent('draft')).expect(404);
        expect((await reportEvent(reporter, await makeEvent(), 'spam', key).expect(201)).body.data.reportId).toBe(
          first.body.data.reportId,
        );
      }
      for (let i = 0; i < 4; i += 1) await reportEvent(reporter, await makeEvent()).expect(201);
      await reportEvent(reporter, await makeEvent()).expect(429);
    });

    it('gives a T2 member 10 a day', async () => {
      const reporter = await makeActor({ trustLevel: 2 });
      for (let i = 0; i < 10; i += 1) await reportEvent(reporter, await makeEvent()).expect(201);
      await reportEvent(reporter, await makeEvent()).expect(429);
    }, 60_000);
  });

  describe('conflict of interest trigger (INV-4)', () => {
    it('refuses to assign a case to the owner, a reporter or the organizer of the related event', async () => {
      const post = await makePost();
      // Related event: a post may point at an event; set it directly for the fixture.
      const event = await makeEvent('published', host);
      await pool.query(`UPDATE posts SET related_event_id = $2 WHERE id = $1`, [post, event]);
      await send(r1, { targetType: 'post', targetId: post, reasonGroup: 'spam' }).expect(201);
      const [moderationCase] = await casesOf('post', post);
      expect(moderationCase).toBeDefined();

      const assign = async (userId: string) => {
        try {
          await pool.query(`UPDATE moderation_cases SET assigned_to_user_id = $2 WHERE id = $1`, [
            moderationCase!.id,
            userId,
          ]);
          return 'assigned';
        } catch (error) {
          return (error as Error).message;
        }
      };
      expect(await assign(author.id)).toContain('INV-4: handler cannot be the reported party');
      expect(await assign(r1.id)).toContain('INV-4: handler cannot be a reporter');
      expect(await assign(host.id)).toContain('INV-4: handler cannot be the organizer');
      expect(await assign(admin.id)).toBe('assigned');
    });
  });
});
