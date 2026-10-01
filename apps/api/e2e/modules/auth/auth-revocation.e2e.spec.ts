import type { AddressInfo } from 'node:net';
import { Logger, type INestApplication } from '@nestjs/common';
import { SignJWT, decodeJwt } from 'jose';
import { io } from 'socket.io-client';
import { Pool } from 'pg';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { REDIS_CACHE } from '../../../src/redis/redis.module.js';
import { withTransaction } from '../../../src/common/db/transaction.js';
import {
  AuthService,
  REVOCATION_BREAKER_MS,
  REVOCATION_REDIS_TIMEOUT_MS,
} from '../../../src/modules/auth/auth.service.js';
import { createActor, createTestApp, DATABASE_URL, seedArea, type Actor } from '../../support/harness.js';

const ME = '/api/v1/auth/me';
const KEY = (id: string) => `auth:revoked:${id}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Token `iat` has one-second resolution and a token is refused when
 * `iat * 1000 <= mark`. A token minted in the same second as the mark is
 * therefore refused too; specs wait for the next second before signing in again.
 */
const NEXT_SECOND_MS = 1100;

describe('access token revocation', () => {
  let app: INestApplication;
  let pool: Pool;
  let redis: Redis;
  let auth: AuthService;
  let cleanup: () => Promise<void>;

  const me = (actor: { headers: Record<string, string> }) =>
    request(app.getHttpServer()).get(ME).set(actor.headers);

  const login = async (actor: Actor) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: actor.email, password: 'e2e-password-long-enough' })
      .expect(200);
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('dnc_refresh='));
    return {
      headers: { authorization: `Bearer ${res.body.data.accessToken as string}` },
      refreshCookie: cookie as string,
    };
  };

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    redis = app.get<Redis>(REDIS_CACHE);
    auth = app.get(AuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // The circuit breaker is per process; reset it so one test's outage does not leak into the next.
    const internals = auth as unknown as { revocationDegraded: boolean; revocationRetryAt: number };
    internals.revocationDegraded = false;
    internals.revocationRetryAt = 0;
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  it('suspension: old token gets 403 ACCOUNT_NOT_ACTIVE, sessions are revoked, refresh fails', async () => {
    const user = await createActor(app);
    const session = await login(user);
    await me(user).expect(200);

    const revoked = await auth.revokeAllSessionsForUser(user.id, 'suspended');
    expect(revoked.revokedSessions).toBeGreaterThanOrEqual(1);
    expect(revoked.markPublished).toBe(true);

    const res = await me(user);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_NOT_ACTIVE', messageKey: 'errors.auth.accountSuspended' });
    await me(session).expect(403);

    const { rows } = await pool.query<{ live: string; reasons: string[] }>(
      `SELECT count(*) FILTER (WHERE revoked_at IS NULL) AS live,
              array_agg(DISTINCT revoked_reason) AS reasons
         FROM auth_sessions WHERE user_id = $1`,
      [user.id],
    );
    expect(rows[0]?.live).toBe('0');
    expect(rows[0]?.reasons).toEqual(['suspended']);

    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', session.refreshCookie.split(';')[0] as string);
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe('INVALID_REFRESH');
  });

  it('role change: old token gets 401 UNAUTHENTICATED; a token minted afterwards works', async () => {
    const user = await createActor(app);
    await me(user).expect(200);

    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    const stale = await me(user);
    expect(stale.status).toBe(401);
    expect(stale.body).toMatchObject({ code: 'UNAUTHENTICATED', messageKey: 'errors.auth.unauthenticated' });

    await sleep(NEXT_SECOND_MS);
    const fresh = await login(user);
    await me(fresh).expect(200);
    // The old token is still refused after the new one works.
    await me(user).expect(401);
  });

  it('only the targeted user is affected', async () => {
    const [a, b] = [await createActor(app), await createActor(app)];
    await auth.revokeAllSessionsForUser(a.id, 'suspended');
    await me(a).expect(403);
    await me(b).expect(200);
  });

  it('stores one mark per user that expires with the access token', async () => {
    const user = await createActor(app);
    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    const raw = await redis.get(KEY(user.id));
    expect(raw).toMatch(/^\d{13}:role$/);
    const ttl = await redis.ttl(KEY(user.id));
    expect(ttl).toBeGreaterThan(900);
    expect(ttl).toBeLessThanOrEqual(15 * 60 + 60);
  });

  it('withSessionRevocation writes the mark only after commit, and none on rollback', async () => {
    const user = await createActor(app);

    await expect(
      auth.withSessionRevocation(async (_tx, cut) => {
        await cut(user.id, 'suspended');
        throw new Error('business step failed');
      }),
    ).rejects.toThrow('business step failed');
    await me(user).expect(200);
    expect(await redis.get(KEY(user.id))).toBeNull();

    const seenInside: Array<string | null> = [];
    const { result, markDeferred } = await auth.withSessionRevocation(async (_tx, cut) => {
      const revoked = await cut(user.id, 'suspended');
      seenInside.push(await redis.get(KEY(user.id)));
      return revoked;
    });
    expect(seenInside).toEqual([null]);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(markDeferred).toBe(false);
    await me(user).expect(403);
  });

  it('revokeSessionsInTx: ticket.publish is the only thing that cuts the token, and is idempotent', async () => {
    const user = await createActor(app);
    const ticket = await withTransaction(pool, (tx) => auth.revokeSessionsInTx(user.id, 'role_changed', tx));
    expect(ticket.revokedSessions).toBeGreaterThanOrEqual(1);
    await me(user).expect(200);
    const evalSpy = vi.spyOn(redis, 'eval');
    expect(await ticket.publish()).toBe(true);
    expect(await ticket.publish()).toBe(true);
    expect(evalSpy).toHaveBeenCalledTimes(1);
    await me(user).expect(401);
  });

  it('publish reports false (markDeferred) when Redis refuses the mark', async () => {
    const user = await createActor(app);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(redis, 'eval').mockRejectedValue(new Error('ECONNREFUSED'));
    const { markDeferred } = await auth.withSessionRevocation(async (_tx, cut) => cut(user.id, 'suspended'));
    expect(markDeferred).toBe(true);
    const standalone = await auth.revokeAllSessionsForUser(user.id, 'suspended');
    expect(standalone.markPublished).toBe(false);
  });

  it('two revocations in a row: the mark never moves back and the kind follows the later one', async () => {
    const user = await createActor(app);
    await auth.revokeAllSessionsForUser(user.id, 'suspended');
    const first = Number(((await redis.get(KEY(user.id))) ?? '').split(':')[0]);
    await sleep(5);
    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    const [at, kind] = ((await redis.get(KEY(user.id))) ?? '').split(':');
    expect(Number(at)).toBeGreaterThan(first);
    expect(kind).toBe('role');
  });

  it('a mark ahead of this node clock is not lowered by a later write', async () => {
    const user = await createActor(app);
    const ahead = `${Date.now() + 60_000}:suspended`;
    await redis.set(KEY(user.id), ahead, 'EX', 900);
    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    expect(await redis.get(KEY(user.id))).toBe(ahead);
    await redis.del(KEY(user.id));
  });

  it('boundary: iat*1000 equal to the mark is refused, one millisecond earlier mark is not', async () => {
    const user = await createActor(app);
    const iat = decodeJwt(user.accessToken).iat as number;
    await redis.set(KEY(user.id), `${iat * 1000 - 1}:role`, 'EX', 900);
    await me(user).expect(200);
    await redis.set(KEY(user.id), `${iat * 1000}:role`, 'EX', 900);
    await me(user).expect(401);
    await redis.set(KEY(user.id), `${iat * 1000 + 1}:suspended`, 'EX', 900);
    await me(user).expect(403);
    await redis.del(KEY(user.id));
  });

  it('a validly signed token without iat is valid until a mark exists, then refused', async () => {
    const user = await createActor(app);
    const key = (auth as unknown as { privateKey: CryptoKey }).privateKey;
    const token = await new SignJWT({ role: 'member', trustLevel: 1 })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject(user.id)
      .setIssuer('dnc')
      .setAudience('dnc-client')
      .setExpirationTime('10m')
      .sign(key);
    const headers = { authorization: `Bearer ${token}` };
    await request(app.getHttpServer()).get(ME).set(headers).expect(200);
    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    await request(app.getHttpServer()).get(ME).set(headers).expect(401);
  });

  it('role change then refresh with the old refresh cookie is refused', async () => {
    const user = await createActor(app);
    const session = await login(user);
    await auth.revokeAllSessionsForUser(user.id, 'role_changed');
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', session.refreshCookie.split(';')[0] as string);
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe('INVALID_REFRESH');
  });

  it('chat gateway refuses a handshake with a revoked token', async () => {
    const user = await createActor(app);
    const address = app.getHttpServer().address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/chat`;
    const attempt = async (token: string): Promise<boolean> => {
      const socket = io(url, { transports: ['websocket'], auth: { token } });
      try {
        return await new Promise<boolean>((resolve) => {
          // Joined the per-user room and still connected after a beat means accepted.
          socket.on('disconnect', () => resolve(false));
          setTimeout(() => resolve(socket.connected), 800);
        });
      } finally {
        socket.disconnect();
      }
    };
    expect(await attempt(user.accessToken)).toBe(true);
    await auth.revokeAllSessionsForUser(user.id, 'suspended');
    expect(await attempt(user.accessToken)).toBe(false);
  });

  it('adds exactly one Redis GET per authenticated request', async () => {
    const user = await createActor(app);
    const get = vi.spyOn(redis, 'get');
    await me(user).expect(200);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(KEY(user.id));
    await request(app.getHttpServer()).get(ME).expect(401);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('fails open and logs once when Redis errors', async () => {
    const user = await createActor(app);
    await auth.revokeAllSessionsForUser(user.id, 'suspended');
    await me(user).expect(403);

    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const get = vi.spyOn(redis, 'get').mockRejectedValue(new Error('ECONNREFUSED'));
    await me(user).expect(200);
    await me(user).expect(200);
    expect(get).toHaveBeenCalledTimes(1);
    const unavailable = warn.mock.calls.filter(([msg]) => String(msg).includes('revocation check unavailable'));
    expect(unavailable).toHaveLength(1);
  });

  it('fails open when Redis hangs, within the timeout', async () => {
    const user = await createActor(app);
    await auth.revokeAllSessionsForUser(user.id, 'suspended');
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(redis, 'get').mockReturnValue(new Promise(() => undefined) as never);
    const started = Date.now();
    await me(user).expect(200);
    expect(Date.now() - started).toBeLessThan(REVOCATION_REDIS_TIMEOUT_MS + 1500);
  });

  it('circuit breaker: after one timeout the next request does not wait, then Redis is retried', async () => {
    const user = await createActor(app);
    await auth.revokeAllSessionsForUser(user.id, 'suspended');
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const hang = vi.spyOn(redis, 'get').mockReturnValue(new Promise(() => undefined) as never);

    const t1 = Date.now();
    await me(user).expect(200);
    expect(Date.now() - t1).toBeGreaterThanOrEqual(REVOCATION_REDIS_TIMEOUT_MS - 20);

    const t2 = Date.now();
    await me(user).expect(200);
    expect(Date.now() - t2).toBeLessThan(REVOCATION_REDIS_TIMEOUT_MS - 100);
    expect(hang).toHaveBeenCalledTimes(1);

    // Past the breaker window, with Redis healthy again, the check resumes and the mark bites.
    hang.mockRestore();
    const real = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(real + REVOCATION_BREAKER_MS + 1000);
    await me(user).expect(403);
    expect(warn.mock.calls.filter(([m]) => String(m).includes('revocation check unavailable'))).toHaveLength(1);
    expect(log.mock.calls.some(([m]) => String(m).includes('revocation check recovered'))).toBe(true);
  });

  it('a failed mark write is logged, not thrown, and the revocation in the DB stands', async () => {
    const user = await createActor(app);
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(redis, 'eval').mockRejectedValue(new Error('ECONNREFUSED'));
    const outcome = await auth.revokeAllSessionsForUser(user.id, 'suspended');
    expect(outcome.revokedSessions).toBeGreaterThanOrEqual(1);
    expect(outcome.markPublished).toBe(false);
    expect(error.mock.calls.some(([msg]) => String(msg).includes('revocation mark not written'))).toBe(true);
    expect(JSON.stringify(error.mock.calls)).not.toContain(user.id);
    const { rows } = await pool.query(`SELECT 1 FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`, [user.id]);
    expect(rows).toHaveLength(0);
  });

  it('a tampered or missing token is still 401 INVALID_TOKEN before any Redis read', async () => {
    const get = vi.spyOn(redis, 'get');
    const res = await request(app.getHttpServer()).get(ME).set('authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
    expect(get).not.toHaveBeenCalled();
  });
});
