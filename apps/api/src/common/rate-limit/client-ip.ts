import { isIPv4, isIPv6 } from 'node:net';

/** Shared bucket for requests whose address is unknown, so a missing IP is never a free pass. */
export const UNKNOWN_CLIENT_IP = 'unknown';

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Reduces a client address to the unit a rate limit should count.
 *
 * IPv4-mapped IPv6 collapses to plain IPv4. Any other IPv6 address collapses to
 * its /64, because a single subscriber is routinely handed a whole /64 and
 * rotating inside it would otherwise sidestep per-address counters.
 */
export function normalizeClientIp(ip: string | null | undefined): string {
  if (!ip) return UNKNOWN_CLIENT_IP;
  const bare = ip.split('%')[0] ?? '';

  const mapped = IPV4_MAPPED.exec(bare);
  if (mapped?.[1] && isIPv4(mapped[1])) return mapped[1];
  if (isIPv4(bare)) return bare;
  if (!isIPv6(bare)) return UNKNOWN_CLIENT_IP;

  const groups = expandIpv6(bare);
  // IPv4-mapped written in hex (::ffff:102:304) is the same host as 1.2.3.4.
  if (groups.slice(0, 5).every((group) => group === '0000') && groups[5] === 'ffff') {
    const high = parseInt(groups[6] as string, 16);
    const low = parseInt(groups[7] as string, 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/** Expands any valid IPv6 literal into eight zero-padded, lowercase hextets. */
function expandIpv6(address: string): string[] {
  let text = address.toLowerCase();

  const tail = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text)?.[1];
  if (tail) {
    const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
    const high = ((a << 8) | b).toString(16);
    const low = ((c << 8) | d).toString(16);
    text = `${text.slice(0, -tail.length)}${high}:${low}`;
  }

  const [head = '', rest] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = rest === undefined ? [] : rest ? rest.split(':') : [];
  const fill = rest === undefined ? 0 : 8 - left.length - right.length;
  return [...left, ...Array<string>(fill).fill('0'), ...right].map((group) =>
    group.padStart(4, '0'),
  );
}
