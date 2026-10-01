import { randomBytes } from 'node:crypto';
import { connect, createServer, type Server } from 'node:net';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  loadRateLimitConfig,
  type RateLimitConfig,
} from '../../../src/common/rate-limit/rate-limit.config.js';
import {
  RateLimitService,
  type RateLimitRule,
} from '../../../src/common/rate-limit/rate-limit.service.js';
import { RateLimitedException } from '../../../src/common/rate-limit/rate-limited.exception.js';

const REDIS_URL = process.env['REDIS_CACHE_URL'] ?? 'redis://localhost:6381';
const KEY_SHAPE = /^rl:[a-z]+:[a-z]+(:[a-z]+)?:[0-9a-f]{32}$/;

/** A letters-only action name no other spec shares, so cleanup never touches their keys. */
const ACTION = Array.from(randomBytes(8), (byte) => String.fromCharCode(97 + (byte % 26))).join('');

const config: RateLimitConfig = loadRateLimitConfig({
  RATE_LIMIT_HMAC_SECRET: 'rate-limit-service-spec-secret-0123456789',
});

function captureLogs(): { lines: { level: string; text: string }[] } {
  const lines: { level: string; text: string }[] = [];
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
  return { lines };
}

async function deleteOwnKeys(redis: Redis): Promise<void> {
  const keys = await redis.keys(`rl:${ACTION}:*`);
  if (keys.length > 0) await redis.del(...keys);
}

describe('RateLimitService', () => {
  let redis: Redis;
  let service: RateLimitService;

  const rule = (subject: string, max: number, windowSeconds = 60, bucket = 'ip'): RateLimitRule => ({
    key: service.keyFor(ACTION, bucket === 'ip' ? 'ip' : 'id', subject),
    max,
    windowSeconds,
    bucket,
    action: ACTION,
  });

  beforeAll(() => {
    redis = new Redis(REDIS_URL, { lazyConnect: true });
    service = new RateLimitService(redis, config);
  });

  beforeEach(async () => {
    Logger.overrideLogger(true);
    await deleteOwnKeys(redis);
  });

  afterEach(() => {
    Logger.overrideLogger(true);
  });

  afterAll(async () => {
    await deleteOwnKeys(redis);
    redis.disconnect();
  });

  it('lets requests through up to the maximum and blocks the next with a retry delay', async () => {
    const r = rule('a', 3, 60);
    for (let i = 0; i < 3; i += 1) {
      const decision = await service.reserve([r]);
      expect(decision.blocked).toBe(false);
    }
    const blocked = await service.reserve([r]);
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('admits exactly the maximum out of 20 parallel reservations', async () => {
    const r = rule('parallel', 5);
    const decisions = await Promise.all(Array.from({ length: 20 }, () => service.reserve([r])));
    expect(decisions.filter((decision) => !decision.blocked)).toHaveLength(5);
    expect(decisions.filter((decision) => decision.blocked)).toHaveLength(15);
  });

  it('hands a slot back on release', async () => {
    const r = rule('release', 1);
    const first = await service.reserve([r]);
    await service.release(first.reservations);
    expect((await service.reserve([r])).blocked).toBe(false);
    expect((await service.reserve([r])).blocked).toBe(true);
  });

  it('never creates a key without a TTL when releasing', async () => {
    const r = rule('ghost', 2);
    const first = await service.reserve([r]);
    await service.clear(first.reservations[0]!);
    await service.release(first.reservations);
    expect(await redis.exists(r.key)).toBe(0);

    const second = await service.reserve([r]);
    await service.release(second.reservations);
    // Counter returned to zero: the key is dropped, not left behind persistent.
    expect(await redis.exists(r.key)).toBe(0);
  });

  it('clear drops the counter', async () => {
    const r = rule('clear', 1);
    const first = await service.reserve([r]);
    await service.clear(first.reservations[0]!);
    expect((await service.reserve([r])).blocked).toBe(false);
  });

  it('keeps every key within its window and in the documented shape', async () => {
    const rules = [rule('ttl-ip', 5, 30, 'ip'), rule('ttl-id', 5, 20, 'identifier')];
    await service.reserve(rules);
    for (const r of rules) {
      expect(r.key).toMatch(KEY_SHAPE);
      const ttl = await redis.ttl(r.key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(r.windowSeconds);
    }
    const hourly = service.keyFor('register', 'ip', 'x', 'hour');
    expect(hourly).toMatch(KEY_SHAPE);
    expect(hourly).toMatch(/^rl:register:ip:hour:/);
  });

  it('never puts the raw subject in a key', () => {
    const key = service.keyFor('login', 'id', 'someone@example.test');
    expect(key).not.toContain('someone');
    expect(service.keyFor('login', 'id', 'a')).not.toBe(service.keyFor('login', 'ip', 'a'));
  });

  it('starts counting again once the window has passed', async () => {
    const r = rule('expiry', 1, 1);
    await service.reserve([r]);
    expect((await service.reserve([r])).blocked).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect((await service.reserve([r])).blocked).toBe(false);
  });

  it('hands back the slot on a counter that was still under when another blocks', async () => {
    const tight = rule('tight', 1, 60, 'identifier');
    const roomy = rule('roomy', 10, 60, 'ip');
    await service.reserve([tight, roomy]);
    const blocked = await service.reserve([tight, roomy]);
    expect(blocked.blocked).toBe(true);
    // Only the first, admitted request is counted against the roomy bucket.
    expect(await redis.get(roomy.key)).toBe('1');
  });

  it('logs one structured line per block without any subject', async () => {
    const { lines } = captureLogs();
    const r = rule('secret-subject-value', 1, 60, 'identifier');
    await service.reserve([r]);
    await service.reserve([r]);
    const warnings = lines.filter((line) => line.level === 'warn');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.text).toBe(`rate_limited action=${ACTION} bucket=identifier count=2`);
    for (const line of lines) {
      expect(line.text).not.toContain('secret-subject-value');
      expect(line.text).not.toContain('rl:');
    }
  });

  it('builds a 429 exception with a flat body', () => {
    const exception = new RateLimitedException(42);
    expect(exception.getStatus()).toBe(429);
    expect(exception.getResponse()).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      messageKey: 'errors.auth.rateLimited',
      details: { retryAfterSeconds: 42 },
    });
  });

  describe('when Redis is unreachable', () => {
    let proxy: Server | undefined;
    let port: number;
    let dead: Redis;
    let degradedService: RateLimitService;

    beforeAll(async () => {
      port = await freePort();
      dead = new Redis({ host: '127.0.0.1', port, lazyConnect: true, maxRetriesPerRequest: 2 });
      dead.on('error', () => undefined);
      degradedService = new RateLimitService(dead, config);
    });

    afterAll(async () => {
      dead.disconnect();
      await new Promise<void>((resolve) => (proxy ? proxy.close(() => resolve()) : resolve()));
    });

    it('fails open within about a second, warns once, and recovers by itself', async () => {
      const { lines } = captureLogs();
      const r: RateLimitRule = {
        key: degradedService.keyFor(ACTION, 'ip', 'down'),
        max: 1,
        windowSeconds: 60,
        bucket: 'ip',
        action: ACTION,
      };

      const startedAt = Date.now();
      const first = await degradedService.reserve([r]);
      expect(Date.now() - startedAt).toBeLessThan(1000);
      expect(first.blocked).toBe(false);
      expect(first.reservations[0]?.tracked).toBe(false);

      // Releasing or clearing an untracked reservation must be a no-op.
      await degradedService.release(first.reservations);
      await degradedService.clear(first.reservations[0]!);
      await degradedService.reserve([r]);

      const unavailable = lines.filter((line) => line.text.includes('unavailable'));
      expect(unavailable).toHaveLength(1);
      expect(unavailable[0]?.level).toBe('warn');

      // Bring Redis back on the same port through a pass-through proxy.
      proxy = createServer((socket) => {
        const upstream = connect(6381, '127.0.0.1');
        socket.on('error', () => upstream.destroy());
        upstream.on('error', () => socket.destroy());
        socket.pipe(upstream);
        upstream.pipe(socket);
      });
      await new Promise<void>((resolve) => proxy?.listen(port, '127.0.0.1', resolve));

      const deadline = Date.now() + 10_000;
      let recovered = false;
      while (Date.now() < deadline && !recovered) {
        const decision = await degradedService.reserve([r]);
        recovered = decision.reservations[0]?.tracked === true;
        if (!recovered) await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(recovered).toBe(true);
      expect(lines.filter((line) => line.text.includes('recovered'))).toHaveLength(1);
      await redis.del(r.key);
    }, 20_000);
  });
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
