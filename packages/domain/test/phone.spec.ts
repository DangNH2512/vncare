import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../src/phone.js';

describe('normalizePhone', () => {
  /** The four ways the same Da Nang number gets typed. */
  it('collapses every Vietnamese format onto one E.164 value', () => {
    for (const input of [
      '0905123456',
      '+84905123456',
      '84905123456',
      '0084905123456',
      '0905 123 456',
      '(0905) 123-456',
      ' +84 905.123.456 ',
    ]) {
      expect(normalizePhone(input), input).toBe('+84905123456');
    }
  });

  it('keeps a foreign number on its own country code', () => {
    expect(normalizePhone('+447700900123')).toBe('+447700900123');
    expect(normalizePhone('+1 415 555 0132')).toBe('+14155550132');
  });

  /**
   * A null result is what tells the caller the input was a handle or an email,
   * so anything that is not a number must not be coerced into one.
   */
  it('returns null for things that are not phone numbers', () => {
    for (const input of ['', '   ', 'my_khe_2', 'anna@example.com', 'user001', 'abc']) {
      expect(normalizePhone(input), input).toBeNull();
    }
  });

  it('rejects lengths E.164 cannot hold', () => {
    expect(normalizePhone('+1234567')).toBeNull();
    expect(normalizePhone('+1234567890123456')).toBeNull();
  });

  /** A handle of digits only must stay a handle, not silently become a number. */
  it('does not treat a short digit string as a number', () => {
    expect(normalizePhone('12345')).toBeNull();
  });
});
