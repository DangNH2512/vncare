import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { Logger, type INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  DATABASE_URL,
  seedArea,
  trackActor,
} from '../../support/harness.js';

const PASSWORD = 'a-sufficiently-long-passphrase';
const WRONG = 'definitely-the-wrong-passphrase';
const REDIS_URL = process.env['REDIS_CACHE_URL'] ?? 'redis://localhost:6381';
const KEY_SHAPE = /^rl:[a-z]+:[a-z]+(:[a-z]+)?:[0-9a-f]{32}$/;

const DEFAULTS: Record<string, string> = {
  RATE_LIMIT_LOGIN_IP_MAX: '10',
  RATE_LIMIT_LOGIN_IDENTIFIER_MAX: '5',
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: '900',
  RATE_LIMIT_REGISTER_HOURLY_MAX: '5',
  RATE_LIMIT_REGISTER_DAILY_MAX: '15',
  RATE_LIMIT_HMAC_SECRET: 'auth-rate-limit-spec-secret-0123456789abcdef',
};

/** Builds an app under the given env, then restores it: config is read at construction. */
async function buildApp(overrides: Record<string, string> = {}): Promise<INestApplication> {
  const names = new Set([...Object.keys(DEFAULTS), ...Object.keys(overrides)]);
  const saved = new Map([...names].map((name) => [name, process.env[name]]));
  Object.assign(process.env, DEFAULTS, overrides);
  try {
    return await createTestApp();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

/** A client address nobody else uses: its own /64, so every case has a private counter. */
function freshIp(): string {
  const hex = () => randomBytes(2).toString('hex');
  return `2001:db8:${hex()}:${hex()}::1`;
}

function uniqueEmail(): string {
  return `e2e_${randomUUID().replaceAll('-', '').slice(0, 12)}@example.test`;
}

function registration() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  return {
    email: `e2e_${suffix}@example.test`,
    password: PASSWORD,
    displayName: 'Rate Limit',
    handle: `rl_${suffix}`,
  };
}

function captureLogs(): { lines: { level: string; text: string }[]; stop: () => void } {
  const lines: { level: string; text: string }[] = [];
  // Only the message: Nest passes the logger context as a trailing argument.
  const push = (level: string) => (message: unknown) => {
    lines.push({ level, text: String(message) });
  };
  Logger.overrideLogger({
    log: push('log'),
    error: push('error'),
    warn: push('warn'),
    debug: push('debug'),
    verbose: push('verbose'),
    fatal: push('fatal'),
  });
  return { lines, stop: () => Logger.overrideLogger(true) };
}

// Each case runs several Argon2 verifications; under a parallel suite the
// default 5s is not enough.
describe('auth rate limiting', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let cleanup: () => Promise<void>;
  let redis: Redis;
  let pool: Pool;
  const extraApps: INestApplication[] = [];

  const login = (target: INestApplication, ip: string, identifier: string, password = WRONG) =>
    request(target.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ identifier, password });

  const register = (target: INestApplication, ip: string, body = registration()) =>
    request(target.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send(body);

  /** A real account to log in as, registered from a throwaway address. */
  const makeUser = async (target: INestApplication = app) => {
    const body = registration();
    const res = await register(target, freshIp(), body).expect(201);
    trackActor(res.body.data.user.id as string);
    return { email: body.email, id: res.body.data.user.id as string };
  };

  // Clears this spec's counters on the shared cache Redis. Assumes no other
  // writer uses `rl:login:*` or `rl:register:*` with this spec's HMAC secret:
  // the service spec uses random action names, and the dev API hashes with its
  // own per-boot secret, so its keys never collide with these.
  const wipeCounters = async () => {
    for (const pattern of ['rl:login:*', 'rl:register:*']) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    }
  };

  /** Fails `count` times with distinct, nonexistent identifiers so only the IP counter moves. */
  const failFromIp = async (ip: string, count: number) => {
    for (let i = 0; i < count; i += 1) {
      await login(app, ip, `nobody_${randomUUID()}@example.test`).expect(401);
    }
  };

  const sessionCount = async (userId: string) =>
    Number(
      (await pool.query('SELECT count(*) FROM auth_sessions WHERE user_id = $1', [userId]))
        .rows[0].count,
    );

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    redis = new Redis(REDIS_URL);
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    app = await buildApp();
  });

  beforeEach(async () => {
    Logger.overrideLogger(true);
    await wipeCounters();
  });

  afterEach(() => {
    Logger.overrideLogger(true);
  });

  afterAll(async () => {
    await app.close();
    for (const extra of extraApps) await extra.close();
    await wipeCounters();
    redis.disconnect();
    await pool.end();
    await cleanup();
  });

  it('AC-15: blocks the 11th failure from one IP with 429, Retry-After and a flat body', async () => {
    const ip = freshIp();
    await failFromIp(ip, 10);

    const res = await login(app, ip, `nobody_${randomUUID()}@example.test`).expect(429);
    const retryAfter = Number(res.headers['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(900);
    expect(res.body).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      messageKey: 'errors.auth.rateLimited',
      details: { retryAfterSeconds: retryAfter },
    });
  });

  it('AC-16: a blocked caller with the right password still gets 429, no session, no cookie', async () => {
    const user = await makeUser();
    const before = await sessionCount(user.id);
    const ip = freshIp();
    await failFromIp(ip, 10);

    const res = await login(app, ip, user.email, PASSWORD).expect(429);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await sessionCount(user.id)).toBe(before);
  });

  it('AC-17: a correct login does not reset the IP counter', async () => {
    const user = await makeUser();
    const ip = freshIp();
    await failFromIp(ip, 9);
    await login(app, ip, user.email, PASSWORD).expect(200);
    await failFromIp(ip, 1);

    await login(app, ip, `nobody_${randomUUID()}@example.test`).expect(429);
  });

  it('AC-18: a real and a nonexistent identifier trip after the same number of failures, identically', async () => {
    const user = await makeUser();
    const ghost = uniqueEmail();

    const outcome = async (identifier: string) => {
      const ip = freshIp();
      for (let i = 0; i < 5; i += 1) {
        await login(app, ip, identifier).expect(401);
      }
      return login(app, ip, identifier).expect(429);
    };
    const real = await outcome(user.email);
    const missing = await outcome(ghost);
    expect(real.body).toEqual(missing.body);
    expect(real.status).toBe(missing.status);
  });

  it('AC-19: one blocked IP does not affect another', async () => {
    const user = await makeUser();
    const blocked = freshIp();
    await failFromIp(blocked, 10);
    await login(app, blocked, `nobody_${randomUUID()}@example.test`).expect(429);

    await login(app, freshIp(), `nobody_${randomUUID()}@example.test`).expect(401);
    await login(app, freshIp(), user.email, PASSWORD).expect(200);
  });

  it('AC-20: the identifier counter spans IPs and spellings, and a correct login resets it', async () => {
    const user = await makeUser();
    const spellings = [
      user.email,
      user.email.toUpperCase(),
      `  ${user.email}`,
      `${user.email}  `,
      ` ${user.email.toUpperCase()} `,
    ];
    for (const spelling of spellings) {
      await login(app, freshIp(), spelling).expect(401);
    }
    await login(app, freshIp(), user.email).expect(429);

    // Reset on success: four failures, then the right password, then a clean slate.
    const other = await makeUser();
    for (let i = 0; i < 4; i += 1) await login(app, freshIp(), other.email).expect(401);
    await login(app, freshIp(), other.email, PASSWORD).expect(200);
    for (let i = 0; i < 5; i += 1) await login(app, freshIp(), other.email).expect(401);
    await login(app, freshIp(), other.email).expect(429);
  });

  it('AC-21: processes requests normally again after the window passes', async () => {
    const short = await buildApp({
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: '4',
      RATE_LIMIT_LOGIN_IDENTIFIER_MAX: '2',
    });
    extraApps.push(short);
    const user = await makeUser();
    const ip = freshIp();

    await login(short, ip, user.email).expect(401);
    await login(short, ip, user.email).expect(401);
    const blocked = await login(short, ip, user.email, PASSWORD).expect(429);
    const wait = Number(blocked.headers['retry-after']);
    expect(wait).toBeGreaterThanOrEqual(1);
    expect(wait).toBeLessThanOrEqual(4);

    await new Promise((resolve) => setTimeout(resolve, wait * 1000 + 250));
    await login(short, ip, user.email, PASSWORD).expect(200);
    await login(short, freshIp(), user.email).expect(401);
  }, 30_000);

  it('AC-22: the sixth registration in an hour is throttled, counted even when it was a 409, and leaks nothing', async () => {
    const ip = freshIp();
    const taken = registration();
    for (let i = 0; i < 4; i += 1) {
      const res = await register(app, ip, i === 0 ? taken : registration()).expect(201);
      trackActor(res.body.data.user.id as string);
    }
    // The fifth call is a duplicate handle: a 409 that still uses a slot.
    const duplicate = await register(app, ip, { ...registration(), handle: taken.handle }).expect(409);
    expect(duplicate.body.code).toBe('HANDLE_TAKEN');

    const fresh = registration();
    const throttled = await register(app, ip, { ...fresh, handle: taken.handle }).expect(429);
    expect(throttled.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(JSON.stringify(throttled.body)).not.toMatch(/TAKEN/);
    expect(Number(throttled.headers['retry-after'])).toBeLessThanOrEqual(3600);

    const created = await pool.query('SELECT 1 FROM users WHERE email = $1', [fresh.email]);
    expect(created.rowCount).toBe(0);
  }, 30_000);

  it('AC-23: refresh, logout and readiness are not limited', async () => {
    const ip = freshIp();
    await failFromIp(ip, 10);
    await login(app, ip, `nobody_${randomUUID()}@example.test`).expect(429);

    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', ip);
    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('X-Forwarded-For', ip);
    const ready = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .set('X-Forwarded-For', ip);
    expect(refresh.status).toBe(204);
    expect(logout.status).toBe(204);
    expect(ready.status).not.toBe(429);
  });

  it('AC-24: fails open when the cache Redis is unreachable, with one limiter warning', async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        const free = typeof address === 'object' && address ? address.port : 0;
        probe.close(() => resolve(free));
      });
    });
    const user = await makeUser();
    const degraded = await buildApp({ REDIS_CACHE_URL: `redis://127.0.0.1:${port}` });
    extraApps.push(degraded);
    // After the app exists: creating it installs Nest's own logger.
    const { lines, stop } = captureLogs();

    try {
      for (const [password, status] of [
        [PASSWORD, 200],
        [WRONG, 401],
        [WRONG, 401],
      ] as const) {
        const startedAt = Date.now();
        const res = await login(degraded, freshIp(), user.email, password);
        expect(res.status).toBe(status);
        expect(Date.now() - startedAt).toBeLessThan(2000);
      }
      const ready = await request(degraded.getHttpServer()).get('/api/v1/health/ready');
      expect(JSON.stringify(ready.body)).toContain('"redisCache":"down"');
    } finally {
      stop();
    }
    const limiter = lines.filter((line) => line.text.includes('rate limiter unavailable'));
    expect(limiter).toHaveLength(1);
    expect(limiter[0]?.level).toBe('warn');
  }, 30_000);

  it('AC-25: honours a configured threshold and refuses to boot on a bad one', async () => {
    const strict = await buildApp({ RATE_LIMIT_LOGIN_IP_MAX: '3' });
    extraApps.push(strict);
    const ip = freshIp();
    for (let i = 0; i < 3; i += 1) {
      await login(strict, ip, `nobody_${randomUUID()}@example.test`).expect(401);
    }
    await login(strict, ip, `nobody_${randomUUID()}@example.test`).expect(429);

    const failure = await buildApp({ RATE_LIMIT_LOGIN_IP_MAX: 'abc' }).then(
      () => undefined,
      (error: unknown) => error as Error,
    );
    expect(failure?.message).toContain('RATE_LIMIT_LOGIN_IP_MAX');
    expect(failure?.message).not.toContain('abc');
  });

  it('AC-26: trusted-hop forwarded addresses get separate counters', async () => {
    const first = freshIp();
    const second = freshIp();
    await failFromIp(first, 10);
    await login(app, first, `nobody_${randomUUID()}@example.test`).expect(429);
    await login(app, second, `nobody_${randomUUID()}@example.test`).expect(401);
  });

  it('AC-26: a client outside the trusted hops cannot dodge the counter by forging X-Forwarded-For', async () => {
    const direct = await buildApp({ TRUST_PROXY: '10.255.255.1' });
    extraApps.push(direct);
    for (let i = 0; i < 10; i += 1) {
      await login(direct, freshIp(), `nobody_${randomUUID()}@example.test`).expect(401);
    }
    await login(direct, freshIp(), `nobody_${randomUUID()}@example.test`).expect(429);
  });

  it('AC-27 and AC-28: keys and logs hold no raw subject, and every 429 logs one structured line', async () => {
    const { lines, stop } = captureLogs();
    const ip = freshIp();
    const identifier = uniqueEmail();
    const registrant = registration();
    const registerIp = freshIp();

    for (let i = 0; i < 5; i += 1) await login(app, ip, identifier).expect(401);
    for (let i = 0; i < 3; i += 1) await login(app, ip, identifier).expect(429);
    for (let i = 0; i < 5; i += 1) {
      const res = await register(app, registerIp, i === 0 ? registrant : registration()).expect(201);
      trackActor(res.body.data.user.id as string);
    }
    for (let i = 0; i < 2; i += 1) await register(app, registerIp).expect(429);
    stop();

    const warnings = lines.filter((line) => line.text.includes('rate_limited'));
    expect(warnings.filter((line) => line.text.includes('action=login'))).toHaveLength(3);
    expect(warnings.filter((line) => line.text.includes('action=register'))).toHaveLength(2);
    for (const warning of warnings) {
      expect(warning.level).toBe('warn');
      expect(warning.text).toMatch(/^rate_limited action=(login|register) bucket=[a-z_]+ count=\d+$/);
    }

    const forbidden = [identifier, ip, registerIp, PASSWORD, WRONG, registrant.email, registrant.handle];
    for (const line of lines) {
      for (const secret of forbidden) expect(line.text).not.toContain(secret);
    }

    const keys = [...(await redis.keys('rl:login:*')), ...(await redis.keys('rl:register:*'))];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(KEY_SHAPE);
      for (const secret of [identifier, ip, registerIp, 'example.test']) {
        expect(key).not.toContain(secret);
      }
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(key.includes(':day:') ? 86_400 : key.includes(':hour:') ? 3600 : 900);
    }
  });
});
