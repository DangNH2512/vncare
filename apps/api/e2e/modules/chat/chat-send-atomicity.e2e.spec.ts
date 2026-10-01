import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RateLimitService } from '../../../src/common/rate-limit/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

/**
 * Opening-message quota and idempotency must be decided under the conversation
 * row lock, otherwise parallel sends all observe the same pre-insert state.
 */
describe('chat send atomicity', () => {
  let app: INestApplication;
  let db: Pool;
  let redis: Redis;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    db = new Pool({ connectionString: DATABASE_URL, max: 4 });
    redis = new Redis(process.env['REDIS_CACHE_URL'] ?? 'redis://localhost:6381');
  });

  afterAll(async () => {
    redis.disconnect();
    await db.end();
    await app.close();
    await cleanup();
  });

  const pendingThread = async (): Promise<{ id: string; sender: Actor }> => {
    const sender = await createActor(app, { trustLevel: 2 });
    const recipient = await createActor(app, { trustLevel: 2 });
    const res = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set(sender.headers)
      .send({ type: 'direct', recipientUserId: recipient.id })
      .expect(201);
    return { id: res.body.data.id, sender };
  };

  const post = (id: string, sender: Actor, clientMessageId: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/conversations/${id}/messages`)
      .set(sender.headers)
      .send({ type: 'text', body: 'Hello', clientMessageId });

  const storedCount = async (id: string): Promise<number> => {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM messages WHERE conversation_id = $1`,
      [id],
    );
    return rows[0]?.n ?? 0;
  };

  /** Resolves once `expected` backends are blocked on a row lock of `conversations`. */
  const waitForLockWaiters = async (expected: number): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const { rows } = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE datname = current_database()
            AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock'
            AND query ILIKE '%FROM conversations%FOR UPDATE%'`,
      );
      if ((rows[0]?.n ?? 0) >= expected) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('requests never queued on the conversation lock');
  };

  it('answers every parallel retry of one clientMessageId with the stored message', async () => {
    const { id, sender } = await pendingThread();
    const clientMessageId = randomUUID();

    // Hold the conversation lock so all three requests are inside the send
    // path before any of them can commit.
    const holder = await db.connect();
    let results;
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM conversations WHERE id = $1 FOR UPDATE`, [id]);
      const inflight = Promise.all([
        post(id, sender, clientMessageId),
        post(id, sender, clientMessageId),
        post(id, sender, clientMessageId),
      ]);
      await waitForLockWaiters(3);
      await holder.query('COMMIT');
      results = await inflight;
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }

    for (const r of results) expect(r.status).toBe(201);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    expect(await storedCount(id)).toBe(1);
  });

  it('lets exactly one of three parallel distinct messages through a quota of one', async () => {
    const { id, sender } = await pendingThread();

    const results = await Promise.all([
      post(id, sender, randomUUID()),
      post(id, sender, randomUUID()),
      post(id, sender, randomUUID()),
    ]);

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const refused = results.filter((r) => r.status === 403);
    expect(refused).toHaveLength(2);
    for (const r of refused) expect(r.body.code).toBe('REQUEST_QUOTA_EXHAUSTED');
    expect(await storedCount(id)).toBe(1);
  });

  /** Minute-bucket counter the send path reserves against, i.e. slots currently held. */
  const heldSlots = async (user: Actor): Promise<number> => {
    const key = app.get(RateLimitService).keyFor('chat_message', 'user', user.id, 'minute');
    return Number((await redis.get(key)) ?? 0);
  };

  it('replays the original after the quota is spent, and counts only real inserts', async () => {
    const { id, sender } = await pendingThread();
    const first = randomUUID();
    const original = await post(id, sender, first).expect(201);
    expect(await heldSlots(sender)).toBe(1);

    // Two refusals, then a replay that must resolve under the lock.
    await post(id, sender, randomUUID()).expect(403);
    await post(id, sender, randomUUID()).expect(403);

    // The replay is answered from the stored original; the locked-path replay
    // with a spent quota is covered by the parallel-retry test above.
    const replay = await post(id, sender, first);
    expect(replay.status).toBe(201);
    expect(replay.body.data.id).toBe(original.body.data.id);
    expect(await storedCount(id)).toBe(1);
    expect(await heldSlots(sender)).toBe(1);
  });

  it('answers 503 when the conversation lock is held too long and gives the slot back', async () => {
    const { id, sender } = await pendingThread();
    const holder = await db.connect();
    let res;
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM conversations WHERE id = $1 FOR UPDATE`, [id]);
      res = await post(id, sender, randomUUID());
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }

    expect(res.status).toBe(503);
    expect(await storedCount(id)).toBe(0);
    expect(await heldSlots(sender)).toBe(0);
  });
});
