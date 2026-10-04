import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';
import {
  countRows,
  http,
  openDb,
  openTicket,
  postAction,
  ReporterPool,
  signIn,
} from './moderation-fixtures.js';

const SUSPENDED = { code: 'ACCOUNT_NOT_ACTIVE', messageKey: 'errors.auth.accountSuspended' };
const INVALID_REFRESH = { code: 'INVALID_REFRESH', messageKey: 'errors.auth.invalidRefresh' };

/**
 * Suspension as sign-in sees it — T-API-4 (task board D4).
 *
 * AC-33 (403 on sign-in and refresh, sessions revoked, early lift), AC-34
 * (lazy lift after expiry, recorded as the system), and the no-regression
 * rule for a suspension with no end date.
 */
describe('suspension and sign-in', () => {
  let app: INestApplication;
  let db: Pool;
  let cleanup: () => Promise<void>;

  let moderator: Actor;
  let reporters: ReporterPool;

  /** Suspends `target` for `days` through the real moderation endpoint. */
  const suspend = async (target: Actor, days = 7) => {
    const ticketId = await openTicket(app, db, reporters.next(), {
      targetType: 'user',
      targetId: target.id,
      reason: 'harassment',
    });
    await postAction(app, moderator, {
      action: 'suspend_user',
      ticketId,
      targetType: 'user',
      targetId: target.id,
      reasonCode: 'harassment',
      durationDays: days,
    }).expect(201);
  };

  const refresh = (cookie: string | undefined) =>
    http(app).post('/api/v1/auth/refresh').set('Cookie', cookie ?? '');

  const expire = (userId: string) =>
    db.query(`UPDATE users SET suspended_until = now() - interval '1 minute' WHERE id = $1`, [userId]);

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    db = openDb();
    moderator = await createActor(app, { role: 'moderator' });
    reporters = new ReporterPool([await createActor(app, { trustLevel: 3 })]);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await cleanup();
  });

  it('a suspended member is refused at sign-in and at refresh with 403 accountSuspended (AC-33)', async () => {
    const member = await createActor(app);
    const { cookie } = await signIn(app, member);
    expect(cookie).toBeDefined();

    await suspend(member);

    const login = await signIn(app, member, 403);
    expect(login.body).toEqual(SUSPENDED);
    const refreshed = await refresh(cookie).expect(403);
    expect(refreshed.body).toEqual(SUSPENDED);

    // Every session was revoked by the suspension, and presenting a revoked
    // one did not escalate into reuse detection.
    expect(
      await countRows(db, 'auth_sessions WHERE user_id = $1 AND revoked_at IS NULL', [member.id]),
    ).toBe(0);
    expect(
      await countRows(db, `auth_sessions WHERE user_id = $1 AND revoked_reason = 'rotation_reuse'`, [
        member.id,
      ]),
    ).toBe(0);
  });

  it('lifting a suspension early lets the member sign in at once; the old session stays dead (AC-33)', async () => {
    const member = await createActor(app);
    const { cookie } = await signIn(app, member);
    await suspend(member);

    await postAction(app, moderator, {
      action: 'unsuspend_user',
      targetType: 'user',
      targetId: member.id,
      reasonCode: 'other',
    }).expect(201);

    await signIn(app, member, 200);
    const stale = await refresh(cookie).expect(401);
    expect(stale.body).toEqual(INVALID_REFRESH);
  });

  it('after the end date, sign-in lifts the suspension as the system (AC-34)', async () => {
    const member = await createActor(app);
    await suspend(member);
    await expire(member.id);

    const login = await signIn(app, member, 200);
    expect((login.body['data'] as { user: { status: string } }).user.status).toBe('active');

    const { rows } = await db.query<{ status: string; suspended_until: Date | null; suspension_reason: string | null }>(
      `SELECT status::text, suspended_until, suspension_reason FROM users WHERE id = $1`,
      [member.id],
    );
    expect(rows[0]).toEqual({ status: 'active', suspended_until: null, suspension_reason: null });

    const actions = await db.query<Record<string, unknown>>(
      `SELECT * FROM moderation_actions
        WHERE target_user_id = $1 AND action_type = 'user_unsuspended'`,
      [member.id],
    );
    expect(actions.rows).toHaveLength(1);
    expect(actions.rows[0]).toMatchObject({
      actor_type: 'system',
      actor_user_id: null,
      actor_role: null,
      target_type: 'user',
      target_id: member.id,
    });

    const audit = await db.query<Record<string, unknown>>(
      `SELECT * FROM audit_logs WHERE moderation_action_id = $1`,
      [actions.rows[0]?.['id']],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_type: 'system',
      actor_user_id: null,
      action: 'moderation.user_unsuspended',
      entity_type: 'user',
      entity_id: member.id,
      subject_user_id: member.id,
      after: { status: 'active', suspendedUntil: null },
    });

    // A second sign-in finds nothing left to lift.
    await signIn(app, member, 200);
    expect(
      await countRows(db, `moderation_actions WHERE target_user_id = $1 AND actor_type = 'system'`, [
        member.id,
      ]),
    ).toBe(1);
  });

  it('after the end date, a refresh with the revoked session lifts the suspension but still asks for a new sign-in', async () => {
    const member = await createActor(app);
    const { cookie } = await signIn(app, member);
    await suspend(member);
    await expire(member.id);

    const res = await refresh(cookie).expect(401);
    expect(res.body).toEqual(INVALID_REFRESH);
    expect(
      (await db.query<{ status: string }>(`SELECT status::text FROM users WHERE id = $1`, [member.id]))
        .rows[0]?.status,
    ).toBe('active');
    await signIn(app, member, 200);
  });

  it('two sign-ins racing past the end date record exactly one lift', async () => {
    const member = await createActor(app);
    await suspend(member);
    await expire(member.id);

    const results = await Promise.all([signIn(app, member, 200), signIn(app, member, 200)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(
      await countRows(db, `moderation_actions WHERE target_user_id = $1 AND actor_type = 'system'`, [
        member.id,
      ]),
    ).toBe(1);
  });

  it('a suspension with no end date is still refused, as before (no regression)', async () => {
    const member = await createActor(app);
    await db.query(
      `UPDATE users SET status = 'suspended', suspended_until = NULL WHERE id = $1`,
      [member.id],
    );
    const login = await signIn(app, member, 403);
    expect(login.body).toEqual(SUSPENDED);
    expect(
      await countRows(db, `moderation_actions WHERE target_user_id = $1`, [member.id]),
    ).toBe(0);
  });

  it('a suspension that has not ended yet is not lifted', async () => {
    const member = await createActor(app);
    await suspend(member, 1);
    await signIn(app, member, 403);
    expect(
      (await db.query<{ status: string }>(`SELECT status::text FROM users WHERE id = $1`, [member.id]))
        .rows[0]?.status,
    ).toBe('suspended');
  });
});
