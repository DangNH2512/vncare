import { isIP } from 'node:net';
import type { INestApplication } from '@nestjs/common';

type Env = Readonly<Record<string, string | undefined>>;

/** Value accepted by Express `trust proxy`: a hop count or a list of trusted addresses. */
export type TrustProxySetting = number | string[];

const KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal']);
const MAX_HOPS = 64;

/**
 * Resolves `TRUST_PROXY` into an Express setting.
 *
 * Decides whose `X-Forwarded-For` the app believes, and therefore what
 * `request.ip` and every per-IP limit mean. Unset means `loopback` in
 * development and is an error in production. `true` is rejected: it trusts
 * every hop, which lets any client pick its own IP.
 */
export function resolveTrustProxy(env: Env): TrustProxySetting {
  const raw = env['TRUST_PROXY']?.trim();
  if (!raw) {
    if (env['NODE_ENV'] === 'production') {
      throw new Error('TRUST_PROXY must be set in production');
    }
    return ['loopback'];
  }

  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);
    if (hops > MAX_HOPS) throw invalid();
    return hops;
  }

  const entries = raw.split(',').map((entry) => entry.trim());
  if (!entries.every(isTrustedEntry)) throw invalid();
  return entries;
}

/** Applies the resolved setting to the Express instance behind the Nest app. */
export function applyTrustProxy(app: INestApplication, env: Env): void {
  const instance = app.getHttpAdapter().getInstance() as {
    set: (name: string, value: TrustProxySetting) => void;
  };
  instance.set('trust proxy', resolveTrustProxy(env));
}

function isTrustedEntry(entry: string): boolean {
  if (KEYWORDS.has(entry)) return true;
  const [address, prefix, ...extra] = entry.split('/');
  if (extra.length > 0 || !address) return false;
  const family = isIP(address);
  if (family === 0) return false;
  if (prefix === undefined) return true;
  const bits = /^\d+$/.test(prefix) ? Number(prefix) : Number.NaN;
  return bits >= 0 && bits <= (family === 4 ? 32 : 128);
}

function invalid(): Error {
  return new Error(
    'TRUST_PROXY must be a hop count or a comma-separated list of loopback, linklocal, uniquelocal, IPs or CIDRs',
  );
}
