import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CACHE } from '../../redis/redis.module.js';
import { RATE_LIMIT_CONFIG, type RateLimitConfig } from './rate-limit.config.js';

/** Hard ceiling on any single Redis round trip; beyond it the limiter fails open. */
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 750;

/** One counter a request must fit under. */
export interface RateLimitRule {
  /** Hashed Redis key from {@link RateLimitService.keyFor}. */
  key: string;
  max: number;
  windowSeconds: number;
  /** Counter kind for logs, such as `ip` or `identifier`. Never a subject. */
  bucket: string;
  /** Endpoint action for logs, such as `login`. */
  action: string;
}

/** The outcome of reserving one slot on one counter. */
export interface Reservation {
  key: string;
  bucket: string;
  action: string;
  /** Counter value after this reservation. */
  count: number;
  ttlSeconds: number;
  exceeded: boolean;
  /** False when Redis was unreachable and nothing was counted. */
  tracked: boolean;
  windowSeconds: number;
}

export interface RateLimitDecision {
  blocked: boolean;
  retryAfterSeconds: number;
  reservations: Reservation[];
}

/**
 * INCR every key, arming the TTL on first use or when a key somehow has none.
 * Returns count and remaining milliseconds per key, flattened.
 */
const RESERVE_SCRIPT = `
local out = {}
for i = 1, #KEYS do
  local count = redis.call('INCR', KEYS[i])
  local ttl = redis.call('PTTL', KEYS[i])
  if count == 1 or ttl < 0 then
    redis.call('PEXPIRE', KEYS[i], ARGV[i])
    ttl = tonumber(ARGV[i])
  end
  out[#out + 1] = count
  out[#out + 1] = ttl
end
return out
`;

/**
 * DECR keys that still exist and drop them at zero. A missing key is left
 * missing, so a release can never create a counter without a TTL.
 */
const RELEASE_SCRIPT = `
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then
    if redis.call('DECR', KEYS[i]) <= 0 then
      redis.call('DEL', KEYS[i])
    end
  end
end
return 1
`;

/**
 * Fixed-window counters on the cache Redis, reserve-first.
 *
 * A slot is taken before the guarded work runs and handed back if the outcome
 * should not count. That ordering, rather than check-then-count, is what keeps N
 * parallel requests from all slipping under a threshold while the first one is
 * still busy verifying a password.
 *
 * Fails open: if Redis errors or takes longer than 750ms the request is let
 * through and nothing is counted. An unavailable cache must not lock everyone
 * out of signing in.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private degraded = false;

  constructor(
    @Inject(REDIS_CACHE) private readonly redis: Redis,
    @Inject(RATE_LIMIT_CONFIG) private readonly config: RateLimitConfig,
  ) {}

  /**
   * Builds a Redis key that carries no raw subject.
   *
   * The subject is keyed-hashed, so a Redis dump yields neither addresses nor
   * identifiers. The digest is cut to 128 bits, ample for a counter key.
   */
  keyFor(
    action: string,
    scope: string,
    subject: string,
    window?: 'hour' | 'day',
  ): string {
    const digest = createHmac('sha256', this.config.hmacSecret)
      .update(`${action}:${scope}:${window ?? ''}:${subject}`)
      .digest('hex')
      .slice(0, 32);
    return ['rl', action, scope, window, digest].filter(Boolean).join(':');
  }

  /**
   * Takes one slot on every rule.
   *
   * When any counter is over its maximum the request is blocked and the slots
   * taken on the counters that were still under are handed back, so a blocked
   * request does not eat quota on the other counter. The over-limit counters
   * keep the slot: their window is what they are measuring.
   */
  async reserve(rules: RateLimitRule[]): Promise<RateLimitDecision> {
    const raw = await this.run<number[]>(
      RESERVE_SCRIPT,
      rules.map((rule) => rule.key),
      rules.map((rule) => String(rule.windowSeconds * 1000)),
    );

    if (raw === null) {
      return {
        blocked: false,
        retryAfterSeconds: 0,
        reservations: rules.map((rule) => ({
          key: rule.key,
          bucket: rule.bucket,
          action: rule.action,
          count: 0,
          ttlSeconds: 0,
          exceeded: false,
          tracked: false,
          windowSeconds: rule.windowSeconds,
        })),
      };
    }

    const reservations = rules.map((rule, index): Reservation => {
      const count = Number(raw[index * 2]);
      const ttlMs = Number(raw[index * 2 + 1]);
      return {
        key: rule.key,
        bucket: rule.bucket,
        action: rule.action,
        count,
        ttlSeconds: Math.ceil(ttlMs / 1000),
        exceeded: count > rule.max,
        tracked: true,
        windowSeconds: rule.windowSeconds,
      };
    });

    const over = reservations.filter((reservation) => reservation.exceeded);
    if (over.length === 0) {
      return { blocked: false, retryAfterSeconds: 0, reservations };
    }

    await this.release(reservations.filter((reservation) => !reservation.exceeded));

    const retryAfterSeconds = Math.max(
      ...over.map((reservation) =>
        Math.min(Math.max(reservation.ttlSeconds, 1), reservation.windowSeconds),
      ),
    );
    const first = over[0] as Reservation;
    // Counter kind and count only: no address, identifier or key.
    this.logger.warn(
      `auth.rate_limited action=${first.action} bucket=${first.bucket} count=${first.count}`,
    );
    return { blocked: true, retryAfterSeconds, reservations };
  }

  /** Hands slots back, as when a login turned out to be correct. */
  async release(reservations: Reservation[]): Promise<void> {
    const tracked = reservations.filter((reservation) => reservation.tracked);
    if (tracked.length === 0) return;
    await this.run(RELEASE_SCRIPT, tracked.map((reservation) => reservation.key), []);
  }

  /** Drops a counter outright, as when a correct password resets its identifier. */
  async clear(reservation: Reservation): Promise<void> {
    if (!reservation.tracked) return;
    await this.guard(this.redis.del(reservation.key));
  }

  private run<T>(script: string, keys: string[], args: string[]): Promise<T | null> {
    return this.guard(this.redis.eval(script, keys.length, ...keys, ...args) as Promise<T>);
  }

  /**
   * Bounds a Redis call and converts failure into `null`.
   *
   * Logs once on each transition between healthy and degraded, not per request,
   * so an outage does not flood the log. The late result of a timed-out command
   * is swallowed rather than awaited.
   */
  private async guard<T>(command: Promise<T>): Promise<T | null> {
    command.catch(() => undefined);
    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        command,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), RATE_LIMIT_REDIS_TIMEOUT_MS);
        }),
      ]);
      if (this.degraded) {
        this.degraded = false;
        this.logger.log('rate limiter recovered');
      }
      return result;
    } catch {
      if (!this.degraded) {
        this.degraded = true;
        this.logger.warn('rate limiter unavailable, failing open');
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
