import { describe, expect, it } from 'vitest';
import { normalizeClientIp } from '../../../src/common/rate-limit/client-ip.js';

describe('normalizeClientIp', () => {
  it('returns IPv4 unchanged', () => {
    expect(normalizeClientIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('unwraps IPv4-mapped IPv6', () => {
    expect(normalizeClientIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(normalizeClientIp('::FFFF:203.0.113.7')).toBe('203.0.113.7');
  });

  it('unwraps IPv4-mapped IPv6 written in hex', () => {
    expect(normalizeClientIp('::ffff:102:304')).toBe('1.2.3.4');
    expect(normalizeClientIp('0:0:0:0:0:ffff:cb00:7107')).toBe('203.0.113.7');
    expect(normalizeClientIp('::ffff:0:0')).toBe('0.0.0.0');
  });

  it('groups IPv6 addresses of one /64 together', () => {
    const a = normalizeClientIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd');
    const b = normalizeClientIp('2001:DB8:1:2::1');
    expect(a).toBe(b);
    expect(a).toBe('2001:0db8:0001:0002::/64');
  });

  it('keeps different /64 prefixes apart', () => {
    expect(normalizeClientIp('2001:db8:1:2::1')).not.toBe(normalizeClientIp('2001:db8:1:3::1'));
  });

  it('expands compressed forms before cutting the prefix', () => {
    expect(normalizeClientIp('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(normalizeClientIp('::1')).toBe('0000:0000:0000:0000::/64');
  });

  it('drops a zone identifier', () => {
    expect(normalizeClientIp('fe80::1%eth0')).toBe(normalizeClientIp('fe80::1'));
  });

  it('maps a missing or malformed address to the shared unknown bucket', () => {
    expect(normalizeClientIp(undefined)).toBe('unknown');
    expect(normalizeClientIp(null)).toBe('unknown');
    expect(normalizeClientIp('')).toBe('unknown');
    expect(normalizeClientIp('not-an-ip')).toBe('unknown');
  });
});
