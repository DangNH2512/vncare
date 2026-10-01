import { describe, expect, it } from 'vitest';
import { resolveTrustProxy } from '../../../src/common/http/trust-proxy.js';

describe('resolveTrustProxy', () => {
  it('defaults to loopback outside production', () => {
    expect(resolveTrustProxy({})).toEqual(['loopback']);
    expect(resolveTrustProxy({ NODE_ENV: 'test', TRUST_PROXY: '  ' })).toEqual(['loopback']);
  });

  it('refuses to start in production without TRUST_PROXY', () => {
    expect(() => resolveTrustProxy({ NODE_ENV: 'production' })).toThrow('TRUST_PROXY');
  });

  it('rejects true because it trusts every hop', () => {
    expect(() => resolveTrustProxy({ TRUST_PROXY: 'true' })).toThrow('TRUST_PROXY');
  });

  it('accepts a keyword, a hop count and CIDR lists', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: 'loopback' })).toEqual(['loopback']);
    expect(resolveTrustProxy({ TRUST_PROXY: '2' })).toBe(2);
    expect(resolveTrustProxy({ TRUST_PROXY: '10.0.0.0/8' })).toEqual(['10.0.0.0/8']);
    expect(resolveTrustProxy({ TRUST_PROXY: 'loopback, 10.0.0.0/8,2001:db8::/32,192.0.2.1' })).toEqual([
      'loopback',
      '10.0.0.0/8',
      '2001:db8::/32',
      '192.0.2.1',
    ]);
  });

  it('rejects malformed entries', () => {
    for (const value of ['false', 'everyone', '10.0.0.0/33', '10.0.0.0/8/1', '1.2.3', '999', 'loopback,,']) {
      expect(() => resolveTrustProxy({ TRUST_PROXY: value }), value).toThrow('TRUST_PROXY');
    }
  });
});
