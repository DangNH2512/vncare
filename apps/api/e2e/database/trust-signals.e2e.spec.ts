import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '../support/harness.js';

/**
 * Locks the database contract of migration 0009: columns, indexes, privileges
 * of `dnc_app`, the append-only trigger and the cascade from `users`.
 *
 * The connection is opened in `beforeAll` with no try/catch and no skip. A
 * missing table means migration 0009 was not applied to this database; the
 * message says so rather than leaving a bare "relation does not exist".
 *
 * Almost every case runs inside a transaction that is always rolled back, so a
 * failing assertion cannot leave rows behind. Only the cascade case commits,
 * and it deletes its own user in a finally block.
 */

const TYPE_VALUES = [
  'email_verified',
  'phone_verified',
  'social_google',
  'social_facebook',
  'social_apple',
  'id_document',
  'profile_completed',
  'attended_event',
  'hosted_event_completed',
  'positive_review',
  'community_vouch',
  'staff_endorsement',
  'penalty_no_show',
  'penalty_report_upheld',
];
const STATUS_VALUES = ['pending', 'verified', 'rejected', 'expired', 'revoked'];

async function newUser(client: Pick<PoolClient, 'query'>): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (email) VALUES ($1) RETURNING id`,
    [`ts-${randomUUID()}@example.test`],
  );
  return rows[0]!.id;
}

async function newSignal(
  client: Pick<PoolClient, 'query'>,
  userId: string,
  type = 'email_verified',
  status = 'verified',
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO trust_signals (user_id, type, status, weight, evidence_type)
     VALUES ($1, $2, $3, 5, 'manual') RETURNING id`,
    [userId, type, status],
  );
  return rows[0]!.id;
}

describe('trust_signals', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
    const { rows } = await pool.query<{ t: string | null }>(
      `SELECT to_regclass('public.trust_signals')::text AS t`,
    );
    if (rows[0]?.t === null) {
      throw new Error(
        'trust_signals is missing: apply apps/api/src/database/sql/0009_trust_signals.sql to this database',
      );
    }
    const role = await pool.query(`SELECT 1 FROM pg_roles WHERE rolname = 'dnc_app'`);
    if (role.rowCount === 0) {
      throw new Error(
        'role dnc_app is missing: apply apps/api/src/database/sql/0009_trust_signals.sql to this database',
      );
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  /** Runs `fn` in a transaction and always rolls it back. */
  async function inTx(fn: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await fn(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  describe('schema (AC-37)', () => {
    it('has the expected columns, types and nullability', async () => {
      const { rows } = await pool.query<{
        column_name: string;
        udt_name: string;
        is_nullable: string;
      }>(
        `SELECT column_name, udt_name, is_nullable
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'trust_signals'`,
      );
      const cols = Object.fromEntries(rows.map((r) => [r.column_name, r]));
      const expected: Record<string, [string, string]> = {
        id: ['uuid', 'NO'],
        user_id: ['uuid', 'NO'],
        type: ['trust_signal_type_enum', 'NO'],
        status: ['trust_signal_status_enum', 'NO'],
        weight: ['int2', 'NO'],
        evidence_type: ['varchar', 'NO'],
        evidence_id: ['uuid', 'YES'],
        issued_by_user_id: ['uuid', 'YES'],
        metadata: ['jsonb', 'NO'],
        verified_at: ['timestamptz', 'YES'],
        expires_at: ['timestamptz', 'YES'],
        revoked_at: ['timestamptz', 'YES'],
        revoked_reason: ['varchar', 'YES'],
        created_at: ['timestamptz', 'NO'],
      };
      expect(Object.keys(cols).toSorted()).toEqual(Object.keys(expected).toSorted());
      for (const [name, [udt, nullable]] of Object.entries(expected)) {
        expect(cols[name]?.udt_name, `${name} type`).toBe(udt);
        expect(cols[name]?.is_nullable, `${name} nullability`).toBe(nullable);
      }
    });

    it('cascades from users and restricts on the issuer', async () => {
      const { rows } = await pool.query<{ conname: string; confdeltype: string }>(
        `SELECT a.attname AS conname, c.confdeltype
           FROM pg_constraint c
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
          WHERE c.conrelid = 'trust_signals'::regclass AND c.contype = 'f'`,
      );
      const byColumn = Object.fromEntries(rows.map((r) => [r.conname, r.confdeltype]));
      expect(byColumn['user_id']).toBe('c');
      expect(byColumn['issued_by_user_id']).toBe('r');
    });

    it('holds all 14 type and 5 status enum values', async () => {
      const labels = async (typname: string): Promise<string[]> => {
        const { rows } = await pool.query<{ enumlabel: string }>(
          `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = $1 ORDER BY e.enumsortorder`,
          [typname],
        );
        return rows.map((r) => r.enumlabel);
      };
      expect(await labels('trust_signal_type_enum')).toEqual(TYPE_VALUES);
      expect(await labels('trust_signal_status_enum')).toEqual(STATUS_VALUES);
    });

    it('has both partial indexes under their agreed names', async () => {
      const { rows } = await pool.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = 'trust_signals'`,
      );
      const defs = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
      expect(defs['idx_trust_signals_user_active']).toBeDefined();
      expect(defs['uq_trust_signals_unique_kind']).toContain('UNIQUE');
      expect(defs['uq_trust_signals_unique_kind']).toContain('revoked_at IS NULL');
    });
  });

  describe('dnc_app privileges (AC-38)', () => {
    it('reports the least-privilege grants', async () => {
      const { rows } = await pool.query<Record<string, boolean>>(
        `SELECT has_table_privilege('dnc_app','trust_signals','SELECT')  AS sel,
                has_table_privilege('dnc_app','trust_signals','INSERT')  AS ins,
                has_table_privilege('dnc_app','trust_signals','UPDATE')  AS upd,
                has_table_privilege('dnc_app','trust_signals','DELETE')  AS del,
                has_column_privilege('dnc_app','trust_signals','revoked_at','UPDATE')     AS upd_at,
                has_column_privilege('dnc_app','trust_signals','revoked_reason','UPDATE') AS upd_reason,
                has_column_privilege('dnc_app','trust_signals','weight','UPDATE')         AS upd_weight`,
      );
      expect(rows[0]).toEqual({
        sel: true,
        ins: true,
        upd: false,
        del: false,
        upd_at: true,
        upd_reason: true,
        upd_weight: false,
      });
    });

    it('can INSERT and SELECT as dnc_app', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await c.query('SET LOCAL ROLE dnc_app');
        const id = await newSignal(c, userId);
        const { rows } = await c.query('SELECT 1 FROM trust_signals WHERE id = $1', [id]);
        expect(rows).toHaveLength(1);
      });
    });

    it('rejects UPDATE of weight as dnc_app with 42501', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query('SET LOCAL ROLE dnc_app');
        await expect(
          c.query('UPDATE trust_signals SET weight = 42 WHERE id = $1', [id]),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('rejects DELETE as dnc_app with 42501', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query('SET LOCAL ROLE dnc_app');
        await expect(
          c.query('DELETE FROM trust_signals WHERE id = $1', [id]),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('allows UPDATE of revoked_at and revoked_reason as dnc_app', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query('SET LOCAL ROLE dnc_app');
        const res = await c.query(
          `UPDATE trust_signals SET revoked_at = now(), revoked_reason = 'test' WHERE id = $1`,
          [id],
        );
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('append-only trigger, as the owner dnc (AC-39)', () => {
    it('rejects an UPDATE of any other column with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await expect(
          c.query('UPDATE trust_signals SET weight = 42 WHERE id = $1', [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });

    it('lets revoked_at go from NULL to a value', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        const res = await c.query(
          `UPDATE trust_signals SET revoked_at = now(), revoked_reason = 'abuse' WHERE id = $1`,
          [id],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('rejects changing a revoked_at that is already set with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query(`UPDATE trust_signals SET revoked_at = now() WHERE id = $1`, [id]);
        await expect(
          c.query(`UPDATE trust_signals SET revoked_at = now() + interval '1 day' WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });
  });

  describe('revocation is final and other columns are frozen (AC-39)', () => {
    it('rejects rewriting revoked_reason after revocation with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query(
          `UPDATE trust_signals SET revoked_at = now(), revoked_reason = 'a' WHERE id = $1`,
          [id],
        );
        await expect(
          c.query(`UPDATE trust_signals SET revoked_reason = 'rewritten' WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });

    it('rejects clearing revoked_reason after revocation with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query(
          `UPDATE trust_signals SET revoked_at = now(), revoked_reason = 'a' WHERE id = $1`,
          [id],
        );
        await expect(
          c.query(`UPDATE trust_signals SET revoked_reason = NULL WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });

    it('rejects setting revoked_at back to NULL with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await c.query(`UPDATE trust_signals SET revoked_at = now() WHERE id = $1`, [id]);
        await expect(
          c.query(`UPDATE trust_signals SET revoked_at = NULL WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });

    it('rejects an UPDATE of metadata with 55000', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const id = await newSignal(c, userId);
        await expect(
          c.query(`UPDATE trust_signals SET metadata = '{"x":1}'::jsonb WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ code: '55000' });
      });
    });
  });

  describe('constraints (AC-40)', () => {
    it('rejects a second verified email_verified for the same user with 23505', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await newSignal(c, userId);
        await expect(newSignal(c, userId)).rejects.toMatchObject({ code: '23505' });
      });
    });

    it('accepts a new verified signal of the same kind after a revoke', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        const first = await newSignal(c, userId);
        await c.query(`UPDATE trust_signals SET revoked_at = now() WHERE id = $1`, [first]);
        const second = await newSignal(c, userId);
        expect(second).not.toBe(first);
      });
    });

    it('does not apply the uniqueness rule to repeatable kinds', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await newSignal(c, userId, 'attended_event');
        await newSignal(c, userId, 'attended_event');
      });
    });

    it('rejects a type outside the enum with 22P02', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await expect(newSignal(c, userId, 'not_a_signal')).rejects.toMatchObject({
          code: '22P02',
        });
      });
    });

    it('rejects an unknown evidence_type with 23514', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await expect(
          c.query(
            `INSERT INTO trust_signals (user_id, type, status, weight, evidence_type)
             VALUES ($1, 'attended_event', 'verified', 1, 'rumour')`,
            [userId],
          ),
        ).rejects.toMatchObject({ code: '23514' });
      });
    });

    it('rejects revoked_reason without revoked_at with 23514', async () => {
      await inTx(async (c) => {
        const userId = await newUser(c);
        await expect(
          c.query(
            `INSERT INTO trust_signals (user_id, type, status, weight, evidence_type, revoked_reason)
             VALUES ($1, 'attended_event', 'verified', 1, 'manual', 'why')`,
            [userId],
          ),
        ).rejects.toMatchObject({ code: '23514', constraint: 'ck_trust_signals_revoked_reason_needs_revoked_at' });
      });
    });
  });

  describe('cascade from users (AC-41)', () => {
    it('removes trust_signals rows when the user is deleted', async () => {
      const userId = await newUser(pool);
      try {
        await newSignal(pool, userId);
        await newSignal(pool, userId, 'attended_event');
        const before = await pool.query('SELECT 1 FROM trust_signals WHERE user_id = $1', [userId]);
        expect(before.rowCount).toBe(2);
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
      const after = await pool.query('SELECT 1 FROM trust_signals WHERE user_id = $1', [userId]);
      expect(after.rowCount).toBe(0);
    });
  });
});
