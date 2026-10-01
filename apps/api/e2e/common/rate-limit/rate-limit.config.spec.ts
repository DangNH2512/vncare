import { describe, expect, it } from 'vitest';
import { loadRateLimitConfig } from '../../../src/common/rate-limit/rate-limit.config.js';

const SECRET = 'a'.repeat(40);

describe('loadRateLimitConfig', () => {
  it('applies the documented defaults', () => {
    const config = loadRateLimitConfig({ RATE_LIMIT_HMAC_SECRET: SECRET });
    expect(config).toEqual({
      loginIpMax: 10,
      loginIdentifierMax: 5,
      loginWindowSeconds: 900,
      registerHourlyMax: 5,
      registerDailyMax: 15,
      hmacSecret: SECRET,
    });
  });

  it('reads overrides and treats an empty value as unset', () => {
    const config = loadRateLimitConfig({
      RATE_LIMIT_LOGIN_IP_MAX: '3',
      RATE_LIMIT_LOGIN_IDENTIFIER_MAX: '',
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: '2',
    });
    expect(config.loginIpMax).toBe(3);
    expect(config.loginIdentifierMax).toBe(5);
    expect(config.loginWindowSeconds).toBe(2);
  });

  const variables: [string, string][] = [
    ['RATE_LIMIT_LOGIN_IP_MAX', '1000001'],
    ['RATE_LIMIT_LOGIN_IDENTIFIER_MAX', '1000001'],
    ['RATE_LIMIT_LOGIN_WINDOW_SECONDS', '86401'],
    ['RATE_LIMIT_REGISTER_HOURLY_MAX', '1000001'],
    ['RATE_LIMIT_REGISTER_DAILY_MAX', '1000001'],
  ];
  const bad = ['0', '-1', 'abc', '1.5', '1e3', ' 5'];

  for (const [name, overCeiling] of variables) {
    for (const value of [...bad, overCeiling]) {
      it(`rejects ${name}=${JSON.stringify(value)} naming only the variable`, () => {
        let message = '';
        try {
          loadRateLimitConfig({ [name]: value });
        } catch (error) {
          message = (error as Error).message;
        }
        expect(message).toContain(name);
        expect(message).not.toContain(`"${value}"`);
        expect(message).toMatch(/must be an integer between 1 and \d+$/);
      });
    }
  }

  it('generates a different random secret per call outside production', () => {
    const first = loadRateLimitConfig({}).hmacSecret;
    const second = loadRateLimitConfig({}).hmacSecret;
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
  });

  it('requires a secret of at least 32 characters in production', () => {
    expect(() => loadRateLimitConfig({ NODE_ENV: 'production' })).toThrow(
      'RATE_LIMIT_HMAC_SECRET',
    );
    const short = 'short-secret-value';
    let message = '';
    try {
      loadRateLimitConfig({ NODE_ENV: 'production', RATE_LIMIT_HMAC_SECRET: short });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('RATE_LIMIT_HMAC_SECRET');
    expect(message).not.toContain(short);
    expect(
      loadRateLimitConfig({ NODE_ENV: 'production', RATE_LIMIT_HMAC_SECRET: SECRET }).hmacSecret,
    ).toBe(SECRET);
  });
});
