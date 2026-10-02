import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserRoleT } from '@dnc/contracts';
import {
  AdminModerationCaseDetailResponse,
  AdminModerationQueueResponse,
  DecideCaseResult,
} from '@dnc/contracts';
import { REDIS_QUEUE } from '../../../src/redis/redis.module.js';
import { AdminModerationRepository } from '../../../src/modules/admin/admin-moderation.repository.js';
import { AuditService } from '../../../src/modules/audit/index.js';
import {
  EXPIRE_SUSPENSIONS_LOCK_KEY,
  ExpireSuspensionsScheduler,
} from '../../../src/modules/moderation-jobs/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const tag = randomBytes(3).toString('hex');
const BASE = '/api/v1/admin/moderation/cases';
const NOTE = 'Reviewed against the community rules';
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

interface CaseRow {
  id: string;
  case_number: string;
  status: string;
  severity: string;
  auto_hidden: boolean;
  first_reported_at: Date;
  first_response_at: Date | null;
  sla_due_at: Date;
  assigned_to_user_id: string | null;
  resolved_by_user_id: string | null;
  resolution_code: string | null;
}

interface ActionRow {
  id: string;
  case_id: string | null;
  action_type: string;
  actor_user_id: string;
  actor_role: string;
  subject_user_id: string | null;
  reason_code: string;
  strike_weight: number;
  expires_at: Date | null;
}

interface AuditRow {
  actor_type: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

describe('admin moderation console', () => {
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
  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let moderator2: Actor;
  let admin: Actor;

  async function makeActor(options: { trustLevel?: number; role?: UserRoleT } = {}): Promise<Actor> {
    const actor = await createActor(app, options);
    actorIds.push(actor.id);
    return actor;
  }

  /** The daily report quota is per account, so every report gets a fresh reporter. */
  const freshReporter = () => makeActor({ trustLevel: 2 });

  const report = (who: Actor, body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/reports')
      .set(who.headers)
      .set('idempotency-key', randomUUID())
      .send(body);

  async function makeEvent(organizer: Actor = host, status = 'published'): Promise<string> {
    seq += 1;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, description, location, status)
       VALUES ($1, $2, $3, $4, 'desc', ST_GeogFromText('POINT(108.25 16.05)'), $5::event_status_enum)
       RETURNING id`,
      [organizer.id, areaId, `mod-${tag}-${seq}`, `Moderation event ${tag} ${seq}`, status],
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

  async function makePost(owner: Actor = author): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO posts (author_user_id, area_id, body, status)
       VALUES ($1, $2, $3, 'visible') RETURNING id`,
      [owner.id, areaId, `Post body ${tag} ${randomUUID()}`],
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

  /** Opens a case through the real report flow; returns its row and the reporter. */
  async function openCase(
    type: 'event' | 'post' | 'comment' | 'user',
    targetId: string,
    reasonGroup = 'scam',
    reporter?: Actor,
  ): Promise<{ row: CaseRow; reporter: Actor }> {
    const who = reporter ?? (await freshReporter());
    await report(who, { targetType: type, targetId, reasonGroup }).expect(201);
    return { row: await caseOf(type, targetId), reporter: who };
  }

  const caseOf = async (type: string, id: string): Promise<CaseRow> =>
    (
      await pool.query<CaseRow>(
        `SELECT id, case_number::text AS case_number, status, severity, auto_hidden,
                first_reported_at, first_response_at, sla_due_at, assigned_to_user_id,
                resolved_by_user_id, resolution_code
           FROM moderation_cases WHERE target_type = $1 AND target_id = $2
          ORDER BY created_at DESC LIMIT 1`,
        [type, id],
      )
    ).rows[0] as CaseRow;
  const caseById = async (id: string): Promise<CaseRow> =>
    (
      await pool.query<CaseRow>(
        `SELECT id, case_number::text AS case_number, status, severity, auto_hidden,
                first_reported_at, first_response_at, sla_due_at, assigned_to_user_id,
                resolved_by_user_id, resolution_code
           FROM moderation_cases WHERE id = $1`,
        [id],
      )
    ).rows[0] as CaseRow;
  const actionsOf = async (caseId: string) =>
    (await pool.query<ActionRow>(`SELECT * FROM moderation_actions WHERE case_id = $1 ORDER BY id`, [caseId])).rows;
  const auditOf = async (id: string) =>
    (await pool.query<AuditRow>(`SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY id`, [id])).rows;
  const eventStatus = async (id: string) =>
    (await pool.query<{ status: string }>(`SELECT status FROM events WHERE id = $1`, [id])).rows[0]?.status;
  const userRow = async (id: string) =>
    (
      await pool.query<{ status: string; suspended_until: Date | null }>(
        `SELECT status, suspended_until FROM users WHERE id = $1`,
        [id],
      )
    ).rows[0];

  const get = (path: string, who: Actor | null) => {
    const req = request(app.getHttpServer()).get(path);
    return who ? req.set(who.headers) : req;
  };
  const post = (path: string, who: Actor | null, body: unknown) => {
    const req = request(app.getHttpServer()).post(path);
    return (who ? req.set(who.headers) : req).send(body as object);
  };
  const assign = (n: string, who: Actor | null, body: object = {}) => post(`${BASE}/${n}/assign`, who, body);
  const severity = (n: string, who: Actor | null, level = 'critical', reasonNote = NOTE) =>
    post(`${BASE}/${n}/severity`, who, { severity: level, reasonNote });
  const decide = (n: string, who: Actor | null, body: object) =>
    post(`${BASE}/${n}/decisions`, who, {
      reasonCode: 'spam_advertising',
      reasonNote: NOTE,
      confirm: true,
      ...body,
    });

  /** Walks the queue pages until every wanted id is seen (the database is shared with dev data). */
  async function queueIds(
    who: Actor,
    wanted: string[],
    query = '',
  ): Promise<{ order: string[]; pages: number }> {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const url: string = `${BASE}?limit=100${query}${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await get(url, who).expect(200);
      pages += 1;
      for (const item of res.body.data.items as { id: string }[]) {
        if (wanted.includes(item.id)) seen.push(item.id);
      }
      cursor = res.body.data.nextCursor as string | null;
    } while (cursor && seen.length < wanted.length && pages < 60);
    return { order: seen, pages };
  }

  /** Short-lived super admin: the user-actions spec counts them on the shared database. */
  async function withSuperAdmin<T>(work: (who: Actor) => Promise<T>): Promise<T> {
    const who = await makeActor({ role: 'super_admin' });
    try {
      return await work(who);
    } finally {
      await pool.query(`UPDATE users SET role = 'member' WHERE id = $1`, [who.id]);
    }
  }

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    host = await makeActor({ trustLevel: 3 });
    author = await makeActor({ trustLevel: 3 });
    member = await makeActor({ trustLevel: 1 });
    curator = await makeActor({ trustLevel: 3, role: 'curator' });
    moderator = await makeActor({ trustLevel: 3, role: 'moderator' });
    moderator2 = await makeActor({ trustLevel: 3, role: 'moderator' });
    admin = await makeActor({ trustLevel: 3, role: 'admin' });
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const targets = [...eventIds, ...postIds, ...commentIds, ...actorIds];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE moderation_actions DISABLE TRIGGER trg_moderation_actions_guard_delete');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(
        `DELETE FROM moderation_actions
          WHERE actor_user_id = ANY($2::uuid[]) OR subject_user_id = ANY($2::uuid[])
             OR target_id = ANY($1::uuid[])`,
        [targets, actorIds],
      );
      await client.query(
        `DELETE FROM reports WHERE target_id = ANY($1::uuid[]) OR reporter_user_id = ANY($2::uuid[])`,
        [targets, actorIds],
      );
      await client.query(
        `DELETE FROM moderation_cases WHERE target_id = ANY($1::uuid[]) OR target_owner_user_id = ANY($2::uuid[])`,
        [targets, actorIds],
      );
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[]) OR actor_user_id = ANY($2::uuid[])`,
        [targets, actorIds],
      );
      await client.query('ALTER TABLE moderation_actions ENABLE TRIGGER trg_moderation_actions_guard_delete');
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

  describe('access (A4-AC-17)', () => {
    it('answers 401 to a guest on every route', async () => {
      const n = '1';
      await get(BASE, null).expect(401);
      await get(`${BASE}/${n}`, null).expect(401);
      await assign(n, null).expect(401);
      await severity(n, null).expect(401);
      await decide(n, null, { actionType: 'no_action' }).expect(401);
    });

    it('answers 403 ROLE_NOT_ALLOWED to member and curator on every route', async () => {
      for (const who of [member, curator]) {
        for (const res of [
          await get(BASE, who),
          await get(`${BASE}/1`, who),
          await assign('1', who),
          await severity('1', who),
          await decide('1', who, { actionType: 'no_action' }),
        ]) {
          expect(res.status).toBe(403);
          expect(res.body.code).toBe('ROLE_NOT_ALLOWED');
        }
      }
    });

    it('lets moderator, admin and super_admin read the queue and a case', async () => {
      const { row } = await openCase('event', await makeEvent());
      for (const who of [moderator, admin]) {
        await get(BASE, who).expect(200);
        await get(`${BASE}/${row.case_number}`, who).expect(200);
      }
      await withSuperAdmin(async (who) => {
        await get(BASE, who).expect(200);
        await get(`${BASE}/${row.case_number}`, who).expect(200);
      });
    });

    it('answers 404 CASE_NOT_FOUND for an unknown case and 400 for a malformed number', async () => {
      const res = await get(`${BASE}/9000000000000`, moderator).expect(404);
      expect(res.body.code).toBe('CASE_NOT_FOUND');
      for (const bad of ['007', '1e3', 'abc', '-1']) {
        const r = await get(`${BASE}/${bad}`, moderator);
        expect(r.status, bad).toBeGreaterThanOrEqual(400);
        expect(r.status, bad).toBeLessThan(500);
      }
      await assign('9000000000000', moderator).expect(404);
    });

    it('re-reads the role: a demoted moderator holding an old token is refused', async () => {
      const stale = await makeActor({ role: 'moderator' });
      const { row } = await openCase('event', await makeEvent());
      await pool.query(`UPDATE users SET role = 'member' WHERE id = $1`, [stale.id]);
      await assign(row.case_number, stale).expect(403);
      await decide(row.case_number, stale, { actionType: 'no_action' }).expect(403);
      expect((await caseById(row.id)).status).toBe('open');
    });
  });

  describe('queue (A4-AC-2, A4-AC-13)', () => {
    it('orders by severity then deadline and pages with a keyset cursor', async () => {
      const low = (await openCase('event', await makeEvent(), 'other')).row;
      const normalA = (await openCase('event', await makeEvent(), 'spam')).row;
      const critical = (await openCase('event', await makeEvent(), 'danger')).row;
      const normalB = (await openCase('event', await makeEvent(), 'spam')).row;
      const high = (await openCase('event', await makeEvent(), 'scam')).row;
      const wanted = [low, normalA, critical, normalB, high].map((c) => c.id);

      const { order } = await queueIds(moderator, wanted);
      expect(order).toEqual([critical.id, high.id, normalA.id, normalB.id, low.id]);

      // The same through one-item pages: no duplicate, no gap, same order.
      const walked: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 200 && walked.length < wanted.length; page += 1) {
        const res = await get(`${BASE}?limit=1${cursor ? `&cursor=${cursor}` : ''}`, moderator).expect(200);
        for (const item of res.body.data.items as { id: string }[]) {
          if (wanted.includes(item.id)) walked.push(item.id);
        }
        cursor = res.body.data.nextCursor as string | null;
        if (!cursor) break;
      }
      expect(walked).toEqual(order);
    });

    it('returns items matching the contract, with an SLA state, an excerpt and stats', async () => {
      const id = await makeEvent();
      const { row } = await openCase('event', id, 'scam');
      await pool.query(`UPDATE moderation_cases SET sla_due_at = now() - interval '20 minutes' WHERE id = $1`, [row.id]);
      const res = await get(`${BASE}?limit=100&severity=high&assignee=unassigned&overdue=true`, moderator).expect(200);
      expect(AdminModerationQueueResponse.safeParse(res.body.data).success).toBe(true);
      const item = (res.body.data.items as Record<string, unknown>[]).find((i) => i['id'] === row.id);
      expect(item).toMatchObject({
        caseNumber: Number(row.case_number),
        targetType: 'event',
        targetId: id,
        severity: 'high',
        status: 'open',
        slaState: 'overdue',
        assignee: null,
        autoHidden: false,
        reportCount: 1,
      });
      expect(item?.['targetExcerpt']).toContain(`Moderation event ${tag}`);
      expect(res.body.data.stats.overdue).toBeGreaterThanOrEqual(1);
      expect(res.body.data.stats.open).toBeGreaterThanOrEqual(res.body.data.stats.overdue);
    });

    it('reports due_soon within the last hour and ok before it', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      const state = async () => {
        const res = await get(`${BASE}/${row.case_number}`, moderator).expect(200);
        return res.body.data.slaState as string;
      };
      expect(await state()).toBe('ok');
      await pool.query(`UPDATE moderation_cases SET sla_due_at = now() + interval '30 minutes' WHERE id = $1`, [row.id]);
      expect(await state()).toBe('due_soon');
      await pool.query(`UPDATE moderation_cases SET sla_due_at = now() - interval '1 minute' WHERE id = $1`, [row.id]);
      expect(await state()).toBe('overdue');
    });

    it('filters by assignee, status and target type', async () => {
      const eventCase = (await openCase('event', await makeEvent(), 'spam')).row;
      const postCase = (await openCase('post', await makePost(), 'spam')).row;
      await assign(eventCase.case_number, moderator).expect(200);
      const ids = [eventCase.id, postCase.id];
      expect((await queueIds(moderator, ids, '&assignee=me')).order).toEqual([eventCase.id]);
      expect((await queueIds(moderator, ids, '&assignee=unassigned')).order).toEqual([postCase.id]);
      expect((await queueIds(moderator, ids, '&status=in_review')).order).toEqual([eventCase.id]);
      expect((await queueIds(moderator, ids, '&targetType=post')).order).toEqual([postCase.id]);
      for (const bad of ['&severity=urgent', '&limit=500', '&overdue=maybe', '&sort=id', '&status=resolved']) {
        const res = await get(`${BASE}?x=1${bad}`, moderator);
        expect(res.status, bad).toBe(400);
        expect(res.body.code).toBe('ADMIN_QUERY_INVALID');
      }
      const res = await get(`${BASE}?cursor=garbage`, moderator).expect(400);
      expect(res.body.code).toBe('ADMIN_CURSOR_INVALID');
    });

    it('drops closed cases from the queue', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      expect((await queueIds(moderator, [row.id])).order).toEqual([]);
    });
  });

  describe('conflict of interest (A4-AC-12)', () => {
    it('hides a case from the organizer, the reporter and the reported owner, and refuses them', async () => {
      const organizer = await makeActor({ role: 'moderator', trustLevel: 3 });
      const reporterMod = await makeActor({ role: 'moderator', trustLevel: 3 });
      const ownerMod = await makeActor({ role: 'moderator', trustLevel: 3 });

      const byOrganizer = (await openCase('event', await makeEvent(organizer), 'spam')).row;
      const byReporter = (await openCase('event', await makeEvent(host), 'spam', reporterMod)).row;
      const byOwner = (await openCase('post', await makePost(ownerMod), 'spam')).row;

      const cases: [Actor, CaseRow][] = [
        [organizer, byOrganizer],
        [reporterMod, byReporter],
        [ownerMod, byOwner],
      ];
      for (const [who, row] of cases) {
        expect((await queueIds(who, [row.id])).order, row.case_number).toEqual([]);
        // The other moderator sees it.
        expect((await queueIds(moderator, [row.id])).order, row.case_number).toEqual([row.id]);
        for (const res of [
          await get(`${BASE}/${row.case_number}`, who),
          await assign(row.case_number, who),
          await severity(row.case_number, who, 'critical'),
          await decide(row.case_number, who, { actionType: 'no_action' }),
        ]) {
          expect(res.status, row.case_number).toBe(403);
          expect(res.body, row.case_number).toEqual({
            code: 'CONFLICT_OF_INTEREST',
            messageKey: 'errors.admin.conflictOfInterest',
          });
        }
        expect((await caseById(row.id)).status).toBe('open');
      }
    });

    it('refuses to assign a case to a conflicted person, and stats leave their cases out', async () => {
      const organizer = await makeActor({ role: 'moderator', trustLevel: 3 });
      const { row } = await openCase('event', await makeEvent(organizer), 'spam');
      const res = await assign(row.case_number, admin, { assigneeId: organizer.id }).expect(403);
      expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
      expect((await caseById(row.id)).assigned_to_user_id).toBeNull();
    });

    it('has the database refuse a conflicted resolver and assignee as well', async () => {
      const organizer = await makeActor({ role: 'moderator', trustLevel: 3 });
      const { row } = await openCase('event', await makeEvent(organizer), 'spam');
      const code = async (sql: string): Promise<unknown> => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql, [row.id, organizer.id]);
          return 'accepted';
        } catch (error) {
          return { code: (error as { code?: string }).code, message: (error as Error).message };
        } finally {
          await client.query('ROLLBACK').catch(() => undefined);
          client.release();
        }
      };
      const rejection = {
        code: 'P0001',
        message: expect.stringContaining('INV-4') as unknown,
      };
      expect(
        await code(
          `UPDATE moderation_cases SET status = 'resolved', resolved_by_user_id = $2,
                  resolution_code = 'no_violation', resolved_at = now() WHERE id = $1`,
        ),
      ).toEqual(rejection);
      expect(await code(`UPDATE moderation_cases SET assigned_to_user_id = $2 WHERE id = $1`)).toEqual(rejection);
    });

    it('maps the trigger error to 403 CONFLICT_OF_INTEREST when the service check is bypassed', async () => {
      const organizer = await makeActor({ role: 'moderator', trustLevel: 3 });
      const { row } = await openCase('event', await makeEvent(organizer), 'spam');
      vi.spyOn(app.get(AdminModerationRepository), 'hasConflict').mockResolvedValue(false);
      const res = await decide(row.case_number, organizer, { actionType: 'no_action' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
      // The whole decision rolled back with the trigger error.
      expect((await caseById(row.id)).status).toBe('open');
      expect(await actionsOf(row.id)).toHaveLength(0);
    });
  });

  describe('conflict of interest of the caller (AD-15b)', () => {
    it('refuses a conflicted admin handing the case to someone else, with no trace', async () => {
      const ownerAdmin = await makeActor({ role: 'admin', trustLevel: 3 });
      const reporterAdmin = await makeActor({ role: 'admin', trustLevel: 3 });
      const organizerAdmin = await makeActor({ role: 'admin', trustLevel: 3 });
      const cases = [
        (await openCase('post', await makePost(ownerAdmin), 'spam')).row,
        (await openCase('event', await makeEvent(host), 'spam', reporterAdmin)).row,
        (await openCase('event', await makeEvent(organizerAdmin), 'spam')).row,
      ];
      const callers = [ownerAdmin, reporterAdmin, organizerAdmin];
      for (const [i, row] of cases.entries()) {
        const res = await assign(row.case_number, callers[i] as Actor, { assigneeId: moderator.id });
        expect(res.status, row.case_number).toBe(403);
        expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
        const after = await caseById(row.id);
        expect(after).toMatchObject({ status: 'open', assigned_to_user_id: null, first_response_at: null });
        expect((await auditOf(row.id)).filter((l) => l.action === 'moderation_case.assigned')).toHaveLength(0);
      }
    });

    it('answers 403, not 409, to a conflicted caller on a closed case', async () => {
      const organizer = await makeActor({ role: 'moderator', trustLevel: 3 });
      const { row } = await openCase('event', await makeEvent(organizer), 'spam');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      for (const res of [
        await assign(row.case_number, organizer),
        await severity(row.case_number, organizer, 'critical'),
        await decide(row.case_number, organizer, { actionType: 'no_action' }),
      ]) {
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
      }
    });
  });

  describe('assign (A4-AC-13)', () => {
    it('takes a case, sets first_response_at once and audits it', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      const res = await assign(row.case_number, moderator).expect(200);
      expect(res.body.data).toMatchObject({
        id: row.id,
        caseNumber: Number(row.case_number),
        status: 'in_review',
        assignee: { id: moderator.id, handle: moderator.handle },
      });
      const first = (await caseById(row.id)).first_response_at as Date;
      expect(first.toISOString()).toBe(res.body.data.firstResponseAt);

      // An admin reassigns later: the first response does not move.
      await assign(row.case_number, admin, { assigneeId: moderator2.id }).expect(200);
      const after = await caseById(row.id);
      expect(after.assigned_to_user_id).toBe(moderator2.id);
      expect(after.first_response_at?.getTime()).toBe(first.getTime());

      const lines = (await auditOf(row.id)).filter((l) => l.action === 'moderation_case.assigned');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatchObject({ actor_type: 'staff', actor_user_id: moderator.id, entity_type: 'moderation_case' });
    });

    it('is a quiet no-op when the case is already theirs', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      await assign(row.case_number, moderator).expect(200);
      await assign(row.case_number, moderator).expect(200);
      expect((await auditOf(row.id)).filter((l) => l.action === 'moderation_case.assigned')).toHaveLength(1);
    });

    it('refuses a moderator naming someone else or taking a case another moderator holds', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      const named = await assign(row.case_number, moderator, { assigneeId: moderator2.id }).expect(403);
      expect(named.body.code).toBe('ROLE_NOT_ALLOWED');
      await assign(row.case_number, moderator).expect(200);
      const taken = await assign(row.case_number, moderator2).expect(409);
      expect(taken.body.code).toBe('INVALID_TRANSITION');
      expect((await caseById(row.id)).assigned_to_user_id).toBe(moderator.id);
    });

    it('refuses an assignee who is not active staff and an unknown one', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      expect((await assign(row.case_number, admin, { assigneeId: member.id })).status).toBe(409);
      expect((await assign(row.case_number, admin, { assigneeId: unknownId() })).status).toBe(404);
      expect((await assign(row.case_number, admin, { assigneeId: 'nope' })).status).toBe(400);
      expect((await assign(row.case_number, admin, { extra: 1 })).status).toBe(400);
      expect((await caseById(row.id)).assigned_to_user_id).toBeNull();
    });

    it('answers 409 for a closed case', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      expect((await assign(row.case_number, moderator2)).status).toBe(409);
    });
  });

  describe('severity (D-M4, D-M5)', () => {
    it('raises the level and keeps the earlier deadline, logging the change', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      const res = await severity(row.case_number, moderator, 'critical').expect(200);
      expect(res.body.data).toMatchObject({ caseNumber: Number(row.case_number), severity: 'critical' });
      const after = await caseById(row.id);
      expect(after.severity).toBe('critical');
      // normal gave 48h, critical gives 2h: the earlier one wins.
      expect(after.sla_due_at.getTime()).toBe(row.first_reported_at.getTime() + 2 * HOUR_MS);
      expect(res.body.data.slaDueAt).toBe(after.sla_due_at.toISOString());

      const [action] = await actionsOf(row.id);
      expect(action).toMatchObject({ action_type: 'severity_changed', actor_user_id: moderator.id, actor_role: 'moderator' });
      const lines = (await auditOf(row.id)).filter((l) => l.action === 'moderation_case.severity_changed');
      expect(lines).toHaveLength(1);
      expect(lines[0]?.before).toMatchObject({ severity: 'normal' });
      expect(lines[0]?.after).toMatchObject({ severity: 'critical' });
    });

    it('never grants time back when the level is lowered', async () => {
      const { row } = await openCase('event', await makeEvent(), 'danger');
      const before = (await caseById(row.id)).sla_due_at;
      await severity(row.case_number, moderator, 'low').expect(200);
      const after = await caseById(row.id);
      expect(after.severity).toBe('low');
      expect(after.sla_due_at.getTime()).toBe(before.getTime());
    });

    it('rejects the same level, a short note and a closed case, changing nothing', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      expect((await severity(row.case_number, moderator, 'normal')).status).toBe(409);
      expect((await severity(row.case_number, moderator, 'high', 'too short')).status).toBe(400);
      expect((await severity(row.case_number, moderator, 'urgent')).status).toBe(400);
      expect(await actionsOf(row.id)).toHaveLength(0);
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      expect((await severity(row.case_number, moderator, 'high')).status).toBe(409);
    });
  });

  describe('case detail (D-M9)', () => {
    it('shows the snapshot beside the current state, reporters by handle and trust only', async () => {
      const id = await makeEvent();
      const reporter = await freshReporter();
      const { row } = await openCase('event', id, 'scam', reporter);
      await report(await freshReporter(), { targetType: 'event', targetId: id, reasonGroup: 'spam', description: 'seems off' }).expect(201);
      await pool.query(`UPDATE events SET title = 'Edited after the report' WHERE id = $1`, [id]);

      const res = await get(`${BASE}/${row.case_number}`, moderator).expect(200);
      const data = res.body.data;
      expect(AdminModerationCaseDetailResponse.safeParse(data).success).toBe(true);
      expect(data.target).toMatchObject({
        type: 'event',
        id,
        currentStatus: 'published',
        currentExcerpt: 'Edited after the report',
      });
      expect(data.target.snapshot.title).toContain(`Moderation event ${tag}`);
      expect(data.owner).toMatchObject({ id: host.id, handle: host.handle, role: 'member', status: 'active', activeStrikes: 0 });
      expect(data.reportCount).toBe(2);
      expect(data.reports).toHaveLength(2);
      expect(data.reports[0].reporter).toEqual({ handle: reporter.handle, trustLevel: 2 });
      expect(Object.keys(data.reports[0]).toSorted()).toEqual(
        ['createdAt', 'description', 'id', 'reasonGroup', 'reporter', 'severity'],
      );

      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain(reporter.email);
      expect(raw).not.toContain(reporter.id);
      expect(raw).not.toContain(host.email);
      expect(raw).not.toMatch(/email|phone|"ip"|passwordHash|password_hash|userAgent/i);
    });

    it('lists the actions and counts strikes in force', async () => {
      const { row } = await openCase('event', await makeEvent(), 'scam');
      await decide(row.case_number, moderator, { actionType: 'warning', closeCase: false, reasonCode: 'financial_scam' }).expect(200);
      const res = await get(`${BASE}/${row.case_number}`, moderator).expect(200);
      expect(res.body.data.status).toBe('in_review');
      expect(res.body.data.owner.activeStrikes).toBe(1);
      expect(res.body.data.actions).toEqual([
        expect.objectContaining({ actionType: 'warning', actorHandle: moderator.handle, actorRole: 'moderator', strikeWeight: 1, reasonCode: 'financial_scam' }),
      ]);
      // A revoked strike no longer counts.
      await pool.query(`UPDATE moderation_actions SET revoked_at = now() WHERE case_id = $1`, [row.id]);
      const after = await get(`${BASE}/${row.case_number}`, moderator).expect(200);
      expect(after.body.data.owner.activeStrikes).toBe(0);
    });
  });

  describe('decide (A4-AC-5, A4-AC-6, A4-AC-18)', () => {
    it('dismisses an auto-hidden post: restored, clean, resolved, reports closed (A4-AC-5)', async () => {
      const postId = await makePost();
      const { row, reporter } = await openCase('post', postId, 'danger');
      expect(row.auto_hidden).toBe(true);
      expect((await pool.query(`SELECT status FROM posts WHERE id = $1`, [postId])).rows[0].status).toBe('hidden');

      await assign(row.case_number, moderator).expect(200);
      const res = await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      expect(DecideCaseResult.safeParse(res.body.data).success).toBe(true);
      expect(res.body.data).toMatchObject({ status: 'resolved', caseNumber: Number(row.case_number) });

      const { rows } = await pool.query(`SELECT status, moderation_state FROM posts WHERE id = $1`, [postId]);
      expect(rows[0]).toEqual({ status: 'visible', moderation_state: 'clean' });
      const closed = await caseById(row.id);
      expect(closed).toMatchObject({ status: 'resolved', resolution_code: 'no_violation', resolved_by_user_id: moderator.id });
      const actions = await actionsOf(row.id);
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({ id: res.body.data.actionId, action_type: 'no_action', actor_role: 'moderator', reason_code: 'spam_advertising' });
      const decisionAudits = (await auditOf(postId)).filter((l) => l.actor_type === 'staff');
      expect(decisionAudits).toHaveLength(1);
      expect(decisionAudits[0]).toMatchObject({ action: 'post.restored', entity_type: 'post', before: { status: 'hidden' }, after: { status: 'visible', caseNumber: Number(row.case_number) } });

      // The reporter's report is resolved, so they may report again (A4-AC-9).
      const status = await pool.query(`SELECT status FROM reports WHERE case_id = $1`, [row.id]);
      expect(status.rows).toEqual([{ status: 'resolved' }]);
      await report(reporter, { targetType: 'post', targetId: postId, reasonGroup: 'spam' }).expect(201);
    });

    it('does not auto-hide a critical report within the cooldown after a no_violation close', async () => {
      const postId = await makePost();
      const { row } = await openCase('post', postId, 'danger');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);

      const again = await openCase('post', postId, 'danger');
      expect(again.row.id).not.toBe(row.id);
      expect(again.row).toMatchObject({ severity: 'critical', auto_hidden: false });
      expect((await pool.query(`SELECT status FROM posts WHERE id = $1`, [postId])).rows[0].status).toBe('visible');
      // It still reaches the queue at critical.
      expect((await queueIds(moderator, [again.row.id])).order).toEqual([again.row.id]);
    });

    it('dismisses an auto-hidden event back to its status before the hide', async () => {
      const id = await makeEvent(host, 'published');
      const { row } = await openCase('event', id, 'danger');
      expect(await eventStatus(id)).toBe('suspended');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      // The source status comes from the system audit line of the hide (AD-9).
      expect(await eventStatus(id)).toBe('published');
      const restored = (await auditOf(id)).filter((l) => l.action === 'event.restored');
      expect(restored).toHaveLength(1);
      expect(restored[0]).toMatchObject({ actor_type: 'staff', before: { status: 'suspended' }, after: { status: 'published' } });
    });

    it('does not restore an event that was restored and then suspended again by staff', async () => {
      const id = await makeEvent(host, 'published');
      const { row } = await openCase('event', id, 'danger');
      expect(await eventStatus(id)).toBe('suspended');
      const staffReason = { reason: 'Reviewed the hide and decided otherwise', confirm: true };
      await post(`/api/v1/admin/events/${id}/restore`, moderator, staffReason).expect(200);
      expect(await eventStatus(id)).toBe('published');
      await post(`/api/v1/admin/events/${id}/suspend`, moderator, { ...staffReason, reason: 'Suspended again for a separate concern' }).expect(200);
      expect(await eventStatus(id)).toBe('suspended');

      await decide(row.case_number, moderator2, { actionType: 'no_action' }).expect(200);
      // The newest hide is the staff one, not this case's automatic hide: stay suspended.
      expect(await eventStatus(id)).toBe('suspended');
      expect((await caseById(row.id)).status).toBe('resolved');
    });

    it('keeps a hidden event hidden when the case already hid it by decision', async () => {
      const id = await makeEvent(host, 'published');
      const { row } = await openCase('event', id, 'danger');
      await decide(row.case_number, moderator, { actionType: 'content_hidden', closeCase: false }).expect(200);
      expect(await eventStatus(id)).toBe('suspended');
      await decide(row.case_number, moderator, { actionType: 'no_action' }).expect(200);
      expect(await eventStatus(id)).toBe('suspended');
    });

    it('hides an event, then lets an admin remove it; a moderator may not (A4-AC-6)', async () => {
      const hideId = await makeEvent();
      const hideCase = (await openCase('event', hideId, 'scam')).row;
      const hidden = await decide(hideCase.case_number, moderator, { actionType: 'content_hidden' }).expect(200);
      expect(hidden.body.data.status).toBe('resolved');
      expect(await eventStatus(hideId)).toBe('suspended');
      expect((await caseById(hideCase.id)).resolution_code).toBe('violation_confirmed');
      expect((await actionsOf(hideCase.id)).map((a) => a.action_type)).toEqual(['content_hidden']);
      const hideAudit = (await auditOf(hideId)).filter((l) => l.actor_type === 'staff');
      expect(hideAudit).toHaveLength(1);
      expect(hideAudit[0]).toMatchObject({ action: 'event.suspended', before: { status: 'published' }, after: { status: 'suspended' } });

      const removeId = await makeEvent();
      const removeCase = (await openCase('event', removeId, 'scam')).row;
      const denied = await decide(removeCase.case_number, moderator, { actionType: 'content_removed' }).expect(403);
      expect(denied.body.code).toBe('ROLE_NOT_ALLOWED');
      expect(await eventStatus(removeId)).toBe('published');
      expect((await caseById(removeCase.id)).status).toBe('open');
      expect(await actionsOf(removeCase.id)).toHaveLength(0);

      await decide(removeCase.case_number, admin, { actionType: 'content_removed' }).expect(200);
      expect(await eventStatus(removeId)).toBe('taken_down');
      expect((await actionsOf(removeCase.id)).map((a) => a.action_type)).toEqual(['content_removed']);
      expect((await auditOf(removeId)).filter((l) => l.actor_type === 'staff')[0]).toMatchObject({ action: 'event.taken_down' });
      // Not reversible by a second decision.
      expect((await decide(removeCase.case_number, admin, { actionType: 'content_removed' })).status).toBe(409);
    });

    it('hides and removes posts and comments with their moderation state', async () => {
      const postId = await makePost();
      const postCase = (await openCase('post', postId, 'spam')).row;
      await decide(postCase.case_number, moderator, { actionType: 'content_hidden' }).expect(200);
      expect((await pool.query(`SELECT status, moderation_state FROM posts WHERE id = $1`, [postId])).rows[0]).toEqual({ status: 'hidden', moderation_state: 'actioned' });

      const commentId = await makeComment(await makePost());
      const commentCase = (await openCase('comment', commentId, 'spam')).row;
      await decide(commentCase.case_number, moderator, { actionType: 'content_removed' }).expect(200);
      expect((await pool.query(`SELECT status, moderation_state FROM comments WHERE id = $1`, [commentId])).rows[0]).toEqual({ status: 'removed', moderation_state: 'actioned' });
      expect((await auditOf(commentId)).filter((l) => l.actor_type === 'staff')[0]).toMatchObject({ action: 'comment.removed' });
    });

    it('refuses hide or remove on a profile and on content already removed', async () => {
      const userCase = (await openCase('user', author.id, 'spam')).row;
      expect((await decide(userCase.case_number, moderator, { actionType: 'content_hidden' })).status).toBe(409);
      expect((await decide(userCase.case_number, moderator, { actionType: 'content_removed' })).status).toBe(409);
      expect((await caseById(userCase.id)).status).toBe('open');
      expect(await actionsOf(userCase.id)).toHaveLength(0);
    });

    it('records a warning as one strike and can stack actions before closing', async () => {
      const id = await makeEvent();
      const { row } = await openCase('event', id, 'scam');
      const hide = await decide(row.case_number, moderator, { actionType: 'content_hidden', closeCase: false }).expect(200);
      expect(hide.body.data.status).toBe('in_review');
      expect((await caseById(row.id)).first_response_at).not.toBeNull();
      const warn = await decide(row.case_number, moderator, { actionType: 'warning', reasonCode: 'financial_scam' }).expect(200);
      expect(warn.body.data.status).toBe('resolved');

      const actions = await actionsOf(row.id);
      expect(actions.map((a) => a.action_type)).toEqual(['content_hidden', 'warning']);
      expect(actions[1]).toMatchObject({ strike_weight: 1, subject_user_id: host.id, reason_code: 'financial_scam' });
      const warned = (await auditOf(host.id)).filter(
        (l) => l.action === 'user.warned' && l.after?.['caseNumber'] === Number(row.case_number),
      );
      expect(warned).toHaveLength(1);
    });

    it('closes with an explicit resolution code and rejects contradictions', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      expect((await decide(row.case_number, moderator, { actionType: 'no_action', resolutionCode: 'violation_confirmed' })).status).toBe(400);
      expect((await decide(row.case_number, moderator, { actionType: 'content_hidden', resolutionCode: 'no_violation' })).status).toBe(400);
      expect((await decide(row.case_number, moderator, { actionType: 'no_action', closeCase: false, resolutionCode: 'malicious_report' })).status).toBe(400);
      await decide(row.case_number, moderator, { actionType: 'no_action', resolutionCode: 'malicious_report' }).expect(200);
      expect((await caseById(row.id)).resolution_code).toBe('malicious_report');
    });

    it('validates the body: confirm, note length, unknown fields, expiresAt pairing', async () => {
      const { row } = await openCase('event', await makeEvent(), 'spam');
      const confirmMissing = await post(`${BASE}/${row.case_number}/decisions`, moderator, { actionType: 'no_action', reasonCode: 'other', reasonNote: NOTE });
      expect(confirmMissing.status).toBe(400);
      expect(confirmMissing.body.code).toBe('CONFIRMATION_REQUIRED');
      const bodies: object[] = [
        { actionType: 'no_action', reasonNote: 'too short' },
        { actionType: 'no_action', reasonNote: 'x'.repeat(2001) },
        { actionType: 'no_action', reasonCode: 'not_a_reason' },
        { actionType: 'banned' },
        { actionType: 'no_action', extra: true },
        { actionType: 'suspended' },
        { actionType: 'content_hidden', expiresAt: new Date(Date.now() + DAY_MS).toISOString() },
      ];
      for (const body of bodies) {
        expect((await decide(row.case_number, moderator, body)).status, JSON.stringify(body)).toBe(400);
      }
      expect(await actionsOf(row.id)).toHaveLength(0);
      expect((await caseById(row.id)).status).toBe('open');
    });

    it('lets exactly one of two concurrent decisions through (A4-AC-15)', async () => {
      const id = await makeEvent();
      const { row } = await openCase('event', id, 'scam');
      const results = await Promise.all([
        decide(row.case_number, moderator, { actionType: 'content_hidden' }),
        decide(row.case_number, moderator2, { actionType: 'content_hidden' }),
      ]);
      expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([200, 409]);
      const loser = results.find((r) => r.status === 409);
      expect(loser?.body.code).toBe('INVALID_TRANSITION');
      expect(await actionsOf(row.id)).toHaveLength(1);
      expect((await auditOf(id)).filter((l) => l.actor_type === 'staff')).toHaveLength(1);
      expect(await eventStatus(id)).toBe('suspended');
    });

    it('rolls back content, case and actions when the audit write fails (A4-AC-16)', async () => {
      const id = await makeEvent();
      const { row } = await openCase('event', id, 'scam');
      vi.spyOn(app.get(AuditService), 'record').mockRejectedValue(new Error('audit down'));
      const res = await decide(row.case_number, moderator, { actionType: 'content_hidden' });
      expect(res.status).toBe(500);
      vi.restoreAllMocks();

      expect(await eventStatus(id)).toBe('published');
      const after = await caseById(row.id);
      expect(after).toMatchObject({ status: 'open', resolved_by_user_id: null, first_response_at: null });
      expect(await actionsOf(row.id)).toHaveLength(0);
      const reports = await pool.query(`SELECT status FROM reports WHERE case_id = $1`, [row.id]);
      expect(reports.rows).toEqual([{ status: 'open' }]);
      // The decision works once the audit is back.
      await decide(row.case_number, moderator, { actionType: 'content_hidden' }).expect(200);
    });
  });

  describe('time-limited suspension (A4-AC-7, D-M12)', () => {
    const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

    async function suspensionCase(owner: Actor, reasonGroup = 'scam') {
      const postId = await makePost(owner);
      return (await openCase('post', postId, reasonGroup)).row;
    }

    it('suspends a member for 7 days, cuts the session and logs it (A4-AC-7)', async () => {
      const owner = await makeActor({ trustLevel: 1 });
      const row = await suspensionCase(owner);
      const expiresAt = inDays(7);
      const res = await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt, reasonCode: 'financial_scam' }).expect(200);
      expect(res.body.data.status).toBe('resolved');

      const user = await userRow(owner.id);
      expect(user?.status).toBe('suspended');
      expect(user?.suspended_until?.toISOString()).toBe(expiresAt);
      const [action] = await actionsOf(row.id);
      expect(action).toMatchObject({ action_type: 'suspended', subject_user_id: owner.id, reason_code: 'financial_scam' });
      expect(action?.expires_at?.toISOString()).toBe(expiresAt);
      const live = await pool.query(`SELECT count(*)::int AS n FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`, [owner.id]);
      expect(live.rows[0].n).toBe(0);
      const audit = (await auditOf(owner.id)).filter((l) => l.action === 'user.suspended');
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actor_type: 'staff', actor_user_id: moderator.id, before: { status: 'active' } });
      // The old token is refused at once.
      const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set(owner.headers);
      expect(me.status).toBe(403);
    });

    it('answers 400 DURATION_TOO_LONG for a moderator at 31 days and changes nothing', async () => {
      const owner = await makeActor({ trustLevel: 1 });
      const row = await suspensionCase(owner);
      const res = await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(31) });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 'DURATION_TOO_LONG', messageKey: 'errors.admin.durationTooLong' });
      expect((await userRow(owner.id))?.status).toBe('active');
      expect(await actionsOf(row.id)).toHaveLength(0);
      expect((await caseById(row.id)).status).toBe('open');
      // An admin has no cap.
      await decide(row.case_number, admin, { actionType: 'suspended', expiresAt: inDays(31) }).expect(200);
    });

    it('accepts a moderator at 29 days and refuses a past or malformed expiry', async () => {
      const owner = await makeActor({ trustLevel: 1 });
      const row = await suspensionCase(owner);
      for (const expiresAt of [inDays(-1), 'tomorrow', new Date(Date.now() - 1000).toISOString()]) {
        expect((await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt })).status, expiresAt).toBe(400);
      }
      expect((await userRow(owner.id))?.status).toBe('active');
      await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(29) }).expect(200);
    });

    it('refuses staff owners: moderator reaches members only, admin not admins', async () => {
      const modOwner = await makeActor({ role: 'moderator', trustLevel: 3 });
      const adminOwner = await makeActor({ role: 'admin', trustLevel: 3 });
      const curatorOwner = await makeActor({ role: 'curator', trustLevel: 3 });

      const modCase = await suspensionCase(modOwner);
      const denied = await decide(modCase.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(3) });
      expect(denied.status).toBe(403);
      expect(denied.body.code).toBe('TARGET_ROLE_PROTECTED');
      expect((await userRow(modOwner.id))?.status).toBe('active');
      // An admin may suspend a moderator.
      await decide(modCase.case_number, admin, { actionType: 'suspended', expiresAt: inDays(3) }).expect(200);

      const curatorCase = await suspensionCase(curatorOwner);
      expect((await decide(curatorCase.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(3) })).status).toBe(403);

      const adminCase = await suspensionCase(adminOwner);
      const byAdmin = await decide(adminCase.case_number, admin, { actionType: 'suspended', expiresAt: inDays(3) });
      expect(byAdmin.status).toBe(403);
      expect(byAdmin.body.code).toBe('TARGET_ROLE_PROTECTED');
      expect((await userRow(adminOwner.id))?.status).toBe('active');
      expect(await actionsOf(adminCase.id)).toHaveLength(0);
    });

    it('answers 409 when the owner is already suspended', async () => {
      const owner = await makeActor({ trustLevel: 1 });
      const row = await suspensionCase(owner);
      await pool.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [owner.id]);
      expect((await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(3) })).status).toBe(409);
    });

    it('lifts an expired suspension at sign-in without the job, with a job audit line', async () => {
      const owner = await makeActor({ trustLevel: 1 });
      const row = await suspensionCase(owner);
      await decide(row.case_number, moderator, { actionType: 'suspended', expiresAt: inDays(7) }).expect(200);
      const blocked = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: owner.email, password: 'e2e-password-long-enough' });
      expect(blocked.status).toBe(403);

      await pool.query(`UPDATE users SET suspended_until = now() - interval '1 minute' WHERE id = $1`, [owner.id]);
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: owner.email, password: 'e2e-password-long-enough' });
      expect(login.status).toBe(200);
      expect((await userRow(owner.id))).toMatchObject({ status: 'active', suspended_until: null });
      const lines = (await auditOf(owner.id)).filter((l) => l.action === 'user.unsuspended');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ actor_type: 'job', actor_user_id: null, before: { status: 'suspended' }, after: { status: 'active' } });
    });

    it('does not lift an open-ended suspension or one not yet due at sign-in', async () => {
      const open = await makeActor({ trustLevel: 1 });
      const later = await makeActor({ trustLevel: 1 });
      await pool.query(`UPDATE users SET status = 'suspended' WHERE id = ANY($1::uuid[])`, [[open.id, later.id]]);
      await pool.query(`UPDATE users SET suspended_until = now() + interval '1 day' WHERE id = $1`, [later.id]);
      for (const who of [open, later]) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ identifier: who.email, password: 'e2e-password-long-enough' });
        expect(res.status).toBe(403);
        expect((await userRow(who.id))?.status).toBe('suspended');
      }
    });

    it('runs the scheduled pass: lifts due accounts once, audits as job, idempotent', async () => {
      const scheduler = app.get(ExpireSuspensionsScheduler);
      const queueRedis = app.get<Redis>(REDIS_QUEUE);
      await queueRedis.del(EXPIRE_SUSPENSIONS_LOCK_KEY).catch(() => undefined);

      const due = await makeActor({ trustLevel: 1 });
      const notDue = await makeActor({ trustLevel: 1 });
      const openEnded = await makeActor({ trustLevel: 1 });
      await pool.query(`UPDATE users SET status = 'suspended' WHERE id = ANY($1::uuid[])`, [[due.id, notDue.id, openEnded.id]]);
      await pool.query(`UPDATE users SET suspended_until = now() - interval '2 minutes' WHERE id = $1`, [due.id]);
      await pool.query(`UPDATE users SET suspended_until = now() + interval '2 days' WHERE id = $1`, [notDue.id]);

      const lifted = await scheduler.tick();
      expect(lifted).toBeGreaterThanOrEqual(1);
      expect((await userRow(due.id))?.status).toBe('active');
      expect((await userRow(notDue.id))?.status).toBe('suspended');
      expect((await userRow(openEnded.id))?.status).toBe('suspended');
      const lines = (await auditOf(due.id)).filter((l) => l.action === 'user.unsuspended');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ actor_type: 'job' });

      // The fixed lock key makes a second tick inside the minute a no-op: the schedule does not multiply.
      expect(await scheduler.tick()).toBeNull();
      await queueRedis.del(EXPIRE_SUSPENSIONS_LOCK_KEY);
      await scheduler.tick();
      expect((await auditOf(due.id)).filter((l) => l.action === 'user.unsuspended')).toHaveLength(1);
      await queueRedis.del(EXPIRE_SUSPENSIONS_LOCK_KEY);
    });
  });

  describe('scheduler with an unreachable Redis (AD-15b)', () => {
    it('still lifts due accounts within the lock timeout and does not stack commands', async () => {
      const scheduler = app.get(ExpireSuspensionsScheduler);
      const queueRedis = app.get<Redis>(REDIS_QUEUE);
      const due = await makeActor({ trustLevel: 1 });
      await pool.query(`UPDATE users SET status = 'suspended', suspended_until = now() - interval '1 minute' WHERE id = $1`, [due.id]);

      const set = vi.spyOn(queueRedis, 'set').mockImplementation(() => new Promise(() => undefined) as never);
      try {
        const started = Date.now();
        const lifted = await scheduler.tick();
        expect(Date.now() - started).toBeLessThan(4_500);
        expect(lifted).toBeGreaterThanOrEqual(1);
        expect((await userRow(due.id))?.status).toBe('active');
        expect(set).toHaveBeenCalledTimes(1);

        // The first command is still unsettled: the next tick runs unlocked without issuing another.
        const again = await scheduler.tick();
        expect(again).not.toBeNull();
        expect(set).toHaveBeenCalledTimes(1);
      } finally {
        set.mockRestore();
        (scheduler as unknown as { lockPending: boolean }).lockPending = false;
      }
    }, 15_000);

    it('skips a tick while the previous pass is still running', async () => {
      const scheduler = app.get(ExpireSuspensionsScheduler);
      (scheduler as unknown as { running: boolean }).running = true;
      try {
        expect(await scheduler.tick()).toBeNull();
      } finally {
        (scheduler as unknown as { running: boolean }).running = false;
      }
    });
  });

  describe('A3 retrofit (D-R17)', () => {
    it('mirrors suspend and the event actions into moderation_actions with a NULL case', async () => {
      const target = await makeActor({ trustLevel: 1 });
      const reason = 'Repeated spam in event chats';
      await post(`/api/v1/admin/users/${target.id}/suspend`, admin, { reason, confirm: true }).expect(200);
      const userAction = (
        await pool.query<ActionRow>(`SELECT * FROM moderation_actions WHERE subject_user_id = $1`, [target.id])
      ).rows;
      expect(userAction).toHaveLength(1);
      expect(userAction[0]).toMatchObject({ case_id: null, action_type: 'suspended', actor_user_id: admin.id, actor_role: 'admin', expires_at: null });

      const eventId = await makeEvent();
      for (const [verb, who] of [['suspend', moderator], ['restore', moderator], ['takedown', admin]] as const) {
        await post(`/api/v1/admin/events/${eventId}/${verb}`, who, { reason, confirm: true }).expect(200);
      }
      const rows = (
        await pool.query<ActionRow>(`SELECT * FROM moderation_actions WHERE target_id = $1 ORDER BY id`, [eventId])
      ).rows;
      expect(rows.map((r) => r.action_type)).toEqual(['content_hidden', 'action_revoked', 'content_removed']);
      expect(rows.every((r) => r.case_id === null && r.subject_user_id === host.id)).toBe(true);
    });

    it('rolls the mirrored action back with a failed audit write', async () => {
      const target = await makeActor({ trustLevel: 1 });
      vi.spyOn(app.get(AuditService), 'record').mockRejectedValue(new Error('audit down'));
      const res = await post(`/api/v1/admin/users/${target.id}/suspend`, admin, { reason: 'Repeated spam in event chats', confirm: true });
      expect(res.status).toBe(500);
      vi.restoreAllMocks();
      expect((await userRow(target.id))?.status).toBe('active');
      const rows = await pool.query(`SELECT 1 FROM moderation_actions WHERE subject_user_id = $1`, [target.id]);
      expect(rows.rowCount).toBe(0);
    });
  });
});
