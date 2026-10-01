import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '../../support/harness.js';

/**
 * Append-only guarantee of audit_logs, enforced by the database.
 *
 * The API connects as the owner `dnc`, so the trigger is what protects the
 * table there. `dnc_app` is the least-privilege role the API should run as
 * once it is wired in; it is exercised through SET LOCAL ROLE.
 */
describe('audit_logs immutability', () => {
  let pool: Pool;
  const actorId = randomUUID();
  const entityId = randomUUID();
  let rowId: string;

  /** Runs `work` in a transaction that is always rolled back. */
  async function sandbox<T>(role: string | null, work: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (role) await client.query(`SET LOCAL ROLE ${role}`);
      return await work(client);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  }

  const code = (error: unknown): string | undefined => (error as { code?: string }).code;

  /** Runs one statement inside a savepoint-free sandbox and returns the pg error code. */
  async function failure(role: string | null, sql: string, params: unknown[] = []) {
    return sandbox(role, async (c) => {
      try {
        await c.query(sql, params);
        return undefined;
      } catch (error) {
        return code(error);
      }
    });
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO audit_logs (actor_user_id, actor_type, actor_role_at_time, action, entity_type,
                               entity_id, reason, ip, user_agent, severity)
       VALUES ($1, 'staff', 'admin', 'user.suspended', 'user', $2,
               'a reason of at least twenty characters', '203.0.113.7', 'e2e-agent', 'warning')
       RETURNING id`,
      [actorId, entityId],
    );
    rowId = rows[0]?.id as string;
  });

  afterAll(async () => {
    // Deletes are blocked by trigger; teardown lifts the guard inside one
    // transaction, so no other session ever observes the table unguarded.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query('DELETE FROM audit_logs WHERE actor_user_id = $1', [actorId]);
      await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('rejects rewriting the reason as the API role (55000)', async () => {
    expect(await failure(null, `UPDATE audit_logs SET reason = 'rewritten history' WHERE id = $1`, [rowId])).toBe('55000');
  });

  it('rejects rewriting immutable columns other than the reason (55000)', async () => {
    for (const set of [
      `severity = 'info'`,
      `"after" = '{"x":1}'::jsonb`,
      `action = 'user.other'`,
      `created_at = now()`,
      `actor_user_id = NULL`,
    ]) {
      expect(await failure(null, `UPDATE audit_logs SET ${set} WHERE id = $1`, [rowId]), set).toBe('55000');
    }
  });

  it('rejects DELETE as the API role (55000)', async () => {
    expect(await failure(null, `DELETE FROM audit_logs WHERE id = $1`, [rowId])).toBe('55000');
  });

  it('allows clearing ip and user_agent', async () => {
    const cleared = await sandbox(null, async (c) => {
      await c.query(`UPDATE audit_logs SET ip = NULL, user_agent = NULL WHERE id = $1`, [rowId]);
      const { rows } = await c.query<{ ip: string | null; user_agent: string | null }>(
        `SELECT ip, user_agent FROM audit_logs WHERE id = $1`,
        [rowId],
      );
      return rows[0];
    });
    expect(cleared).toEqual({ ip: null, user_agent: null });
  });

  it('refuses to rewrite ip to another value (55000)', async () => {
    expect(await failure(null, `UPDATE audit_logs SET ip = '198.51.100.1' WHERE id = $1`, [rowId])).toBe('55000');
  });

  it('as dnc_app: may insert and clear ip, may not rewrite or delete (42501)', async () => {
    await sandbox('dnc_app', async (c) => {
      await c.query(
        `INSERT INTO audit_logs (actor_type, action, entity_type) VALUES ('system', 'job.ran', 'user')`,
      );
      await c.query(`UPDATE audit_logs SET ip = NULL WHERE id = $1`, [rowId]);
    });
    expect(await failure('dnc_app', `UPDATE audit_logs SET reason = 'x' WHERE id = $1`, [rowId])).toBe('42501');
    expect(await failure('dnc_app', `DELETE FROM audit_logs WHERE id = $1`, [rowId])).toBe('42501');
  });

  it('enforces the staff reason length and the action pattern in the table', async () => {
    const base = `INSERT INTO audit_logs (actor_type, action, entity_type, reason) VALUES`;
    expect(await failure(null, `${base} ('staff', 'user.suspended', 'user', 'too short')`)).toBe('23514');
    expect(await failure(null, `${base} ('staff', 'user.suspended', 'user', NULL)`)).toBe('23514');
    expect(await failure(null, `${base} ('system', 'BadAction', 'user', NULL)`)).toBe('23514');
    expect(await failure(null, `${base} ('system', 'a.b', 'user', NULL)`)).toBeUndefined();
  });
});
