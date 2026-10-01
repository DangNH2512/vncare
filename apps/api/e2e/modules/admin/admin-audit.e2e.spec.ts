import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AdminAuditItemT } from '@dnc/contracts';
import { withTransaction } from '../../../src/common/db/transaction.js';
import { AuditService, type AuditRecordInput } from '../../../src/modules/audit/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

const LIST = '/api/v1/admin/audit-logs';
const BANNED = ['ip', 'userAgent', 'user_agent', 'requestId', 'request_id', 'email', 'phone'];
const IP = '203.0.113.99';
const UA = 'e2e-audit-agent/1.0';
const REASON = 'Spam links posted repeatedly in event chat';

function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...allKeys(v)]);
  }
  return [];
}

describe('admin audit logs', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanup: () => Promise<void>;
  let audit: AuditService;

  let member: Actor;
  let curator: Actor;
  let modA: Actor;
  let modB: Actor;
  let admin: Actor;
  let superAdmin: Actor;

  /** Every row of this spec shares this entity id; filtering on it isolates the run. */
  const entity = randomUUID();
  const oldEntity = randomUUID();
  const jobActor = randomUUID();
  const actorIds: string[] = [];
  /** Entity ids created mid-spec; removed with the rest in teardown. */
  const extraEntities: string[] = [];

  const get = (qs: string, actor?: Actor) => {
    const req = request(app.getHttpServer()).get(`${LIST}?${qs}`);
    return actor ? req.set(actor.headers) : req;
  };
  const mine = (extra = '') => `entityId=${entity}${extra ? `&${extra}` : ''}`;
  const rows = async (qs: string, actor: Actor) => {
    const res = await get(qs, actor);
    expect(res.status).toBe(200);
    return res.body.data.items as AdminAuditItemT[];
  };

  const staff = (a: Actor, role: 'moderator' | 'admin' | 'super_admin') => ({
    userId: a.id,
    type: 'staff' as const,
    role,
  });

  async function record(input: Partial<AuditRecordInput> & Pick<AuditRecordInput, 'actor' | 'action'>) {
    return withTransaction(pool, (tx) =>
      audit.record(tx, {
        entityType: 'user',
        entityId: entity,
        reason: REASON,
        ip: IP,
        userAgent: UA,
        ...input,
      }),
    );
  }

  /** Raw insert with a chosen timestamp; the service always stamps now(). */
  async function insertAt(createdAt: string, entityId: string, action = 'user.suspended') {
    await pool.query(
      `INSERT INTO audit_logs (created_at, actor_user_id, actor_type, actor_role_at_time, action,
                               entity_type, entity_id, reason, severity)
       VALUES ($1::timestamptz, $2, 'staff', 'admin', $3, 'user', $4, $5, 'warning')`,
      [createdAt, admin.id, action, entityId, REASON],
    );
  }

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    audit = app.get(AuditService, { strict: false });

    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    modA = await createActor(app, { role: 'moderator' });
    modB = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });
    actorIds.push(modA.id, modB.id, admin.id, superAdmin.id, jobActor);

    await record({ actor: staff(superAdmin, 'super_admin'), action: 'user.role_changed', before: { role: 'member' }, after: { role: 'moderator' } });
    await record({ actor: staff(admin, 'admin'), action: 'user.suspended', before: { status: 'active' }, after: { status: 'suspended' } });
    await record({ actor: staff(admin, 'admin'), action: 'event.restored', entityType: 'event', before: { status: 'suspended' }, after: { status: 'published' } });
    await record({ actor: staff(modA, 'moderator'), action: 'event.suspended', entityType: 'event', before: { status: 'published' }, after: { status: 'suspended' } });
    await record({ actor: staff(modB, 'moderator'), action: 'event.suspended', entityType: 'event', before: { status: 'published' }, after: { status: 'suspended' } });
    await record({
      actor: { userId: jobActor, type: 'job', role: null },
      action: 'user.unsuspended',
      reason: null,
      before: { status: 'suspended' },
      after: { status: 'active' },
    });
  });

  afterAll(async () => {
    // The delete guard is lifted inside one transaction so no other session sees it off.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[]) OR actor_user_id = ANY($2::uuid[])`,
        [[entity, oldEntity, ...extraEntities], actorIds],
      );
      await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
      await app.close();
      await cleanup();
    }
  });

  describe('access', () => {
    it('401 without a token, 403 for member and curator', async () => {
      expect((await get(mine())).status).toBe(401);
      for (const actor of [member, curator]) {
        const res = await get(mine(), actor);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ROLE_NOT_ALLOWED');
      }
    });
  });

  describe('scope by role (D-R12)', () => {
    it('super_admin sees every row', async () => {
      expect(await rows(mine(), superAdmin)).toHaveLength(6);
    });

    it('admin sees every row except those by a super_admin', async () => {
      const items = await rows(mine(), admin);
      expect(items).toHaveLength(5);
      expect(items.some((i) => i.actor.role === 'super_admin')).toBe(false);
      // The system/job row (no role at the time) stays visible to admin.
      expect(items.some((i) => i.actor.id === jobActor)).toBe(true);
    });

    it('moderator sees only rows they wrote', async () => {
      const a = await rows(mine(), modA);
      expect(a).toHaveLength(1);
      expect(a[0]?.actor.id).toBe(modA.id);
      const b = await rows(mine(), modB);
      expect(b.map((i) => i.actor.id)).toEqual([modB.id]);
    });

    it('moderator asking for someone else gets nothing, not an error', async () => {
      expect(await rows(mine(`actorId=${superAdmin.id}`), modA)).toEqual([]);
    });

    it('unfiltered lists never leak out of scope', async () => {
      for (const item of await rows('limit=100', modA)) expect(item.actor.id).toBe(modA.id);
      for (const item of await rows('limit=100', admin)) expect(item.actor.role).not.toBe('super_admin');
    });
  });

  describe('filters', () => {
    it('filters by action (single and CSV)', async () => {
      expect(await rows(mine('action=user.suspended'), superAdmin)).toHaveLength(1);
      const both = await rows(mine('action=user.suspended,event.restored'), superAdmin);
      expect(both.map((i) => i.action).sort()).toEqual(['event.restored', 'user.suspended']);
    });

    it('filters by severity per D-R10', async () => {
      const bySeverity = async (s: string) => (await rows(mine(`severity=${s}`), superAdmin)).map((i) => i.action).sort();
      expect(await bySeverity('critical')).toEqual(['user.role_changed']);
      expect(await bySeverity('notice')).toEqual(['event.restored']);
      expect(await bySeverity('warning')).toEqual(['event.suspended', 'event.suspended', 'user.suspended', 'user.unsuspended']);
      expect(await bySeverity('info')).toEqual([]);
      expect(await bySeverity('critical,notice')).toHaveLength(2);
    });

    it('assigns severity to every D-R10 action', async () => {
      const expected: Record<string, string> = {
        'user.role_changed': 'critical',
        'event.taken_down': 'critical',
        'user.suspended': 'warning',
        'user.unsuspended': 'warning',
        'event.suspended': 'warning',
        'event.restored': 'notice',
      };
      const probe = randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const [action, severity] of Object.entries(expected)) {
          await audit.record(client, {
            actor: { userId: null, type: 'system', role: null },
            action,
            entityType: 'user',
            entityId: probe,
          });
          const { rows: r } = await client.query<{ severity: string }>(
            `SELECT severity FROM audit_logs WHERE entity_id = $1 AND action = $2`,
            [probe, action],
          );
          expect(r[0]?.severity, action).toBe(severity);
        }
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    it('filters by entityType and actorId', async () => {
      const events = await rows(mine('entityType=event'), superAdmin);
      expect(events).toHaveLength(3);
      expect(events.every((i) => i.entityType === 'event')).toBe(true);
      const byAdmin = await rows(mine(`actorId=${admin.id}`), superAdmin);
      expect(byAdmin).toHaveLength(2);
    });

    it('exposes handle and the role held at the time', async () => {
      const [row] = await rows(mine('action=user.role_changed'), superAdmin);
      expect(row?.actor).toEqual({ id: superAdmin.id, handle: superAdmin.handle, role: 'super_admin' });
      expect(row?.before).toEqual({ role: 'member' });
      expect(row?.after).toEqual({ role: 'moderator' });
      expect(row?.reason).toBe(REASON);
    });

    it('date range: from is inclusive, to is exclusive, in UTC', async () => {
      await insertAt('2003-05-01T23:59:59.999Z', oldEntity);
      await insertAt('2003-05-02T00:00:00.000Z', oldEntity);
      await insertAt('2003-05-02T10:00:00.000Z', oldEntity);
      await insertAt('2003-05-03T00:00:00.000Z', oldEntity);
      const day = async (from: string, to: string) =>
        (await rows(`entityId=${oldEntity}&from=${from}&to=${to}`, superAdmin)).map((i) => i.createdAt);
      expect(await day('2003-05-02T00:00:00.000Z', '2003-05-03T00:00:00.000Z')).toEqual([
        '2003-05-02T10:00:00.000Z',
        '2003-05-02T00:00:00.000Z',
      ]);
      expect(await day('2003-05-01T00:00:00.000Z', '2003-05-02T00:00:00.000Z')).toEqual([
        '2003-05-01T23:59:59.999Z',
      ]);
    });
  });

  describe('pagination', () => {
    it('keyset pages over identical timestamps without gaps or repeats', async () => {
      const tied = randomUUID();
      extraEntities.push(tied);
      for (let i = 0; i < 5; i++) await insertAt('2004-01-01T00:00:00.000Z', tied);
      await insertAt('2004-01-02T00:00:00.000Z', tied);
      const seen: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 5; page++) {
        const res = await get(`entityId=${tied}&limit=2${cursor ? `&cursor=${cursor}` : ''}`, superAdmin);
        expect(res.status).toBe(200);
        seen.push(...(res.body.data.items as AdminAuditItemT[]).map((i) => i.id));
        cursor = res.body.data.nextCursor as string | null;
        if (!cursor) break;
      }
      expect(seen).toHaveLength(6);
      expect(new Set(seen).size).toBe(6);
    });

    it('exactly one full page ends with nextCursor null', async () => {
      const res = await get(mine('limit=6'), superAdmin);
      expect(res.body.data.items).toHaveLength(6);
      expect(res.body.data.nextCursor).toBeNull();
    });

    it('rejects a tampered cursor and one from another query shape', async () => {
      const bad = await get(mine('cursor=not-a-cursor'), superAdmin);
      expect(bad.status).toBe(400);
      expect(bad.body).toMatchObject({ code: 'ADMIN_CURSOR_INVALID', messageKey: 'errors.admin.cursorInvalid' });
      const forged = Buffer.from(
        JSON.stringify({ s: 'createdAt', d: 'asc', v: '2004-01-01T00:00:00.000000Z', id: randomUUID() }),
      ).toString('base64url');
      expect((await get(mine(`cursor=${forged}`), superAdmin)).status).toBe(400);
      const overflow = Buffer.from(
        JSON.stringify({ s: 'createdAt', d: 'desc', v: '2004-02-30T00:00:00.000000Z', id: randomUUID() }),
      ).toString('base64url');
      expect((await get(mine(`cursor=${overflow}`), superAdmin)).status).toBe(400);
    });
  });

  describe('contract and privacy', () => {
    it('rejects bad queries with the flat error body', async () => {
      for (const qs of ['severity=bogus', 'limit=500', 'foo=bar', 'entityId=nope', 'from=2004-02-01T00:00:00.000Z&to=2004-01-01T00:00:00.000Z', 'action=Bad Action']) {
        const res = await get(qs, superAdmin);
        expect(res.status, qs).toBe(400);
        expect(res.body).toMatchObject({ code: 'ADMIN_QUERY_INVALID', messageKey: 'errors.admin.queryInvalid' });
      }
    });

    it('never returns ip, user agent or request id, and does not echo them anywhere', async () => {
      const res = await get(mine(), superAdmin);
      const keys = allKeys(res.body);
      for (const banned of BANNED) expect(keys, banned).not.toContain(banned);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(IP);
      expect(text).not.toContain(UA);
      expect(Object.keys((res.body.data.items as object[])[0] as object).sort()).toEqual(
        ['action', 'actor', 'after', 'before', 'createdAt', 'entityId', 'entityType', 'id', 'reason', 'severity'],
      );
    });

    it('refuses a PII key in a diff and writes nothing', async () => {
      const probe = randomUUID();
      await expect(
        withTransaction(pool, (tx) =>
          audit.record(tx, {
            actor: staff(admin, 'admin'),
            action: 'user.suspended',
            entityType: 'user',
            entityId: probe,
            reason: REASON,
            before: { status: 'active', nested: { Email: 'a@b.c' } },
          }),
        ),
      ).rejects.toThrow(/PII/);
      const { rowCount } = await pool.query('SELECT 1 FROM audit_logs WHERE entity_id = $1', [probe]);
      expect(rowCount).toBe(0);
    });

    it('a PII key that reached the table by other means is blanked on the way out', async () => {
      const probe = randomUUID();
      extraEntities.push(probe);
      await pool.query(
        `INSERT INTO audit_logs (actor_user_id, actor_type, actor_role_at_time, action, entity_type,
                                 entity_id, reason, "before", "after")
         VALUES ($1, 'staff', 'admin', 'user.suspended', 'user', $2, $3,
                 '{"email":"leak@example.test","status":"active"}'::jsonb, '{"status":"suspended"}'::jsonb)`,
        [admin.id, probe, REASON],
      );
      const res = await get(`entityId=${probe}`, superAdmin);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('leak@example.test');
      expect(res.body.data.items[0].before).toBeNull();
      expect(res.body.data.items[0].after).toEqual({ status: 'suspended' });
    });

    it('rolls the audit line back with the business transaction', async () => {
      const probe = randomUUID();
      await expect(
        withTransaction(pool, async (tx) => {
          await audit.record(tx, {
            actor: staff(admin, 'admin'),
            action: 'user.suspended',
            entityType: 'user',
            entityId: probe,
            reason: REASON,
          });
          throw new Error('business step failed');
        }),
      ).rejects.toThrow('business step failed');
      const { rowCount } = await pool.query('SELECT 1 FROM audit_logs WHERE entity_id = $1', [probe]);
      expect(rowCount).toBe(0);
    });

    it('stores request_id only when it is a valid UUID', async () => {
      const probe = randomUUID();
      const good = randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const requestId of [good, 'not-a-uuid', "'; DROP TABLE audit_logs;--", '']) {
          await audit.record(client, {
            actor: { userId: null, type: 'system', role: null },
            action: 'job.ran',
            entityType: 'user',
            entityId: probe,
            requestId,
          });
        }
        const { rows: r } = await client.query<{ request_id: string | null }>(
          `SELECT request_id FROM audit_logs WHERE entity_id = $1 ORDER BY id`,
          [probe],
        );
        expect(r.map((x) => x.request_id)).toEqual([good, null, null, null]);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    it('the table refuses a staff row with a short reason, so the transaction aborts', async () => {
      await expect(
        withTransaction(pool, (tx) =>
          audit.record(tx, {
            actor: staff(admin, 'admin'),
            action: 'user.suspended',
            entityType: 'user',
            entityId: randomUUID(),
            reason: 'too short',
          }),
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });
});
