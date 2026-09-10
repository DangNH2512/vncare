import type { Pool, PoolClient } from 'pg';

/**
 * Runs `work` inside one transaction and always returns the connection.
 *
 * Every multi-statement write goes through here. Reading a row and then writing
 * it on two different pooled connections is the shape that produces lost
 * updates under concurrency, and it is invisible in review unless the
 * transaction boundary is explicit.
 */
export async function withTransaction<T>(
  pool: Pool,
  work: (tx: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
