import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Pool } from 'pg';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserRoleT, UserStatusT } from '@dnc/contracts';
import { withTransaction } from '../../../src/common/db/transaction.js';
import { REDIS_CACHE } from '../../../src/redis/redis.module.js';
import { AdminUserActionsRepository } from '../../../src/modules/admin/admin-user-actions.repository.js';
import { AuditService } from '../../../src/modules/audit/index.js';
import { AuthService } from '../../../src/modules/auth/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const BASE = '/api/v1/admin/users';
const ME = '/api/v1/auth/me';
const REASON = 'Repeated spam in event chats';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** `iat` has one-second resolution and a token is refused when `iat * 1000 <= mark`. */
const NEXT_SECOND_MS = 1100;

interface AuditRow {
  actor_user_id: string;
  actor_role_at_time: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  severity: string;
}

describe('admin user actions', () => {
  let app: INestApplication;
  let pool: Pool;
  let redis: Redis;
  let cleanup: () => Promise<void>;
  const created: string[] = [];

  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let admin: Actor;
  let superAdmin: Actor;

  /** A real account; trust and status are set in SQL so the fixture needs no admin route. */
  async function make(
    opts: { role?: UserRoleT; trust?: number; status?: UserStatusT } = {},
  ): Promise<Actor> {
    const actor = await createActor(app, {
      ...(opts.role ? { role: opts.role } : {}),
      trustLevel: opts.trust ?? 3,
    });
    created.push(actor.id);
    if (opts.status) {
      await pool.query(`UPDATE users SET status = $2::user_status_enum WHERE id = $1`, [
        actor.id,
        opts.status,
      ]);
    }
    return actor;
  }

  const act = (path: string, actor: Actor | null, body: unknown) => {
    const req = request(app.getHttpServer()).post(path);
    return (actor ? req.set(actor.headers) : req).send(body as object);
  };
  const suspend = (id: string, actor: Actor | null, body: unknown = { reason: REASON, confirm: true }) =>
    act(`${BASE}/${id}/suspend`, actor, body);
  const unsuspend = (id: string, actor: Actor | null, body: unknown = { reason: REASON, confirm: true }) =>
    act(`${BASE}/${id}/unsuspend`, actor, body);
  const changeRole = (id: string, actor: Actor | null, role: string, extra: object = {}) =>
    act(`${BASE}/${id}/role`, actor, { role, reason: REASON, confirm: true, ...extra });

  const me = (headers: Record<string, string>) =>
    request(app.getHttpServer()).get(ME).set(headers);

  const audits = async (entityId: string): Promise<AuditRow[]> =>
    (await pool.query<AuditRow>(`SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY created_at`, [entityId]))
      .rows;
  const userRow = async (id: string) =>
    (
      await pool.query<{
        status: string;
        role: string;
        suspension_reason: string | null;
        suspended_until: Date | null;
      }>(`SELECT status, role, suspension_reason, suspended_until FROM users WHERE id = $1`, [id])
    ).rows[0];
  const liveSessions = async (id: string) =>
    Number(
      (
        await pool.query<{ n: string }>(
          `SELECT count(*) AS n FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
          [id],
        )
      ).rows[0]?.n,
    );

  async function login(actor: Actor) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: actor.email, password: 'e2e-password-long-enough' });
    return res;
  }

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    redis = app.get<Redis>(REDIS_CACHE);
    member = await make({ trust: 1 });
    curator = await make({ role: 'curator' });
    moderator = await make({ role: 'moderator' });
    admin = await make({ role: 'admin' });
    superAdmin = await make({ role: 'super_admin' });
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
    // The revocation circuit breaker is per process; reset it after a simulated outage.
    const internals = app.get(AuthService) as unknown as {
      revocationDegraded: boolean;
      revocationRetryAt: number;
    };
    internals.revocationDegraded = false;
    internals.revocationRetryAt = 0;
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[]) OR actor_user_id = ANY($1::uuid[])`,
        [created],
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

  describe('access', () => {
    const routes = [
      ['suspend', (id: string, a: Actor | null) => suspend(id, a)],
      ['unsuspend', (id: string, a: Actor | null) => unsuspend(id, a)],
      ['role', (id: string, a: Actor | null) => changeRole(id, a, 'curator')],
    ] as const;

    it.each(routes)('%s answers 401 to a guest', async (_name, call) => {
      await call(unknownId(), null).expect(401);
    });

    it.each(routes)('%s answers 403 ROLE_NOT_ALLOWED to member, curator and moderator', async (_n, call) => {
      for (const actor of [member, curator, moderator]) {
        const res = await call(unknownId(), actor);
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' });
      }
    });

    it('admin may suspend and unsuspend but gets 403 ROLE_NOT_ALLOWED on role', async () => {
      const target = await make();
      await suspend(target.id, admin).expect(200);
      await unsuspend(target.id, admin).expect(200);
      const res = await changeRole(target.id, admin, 'curator');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_NOT_ALLOWED');
      expect((await userRow(target.id))?.role).toBe('member');
    });

    it('super_admin may use all three routes', async () => {
      const target = await make();
      await suspend(target.id, superAdmin).expect(200);
      await unsuspend(target.id, superAdmin).expect(200);
      await changeRole(target.id, superAdmin, 'curator').expect(200);
    });

    it('re-reads the actor role: a demoted admin holding an old token is refused', async () => {
      const stale = await make({ role: 'admin' });
      const target = await make();
      await pool.query(`UPDATE users SET role = 'member' WHERE id = $1`, [stale.id]);
      const res = await suspend(target.id, stale);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_NOT_ALLOWED');
      expect((await userRow(target.id))?.status).toBe('active');
      expect(await audits(target.id)).toHaveLength(0);
    });
  });

  describe('validation (A3-AC-7, A3-AC-8)', () => {
    it.each([
      ['19 characters', 'x'.repeat(19)],
      ['256 characters', 'x'.repeat(256)],
      ['only whitespace', ' '.repeat(30)],
      ['padding that trims below 20', `   ${'x'.repeat(10)}   `],
      ['empty', ''],
    ])('rejects a reason of %s with 400 REASON_REQUIRED and writes nothing', async (_label, reason) => {
      const target = await make();
      for (const call of [
        () => suspend(target.id, superAdmin, { reason, confirm: true }),
        () => unsuspend(target.id, superAdmin, { reason, confirm: true }),
        () => changeRole(target.id, superAdmin, 'curator', { reason }),
      ]) {
        const res = await call();
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ code: 'REASON_REQUIRED', messageKey: 'errors.admin.reasonRequired' });
      }
      expect(await audits(target.id)).toHaveLength(0);
      expect((await userRow(target.id))?.status).toBe('active');
    });

    it('accepts boundary reasons of exactly 20 and 255 characters', async () => {
      const a = await make();
      const b = await make();
      await suspend(a.id, superAdmin, { reason: 'x'.repeat(20), confirm: true }).expect(200);
      await suspend(b.id, superAdmin, { reason: 'y'.repeat(255), confirm: true }).expect(200);
    });

    it.each([
      ['missing', undefined],
      ['false', false],
      ['the string "true"', 'true'],
    ])('rejects confirm %s with 400 CONFIRMATION_REQUIRED', async (_label, confirm) => {
      const target = await make();
      const body = { reason: REASON, ...(confirm === undefined ? {} : { confirm }) };
      for (const res of [
        await suspend(target.id, superAdmin, body),
        await unsuspend(target.id, superAdmin, body),
        await act(`${BASE}/${target.id}/role`, superAdmin, { ...body, role: 'curator' }),
      ]) {
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          code: 'CONFIRMATION_REQUIRED',
          messageKey: 'errors.admin.confirmationRequired',
        });
      }
      expect(await audits(target.id)).toHaveLength(0);
      expect((await userRow(target.id))?.status).toBe('active');
    });

    it('rejects unknown fields, an unknown role and a bad id without touching data', async () => {
      const target = await make();
      const extra = await suspend(target.id, superAdmin, { reason: REASON, confirm: true, status: 'x' });
      expect(extra.status).toBe(400);
      expect(extra.body.messageKey).toBe('errors.admin.queryInvalid');
      const role = await changeRole(target.id, superAdmin, 'owner');
      expect(role.status).toBe(400);
      await suspend('not-a-uuid', superAdmin).expect(400);
      expect(await audits(target.id)).toHaveLength(0);
      expect((await userRow(target.id))?.status).toBe('active');
    });

    it('answers 404 for an unknown user and writes nothing', async () => {
      const id = unknownId();
      const res = await suspend(id, superAdmin);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ code: 'USER_NOT_FOUND', messageKey: 'errors.admin.userNotFound' });
      expect(await audits(id)).toHaveLength(0);
    });
  });

  describe('suspend (A3-AC-1, A3-AC-2)', () => {
    it('suspends, audits exactly once, and cuts the target at once', async () => {
      const target = await make();
      const old = await login(target);
      const refreshCookie = (old.headers['set-cookie'] as unknown as string[])
        .find((c) => c.startsWith('dnc_refresh='))
        ?.split(';')[0] as string;
      await me(target.headers).expect(200);
      expect(await liveSessions(target.id)).toBeGreaterThanOrEqual(1);

      const res = await suspend(target.id, admin, { reason: `  ${REASON}  `, confirm: true });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { id: target.id, status: 'suspended', role: 'member' },
      });

      const row = await userRow(target.id);
      expect(row).toMatchObject({ status: 'suspended', suspension_reason: REASON, suspended_until: null });

      const lines = await audits(target.id);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        actor_user_id: admin.id,
        actor_role_at_time: 'admin',
        action: 'user.suspended',
        entity_type: 'user',
        entity_id: target.id,
        before: { status: 'active' },
        after: { status: 'suspended' },
        reason: REASON,
        severity: 'warning',
      });

      // Sessions revoked and old tokens refused.
      expect(await liveSessions(target.id)).toBe(0);
      const stale = await me(target.headers);
      expect(stale.status).toBe(403);
      expect(stale.body).toMatchObject({
        code: 'ACCOUNT_NOT_ACTIVE',
        messageKey: 'errors.auth.accountSuspended',
      });
      const refresh = await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('cookie', refreshCookie);
      expect(refresh.status).toBe(401);
      const relogin = await login(target);
      expect(relogin.status).toBe(403);
      expect(relogin.body.code).toBe('ACCOUNT_NOT_ACTIVE');
    });

    it('A3-AC-20: the audit diff carries only the changed field', async () => {
      const target = await make();
      await suspend(target.id, superAdmin).expect(200);
      const [line] = await audits(target.id);
      expect(Object.keys(line?.before ?? {})).toEqual(['status']);
      expect(Object.keys(line?.after ?? {})).toEqual(['status']);
      expect(JSON.stringify(line)).not.toContain(target.email);
    });

    it('A3-AC-9: nobody suspends themself', async () => {
      for (const actor of [admin, superAdmin]) {
        const res = await suspend(actor.id, actor);
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ code: 'SELF_ACTION', messageKey: 'errors.admin.selfAction' });
        expect(await audits(actor.id)).toHaveLength(0);
        expect((await userRow(actor.id))?.status).toBe('active');
      }
    });

    it('A3-AC-10: admin cannot suspend an admin or a super_admin', async () => {
      const otherAdmin = await make({ role: 'admin' });
      const otherSuper = await make({ role: 'super_admin' });
      for (const target of [otherAdmin, otherSuper]) {
        const res = await suspend(target.id, admin);
        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          code: 'TARGET_ROLE_PROTECTED',
          messageKey: 'errors.admin.targetRoleProtected',
        });
        expect(await audits(target.id)).toHaveLength(0);
        expect((await userRow(target.id))?.status).toBe('active');
      }
    });

    it('super_admin may suspend an admin', async () => {
      const target = await make({ role: 'admin' });
      await suspend(target.id, superAdmin).expect(200);
      expect((await userRow(target.id))?.status).toBe('suspended');
    });

    it('A3-AC-14: only active accounts can be suspended', async () => {
      for (const status of ['suspended', 'pending', 'deleted', 'deactivated'] as const) {
        const target = await make({ status });
        const res = await suspend(target.id, superAdmin);
        expect(res.status).toBe(409);
        expect(res.body).toEqual({
          code: 'INVALID_TRANSITION',
          messageKey: 'errors.admin.invalidTransition',
        });
        expect(await audits(target.id)).toHaveLength(0);
        expect((await userRow(target.id))?.status).toBe(status);
      }
    });

    it('A3-AC-11: refuses to suspend a super_admin when two or fewer remain active', async () => {
      const target = await make({ role: 'super_admin' });
      vi.spyOn(app.get(AdminUserActionsRepository), 'countActiveSuperAdmins').mockResolvedValueOnce(2);
      const res = await suspend(target.id, superAdmin);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ code: 'LAST_SUPER_ADMIN', messageKey: 'errors.admin.lastSuperAdmin' });
      expect((await userRow(target.id))?.status).toBe('active');
      expect(await audits(target.id)).toHaveLength(0);
      expect(await liveSessions(target.id)).toBeGreaterThanOrEqual(1);
    });

    it('counts active super_admins with the real query', async () => {
      const repo = app.get(AdminUserActionsRepository);
      const direct = async () =>
        Number(
          (
            await pool.query<{ n: string }>(
              `SELECT count(*) AS n FROM users
                WHERE role = 'super_admin' AND status = 'active'
                  AND deleted_at IS NULL AND anonymized_at IS NULL`,
            )
          ).rows[0]?.n,
        );
      const counted = () => withTransaction(pool, (tx) => repo.countActiveSuperAdmins(tx));
      const before = await counted();
      expect(before).toBe(await direct());
      const extra = await make({ role: 'super_admin' });
      expect(await counted()).toBe(before + 1);
      await pool.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [extra.id]);
      expect(await counted()).toBe(before);
      await pool.query(`UPDATE users SET status = 'active', deleted_at = now() WHERE id = $1`, [extra.id]);
      expect(await counted()).toBe(before);
      await pool.query(
        `UPDATE users SET deleted_at = NULL, anonymized_at = now() WHERE id = $1`,
        [extra.id],
      );
      expect(await counted()).toBe(before);
    });

    it('INV-3 is serialised: with three active super_admins, two simultaneous suspensions of different targets leave two', async () => {
      const repo = app.get(AdminUserActionsRepository);
      // The database is shared, so the absolute count is not ours to control.
      // The spy counts only this test's three fixtures, read through the
      // caller's own transaction: the value is 3 until a suspension commits,
      // so only the advisory lock can make the second request see 2.
      const [a, b, c] = [
        await make({ role: 'super_admin' }),
        await make({ role: 'super_admin' }),
        await make({ role: 'super_admin' }),
      ];
      const mine = [a.id, b.id, c.id];
      vi.spyOn(repo, 'countActiveSuperAdmins').mockImplementation(async (tx) => {
        const { rows } = await tx.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM users
            WHERE id = ANY($1::uuid[]) AND role = 'super_admin' AND status = 'active'`,
          [mine],
        );
        return rows[0]?.n ?? 0;
      });
      const results = await Promise.all([suspend(b.id, a), suspend(c.id, a)]);
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([200, 409]);
      expect(results.find((r) => r.status === 409)?.body.code).toBe('LAST_SUPER_ADMIN');
      const suspended = (
        await pool.query(`SELECT id FROM users WHERE id = ANY($1::uuid[]) AND status = 'suspended'`, [
          [b.id, c.id],
        ])
      ).rows;
      expect(suspended).toHaveLength(1);
    });

    it('allows suspending a super_admin when three or more are active', async () => {
      const target = await make({ role: 'super_admin' });
      vi.spyOn(app.get(AdminUserActionsRepository), 'countActiveSuperAdmins').mockResolvedValueOnce(3);
      await suspend(target.id, superAdmin).expect(200);
      expect((await userRow(target.id))?.status).toBe('suspended');
    });

    it('A3-AC-13: two admins suspending the same user give one 200, one 409 and one audit line', async () => {
      const second = await make({ role: 'admin' });
      for (let round = 0; round < 3; round++) {
        const target = await make();
        const results = await Promise.all([suspend(target.id, admin), suspend(target.id, second)]);
        expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
        const loser = results.find((r) => r.status === 409);
        expect(loser?.body.code).toBe('INVALID_TRANSITION');
        expect(await audits(target.id)).toHaveLength(1);
      }
    });

    it('A3-AC-16: an audit failure rolls back status, sessions and the revocation mark', async () => {
      const target = await make();
      await login(target);
      const before = await liveSessions(target.id);
      expect(before).toBeGreaterThanOrEqual(1);
      vi.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('audit down'));

      const res = await suspend(target.id, superAdmin);
      expect(res.status).toBe(500);

      expect((await userRow(target.id))?.status).toBe('active');
      expect((await userRow(target.id))?.suspension_reason).toBeNull();
      expect(await liveSessions(target.id)).toBe(before);
      expect(await redis.get(`auth:revoked:${target.id}`)).toBeNull();
      await me(target.headers).expect(200);
      expect(await audits(target.id)).toHaveLength(0);
    });

    it('reports sessionCutDeferred when Redis refuses the mark, yet the change and audit stand', async () => {
      const target = await make();
      vi.spyOn(redis, 'eval').mockRejectedValue(new Error('ECONNREFUSED'));
      const res = await suspend(target.id, superAdmin);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: target.id,
        status: 'suspended',
        role: 'member',
        sessionCutDeferred: true,
      });
      expect((await userRow(target.id))?.status).toBe('suspended');
      expect(await liveSessions(target.id)).toBe(0);
      expect(await audits(target.id)).toHaveLength(1);
    });

    it('stores a valid x-request-id and drops one that is not a UUID', async () => {
      const first = await make();
      const second = await make();
      const rid = '0f8e9c1a-6b1d-4f3e-9a52-3c1f7d2b8e44';
      await suspend(first.id, superAdmin).set('x-request-id', rid).expect(200);
      await suspend(second.id, superAdmin).set('x-request-id', 'not-a-uuid; drop table').expect(200);
      const read = async (id: string) =>
        (await pool.query<{ request_id: string | null }>(`SELECT request_id FROM audit_logs WHERE entity_id = $1`, [id]))
          .rows[0]?.request_id;
      expect(await read(first.id)).toBe(rid);
      expect(await read(second.id)).toBeNull();
    });

    it('omits sessionCutDeferred when the mark is written', async () => {
      const target = await make();
      const res = await suspend(target.id, superAdmin);
      expect(res.body.data).not.toHaveProperty('sessionCutDeferred');
    });

    it('disconnects the chat sockets of the suspended user', async () => {
      const target = await make();
      const bystander = await make();
      const { port } = app.getHttpServer().address() as AddressInfo;
      const connect = (actor: Actor): Promise<Socket> =>
        new Promise((resolve, reject) => {
          const socket = io(`http://127.0.0.1:${port}/chat`, {
            transports: ['websocket'],
            auth: { token: actor.accessToken },
          });
          socket.on('connect', () => resolve(socket));
          socket.on('connect_error', reject);
        });
      const victim = await connect(target);
      const other = await connect(bystander);
      try {
        const dropped = new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('socket stayed open')), 3000);
          victim.once('disconnect', (reason) => {
            clearTimeout(timer);
            resolve(reason);
          });
        });
        await suspend(target.id, superAdmin).expect(200);
        await expect(dropped).resolves.toBe('io server disconnect');
        expect(other.connected).toBe(true);
      } finally {
        victim.disconnect();
        other.disconnect();
      }
    });
  });

  describe('unsuspend (A3-AC-3)', () => {
    it('restores the account, clears the reason, audits once and lets the user sign in again', async () => {
      const target = await make();
      await suspend(target.id, admin).expect(200);

      const res = await unsuspend(target.id, admin, { reason: 'Appeal accepted after review', confirm: true });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: target.id, status: 'active', role: 'member' });
      expect(await userRow(target.id)).toMatchObject({
        status: 'active',
        suspension_reason: null,
        suspended_until: null,
      });

      const lines = await audits(target.id);
      expect(lines.map((l) => l.action)).toEqual(['user.suspended', 'user.unsuspended']);
      expect(lines[1]).toMatchObject({
        actor_role_at_time: 'admin',
        before: { status: 'suspended' },
        after: { status: 'active' },
        reason: 'Appeal accepted after review',
        severity: 'warning',
      });

      await sleep(NEXT_SECOND_MS);
      const relogin = await login(target);
      expect(relogin.status).toBe(200);
      await me({ authorization: `Bearer ${relogin.body.data.accessToken as string}` }).expect(200);
    });

    it('answers 409 for an active account and writes nothing', async () => {
      const target = await make();
      const res = await unsuspend(target.id, admin);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_TRANSITION');
      expect(await audits(target.id)).toHaveLength(0);
    });

    it('keeps the protection of staff accounts: admin cannot unsuspend an admin', async () => {
      const target = await make({ role: 'admin' });
      await suspend(target.id, superAdmin).expect(200);
      const res = await unsuspend(target.id, admin);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TARGET_ROLE_PROTECTED');
      expect((await userRow(target.id))?.status).toBe('suspended');
      expect(await audits(target.id)).toHaveLength(1);
    });
  });

  describe('role change (A3-AC-4, A3-AC-10, A3-AC-12)', () => {
    it('promotes a T3 member to moderator, audits as critical and forces a new sign-in', async () => {
      const target = await make({ trust: 3 });
      const res = await changeRole(target.id, superAdmin, 'moderator');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { id: target.id, role: 'moderator' } });
      expect((await userRow(target.id))?.role).toBe('moderator');

      const lines = await audits(target.id);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        actor_user_id: superAdmin.id,
        actor_role_at_time: 'super_admin',
        action: 'user.role_changed',
        entity_type: 'user',
        before: { role: 'member' },
        after: { role: 'moderator' },
        reason: REASON,
        severity: 'critical',
      });
      expect(await liveSessions(target.id)).toBe(0);

      const stale = await me(target.headers);
      expect(stale.status).toBe(401);
      expect(stale.body.code).toBe('UNAUTHENTICATED');

      await sleep(NEXT_SECOND_MS);
      const relogin = await login(target);
      expect(relogin.status).toBe(200);
      const fresh = await me({ authorization: `Bearer ${relogin.body.data.accessToken as string}` });
      expect(fresh.status).toBe(200);
      expect(fresh.body.data.role ?? fresh.body.data.user?.role).toBe('moderator');
    });

    it('rejects a T2 member for moderator and admin with 409 TRUST_TOO_LOW', async () => {
      const target = await make({ trust: 2 });
      for (const role of ['moderator', 'admin']) {
        const res = await changeRole(target.id, superAdmin, role);
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ code: 'TRUST_TOO_LOW', messageKey: 'errors.admin.trustTooLow' });
      }
      expect((await userRow(target.id))?.role).toBe('member');
      expect(await audits(target.id)).toHaveLength(0);
    });

    it('lets a T1 member become curator, and a moderator go back to member regardless of trust', async () => {
      const target = await make({ trust: 1 });
      await changeRole(target.id, superAdmin, 'curator').expect(200);
      const staff = await make({ role: 'moderator', trust: 1 });
      await changeRole(staff.id, superAdmin, 'member').expect(200);
    });

    it('refuses to grant super_admin, whatever the target', async () => {
      const target = await make({ trust: 5 });
      const res = await changeRole(target.id, superAdmin, 'super_admin');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_TRANSITION');
      expect((await userRow(target.id))?.role).toBe('member');
      expect(await audits(target.id)).toHaveLength(0);
    });

    it('refuses to demote a super_admin', async () => {
      const target = await make({ role: 'super_admin' });
      const res = await changeRole(target.id, superAdmin, 'admin');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_TRANSITION');
      expect((await userRow(target.id))?.role).toBe('super_admin');
      expect(await audits(target.id)).toHaveLength(0);
    });

    it('refuses a suspended target and an unchanged role with 409 INVALID_TRANSITION', async () => {
      const suspended = await make({ trust: 3, status: 'suspended' });
      const res = await changeRole(suspended.id, superAdmin, 'curator');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_TRANSITION');
      const same = await make();
      const noop = await changeRole(same.id, superAdmin, 'member');
      expect(noop.status).toBe(409);
      expect(await audits(suspended.id)).toHaveLength(0);
      expect(await audits(same.id)).toHaveLength(0);
    });

    it('A3-AC-9: a super_admin cannot change their own role', async () => {
      const res = await changeRole(superAdmin.id, superAdmin, 'admin');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SELF_ACTION');
      expect((await userRow(superAdmin.id))?.role).toBe('super_admin');
    });

    it('rolls back the role change when the audit write fails', async () => {
      const target = await make({ trust: 3 });
      vi.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('audit down'));
      const res = await changeRole(target.id, superAdmin, 'moderator');
      expect(res.status).toBe(500);
      expect((await userRow(target.id))?.role).toBe('member');
      expect(await liveSessions(target.id)).toBeGreaterThanOrEqual(1);
      expect(await redis.get(`auth:revoked:${target.id}`)).toBeNull();
      await me(target.headers).expect(200);
    });

    it('reports sessionCutDeferred on a role change when Redis refuses the mark', async () => {
      const target = await make({ trust: 3 });
      vi.spyOn(redis, 'eval').mockRejectedValue(new Error('ECONNREFUSED'));
      const res = await changeRole(target.id, superAdmin, 'curator');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: target.id, role: 'curator', sessionCutDeferred: true });
      expect((await userRow(target.id))?.role).toBe('curator');
      expect(await audits(target.id)).toHaveLength(1);
    });

    it('disconnects the chat sockets of a user whose role changed', async () => {
      const target = await make({ trust: 3 });
      const { port } = app.getHttpServer().address() as AddressInfo;
      const socket = await new Promise<Socket>((resolve, reject) => {
        const s = io(`http://127.0.0.1:${port}/chat`, {
          transports: ['websocket'],
          auth: { token: target.accessToken },
        });
        s.on('connect', () => resolve(s));
        s.on('connect_error', reject);
      });
      try {
        const dropped = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('socket stayed open')), 3000);
          socket.once('disconnect', () => {
            clearTimeout(timer);
            resolve();
          });
        });
        await changeRole(target.id, superAdmin, 'curator').expect(200);
        await dropped;
      } finally {
        socket.disconnect();
      }
    });
  });
});
