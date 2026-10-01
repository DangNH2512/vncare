import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '../support/harness.js';

/**
 * Pins the shape of `users.role` at the database level. The enum is the last
 * line of defence for the role ladder: if a stale value such as `guest` crept
 * back in, the API's own role checks would be comparing against labels the
 * schema no longer vouches for.
 *
 * The connection is opened in `beforeAll` with no try/catch and no skip, so an
 * unreachable database fails the file loudly instead of reporting green.
 */
describe('user_role_enum', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('holds exactly the five staff/member roles, in ladder order', async () => {
    const { rows } = await pool.query<{ enumlabel: string }>(
      `SELECT e.enumlabel
         FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role_enum'
        ORDER BY e.enumsortorder`,
    );
    expect(rows.map((r) => r.enumlabel)).toEqual([
      'member',
      'curator',
      'moderator',
      'admin',
      'super_admin',
    ]);
  });

  it.each(['guest', 'organizer', 'verified_member', 'support'])(
    'has no %s label',
    async (label) => {
      const { rows } = await pool.query(
        `SELECT 1
           FROM pg_enum e
           JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'user_role_enum' AND e.enumlabel = $1`,
        [label],
      );
      expect(rows).toHaveLength(0);
    },
  );

  it('types users.role as a NOT NULL user_role_enum defaulting to member', async () => {
    const { rows } = await pool.query<{
      udt_name: string;
      is_nullable: string;
      column_default: string;
    }>(
      `SELECT udt_name, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.udt_name).toBe('user_role_enum');
    expect(rows[0]?.is_nullable).toBe('NO');
    expect(rows[0]?.column_default).toContain("'member'");
  });

  it('rejects an INSERT with role guest (22P02) and leaves no row behind', async () => {
    const email = `enum-${randomUUID()}@example.test`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await expect(
        client.query(`INSERT INTO users (email, role) VALUES ($1, 'guest')`, [email]),
      ).rejects.toMatchObject({ code: '22P02' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
    const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    expect(rows).toHaveLength(0);
  });
});
