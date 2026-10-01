import { randomBytes } from 'node:crypto';

/** Injection token for the validated rate-limit configuration. */
export const RATE_LIMIT_CONFIG = Symbol('RATE_LIMIT_CONFIG');

/** Thresholds and key material for the auth rate limiter. */
export interface RateLimitConfig {
  /** Failed logins tolerated per client IP inside one login window. */
  loginIpMax: number;
  /** Failed logins tolerated per normalised identifier inside one login window. */
  loginIdentifierMax: number;
  /** Length of the login window in seconds. */
  loginWindowSeconds: number;
  /** Registrations tolerated per client IP per hour. */
  registerHourlyMax: number;
  /** Registrations tolerated per client IP per 24 hours. */
  registerDailyMax: number;
  /** Secret keying the HMAC that hides IPs and identifiers inside Redis keys. */
  hmacSecret: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const MAX_COUNT = 1_000_000;
const MAX_WINDOW_SECONDS = 86_400;
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Reads and validates the rate-limit environment.
 *
 * Throws on the first invalid value so the process refuses to boot with a
 * limiter that silently does nothing. Messages name the variable and never
 * echo its value, which for the HMAC secret would leak it into logs.
 */
export function loadRateLimitConfig(env: Env): RateLimitConfig {
  return {
    loginIpMax: readInt(env, 'RATE_LIMIT_LOGIN_IP_MAX', 10, MAX_COUNT),
    loginIdentifierMax: readInt(env, 'RATE_LIMIT_LOGIN_IDENTIFIER_MAX', 5, MAX_COUNT),
    loginWindowSeconds: readInt(env, 'RATE_LIMIT_LOGIN_WINDOW_SECONDS', 900, MAX_WINDOW_SECONDS),
    registerHourlyMax: readInt(env, 'RATE_LIMIT_REGISTER_HOURLY_MAX', 5, MAX_COUNT),
    registerDailyMax: readInt(env, 'RATE_LIMIT_REGISTER_DAILY_MAX', 15, MAX_COUNT),
    hmacSecret: readSecret(env),
  };
}

function readInt(env: Env, name: string, fallback: number, ceiling: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(value) || value < 1 || value > ceiling) {
    throw new Error(`${name} must be an integer between 1 and ${ceiling}`);
  }
  return value;
}

function readSecret(env: Env): string {
  const raw = env['RATE_LIMIT_HMAC_SECRET'];
  const production = env['NODE_ENV'] === 'production';
  if (raw === undefined || raw === '') {
    if (production) {
      throw new Error('RATE_LIMIT_HMAC_SECRET must be set in production');
    }
    // Per-boot random: counters orphaned by a restart simply expire. Every
    // instance behind a balancer needs a shared value, hence mandatory above.
    return randomBytes(32).toString('hex');
  }
  if (production && raw.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `RATE_LIMIT_HMAC_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
  return raw;
}
