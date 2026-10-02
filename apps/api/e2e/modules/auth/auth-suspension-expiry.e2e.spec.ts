import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SuspensionExpiryService } from '../../../src/modules/moderation-jobs/index.js';
import { createActor, createTestApp, DATABASE_URL, seedArea, type Actor } from '../../support/harness.js';

/** Lazy lifting of timed suspensions at sign-in (D-M12, T-9). */
describe('sign-in and expired suspensions', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanup: () => Promise<void>;
  const actors: string[] = [];

  const login = (who: Actor) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: who.email, password: 'e2e-password-long-enough' });
  const suspend = async (who: Actor, until: string | null) => {
    await pool.query(`UPDATE users SET status = 'suspended', suspended_until = ${until ?? 'NULL'} WHERE id = $1`, [who.id]);
  };
  const status = async (who: Actor) =>
    (await pool.query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [who.id])).rows[0]?.status;
  const make = async () => {
    const who = await createActor(app);
    actors.push(who.id);
    return who;
  };

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(`DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[])`, [actors]);
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

  it('lets an account in once suspended_until has passed, with a job audit line', async () => {
    const who = await make();
    await suspend(who, `now() - interval '1 minute'`);
    expect((await login(who)).status).toBe(200);
    expect(await status(who)).toBe('active');
    const lines = await pool.query(
      `SELECT actor_type FROM audit_logs WHERE entity_id = $1 AND action = 'user.unsuspended'`,
      [who.id],
    );
    expect(lines.rows).toEqual([{ actor_type: 'job' }]);
  });

  it('refuses while suspended_until is in the future, without a lifting pass', async () => {
    const who = await make();
    await suspend(who, `now() + interval '1 day'`);
    const lift = vi.spyOn(app.get(SuspensionExpiryService), 'expireDueSuspensions');
    expect((await login(who)).status).toBe(403);
    expect(lift).not.toHaveBeenCalled();
    expect(await status(who)).toBe('suspended');
  });

  it('refuses an open-ended A3 suspension without a lifting pass', async () => {
    const who = await make();
    await suspend(who, null);
    const lift = vi.spyOn(app.get(SuspensionExpiryService), 'expireDueSuspensions');
    expect((await login(who)).status).toBe(403);
    expect(lift).not.toHaveBeenCalled();
    expect(await status(who)).toBe('suspended');
  });
});
