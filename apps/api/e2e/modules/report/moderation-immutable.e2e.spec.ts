import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '../../support/harness.js';

/**
 * Append-only guarantee of moderation_actions, enforced by the database.
 *
 * The API connects as the owner `dnc`, so the triggers are what protect the
 * table there. `dnc_app` is the least-privilege role, exercised through
 * SET LOCAL ROLE. Same shape as audit-immutable.e2e.spec.ts.
 */
const code = (error: unknown): string | undefined => (error as { code?: string }).code;

describe('moderation_actions immutability', () => {
  let pool: Pool;
  const actorId = randomUUID();
  const subjectId = randomUUID();
  const NOTE = 'a reason of at least twenty characters';
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

  /** Runs one statement in a rolled-back sandbox and returns the pg error code, if any. */
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

  const insert = (note: string, action = 'warning', caseId: string | null = null, expires: string | null = null) =>
    `INSERT INTO moderation_actions
       (case_id, action_type, actor_user_id, subject_user_id, reason_code, reason_note, severity, expires_at)
     VALUES (${caseId ? `'${caseId}'` : 'NULL'}, '${action}', '${actorId}', '${subjectId}', 'spam_advertising',
             '${note}', 'normal', ${expires ? `'${expires}'` : 'NULL'})`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    const { rows } = await pool.query<{ id: string }>(`${insert(NOTE)} RETURNING id`);
    rowId = rows[0]?.id as string;
  });

  afterAll(async () => {
    // Deletes are blocked by trigger; teardown lifts the guard inside one
    // transaction and removes only this spec's rows by actor id. No TRUNCATE:
    // the database is shared with other specs and with dev data.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE moderation_actions DISABLE TRIGGER trg_moderation_actions_guard_delete');
      await client.query('DELETE FROM moderation_actions WHERE actor_user_id = $1', [actorId]);
      await client.query('ALTER TABLE moderation_actions ENABLE TRIGGER trg_moderation_actions_guard_delete');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('rejects rewriting the reason note or any other column (55000)', async () => {
    for (const set of [
      `reason_note = 'rewritten history of twenty chars'`,
      `severity = 'low'`,
      `action_type = 'no_action'`,
      `actor_user_id = NULL`,
      `subject_user_id = NULL`,
      `reason_code = 'other'`,
      `expires_at = now()`,
      `created_at = now()`,
      `strike_weight = 9`,
    ]) {
      expect(await failure(null, `UPDATE moderation_actions SET ${set} WHERE id = $1`, [rowId]), set).toBe('55000');
    }
  });

  it('rejects DELETE (55000)', async () => {
    expect(await failure(null, `DELETE FROM moderation_actions WHERE id = $1`, [rowId])).toBe('55000');
  });

  it('allows setting revoked_* once, and then makes the revocation final', async () => {
    const result = await sandbox(null, async (c) => {
      await c.query(
        `UPDATE moderation_actions SET revoked_at = now(), revoked_by_user_id = $2, revoke_reason = 'mistake'
          WHERE id = $1`,
        [rowId, actorId],
      );
      const { rows } = await c.query<{ revoked_at: Date | null; revoke_reason: string | null }>(
        `SELECT revoked_at, revoke_reason FROM moderation_actions WHERE id = $1`,
        [rowId],
      );
      let second: string | undefined;
      try {
        await c.query('SAVEPOINT s');
        await c.query(`UPDATE moderation_actions SET revoke_reason = 'changed my mind' WHERE id = $1`, [rowId]);
      } catch (error) {
        second = code(error);
        await c.query('ROLLBACK TO SAVEPOINT s');
      }
      let undo: string | undefined;
      try {
        await c.query(`UPDATE moderation_actions SET revoked_at = NULL WHERE id = $1`, [rowId]);
      } catch (error) {
        undo = code(error);
      }
      return { row: rows[0], second, undo };
    });
    expect(result.row?.revoked_at).toBeInstanceOf(Date);
    expect(result.row?.revoke_reason).toBe('mistake');
    expect(result.second).toBe('55000');
    expect(result.undo).toBe('55000');
  });

  it('enforces the 20 character reason note in the table (23514)', async () => {
    expect(await failure(null, insert('x'.repeat(19)))).toBe('23514');
    // Surrounding blanks do not count: 19 characters padded to 25.
    expect(await failure(null, insert(`   ${'x'.repeat(19)}   `))).toBe('23514');
    expect(await failure(null, insert('x'.repeat(20)))).toBeUndefined();
  });

  it('requires an expiry for a case-bound suspension but not for an admin one', async () => {
    const caseId = await sandbox(null, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO moderation_cases (target_type, target_id, severity, sla_due_at)
         VALUES ('event', $1, 'high', now() + interval '1 hour') RETURNING id`,
        [randomUUID()],
      );
      const id = rows[0]?.id as string;
      const results: Record<string, string | undefined> = {};
      for (const [name, sql] of [
        ['case without expiry', insert(NOTE, 'suspended', id)],
        ['case with expiry', insert(NOTE, 'suspended', id, '2099-01-01T00:00:00Z')],
        ['admin without expiry', insert(NOTE, 'suspended')],
      ] as const) {
        await c.query('SAVEPOINT s');
        try {
          await c.query(sql);
          results[name] = undefined;
        } catch (error) {
          results[name] = code(error);
          await c.query('ROLLBACK TO SAVEPOINT s');
        }
      }
      return results;
    });
    expect(caseId).toEqual({
      'case without expiry': '23514',
      'case with expiry': undefined,
      'admin without expiry': undefined,
    });
  });

  it('as dnc_app: may insert and revoke, may not rewrite or delete (42501)', async () => {
    await sandbox('dnc_app', async (c) => {
      await c.query(insert(NOTE));
      await c.query(`UPDATE moderation_actions SET revoke_reason = 'mistake', revoked_at = now() WHERE id = $1`, [rowId]);
    });
    expect(await failure('dnc_app', `UPDATE moderation_actions SET reason_note = 'x' WHERE id = $1`, [rowId])).toBe('42501');
    expect(await failure('dnc_app', `UPDATE moderation_actions SET severity = 'low' WHERE id = $1`, [rowId])).toBe('42501');
    expect(await failure('dnc_app', `DELETE FROM moderation_actions WHERE id = $1`, [rowId])).toBe('42501');
    expect(await failure('dnc_app', `TRUNCATE moderation_actions`)).toBe('42501');
  });

  it('keeps reports and cases updatable for the app role but never deletable', async () => {
    expect(await failure('dnc_app', `DELETE FROM reports WHERE id = $1`, [randomUUID()])).toBe('42501');
    expect(await failure('dnc_app', `DELETE FROM moderation_cases WHERE id = $1`, [randomUUID()])).toBe('42501');
    expect(await failure('dnc_app', `UPDATE reports SET status = 'resolved' WHERE id = $1`, [randomUUID()])).toBeUndefined();
  });
});
