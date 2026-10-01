import { describe, expect, it } from 'vitest';
import { EMAIL_MASK_PATTERN, maskEmail, maskPhone } from '../../../src/modules/admin/admin-mask.js';

describe('admin mask', () => {
  it('masks an email to first char, three stars and the domain', () => {
    expect(maskEmail('anna.m@gmail.com')).toBe('a***@gmail.com');
    expect(EMAIL_MASK_PATTERN.test(maskEmail('anna.m@gmail.com') ?? '')).toBe(true);
  });

  it('returns null for a missing or malformed email', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('no-at-sign')).toBeNull();
  });

  it('masks a phone down to the last three digits', () => {
    expect(maskPhone('+84901234678')).toBe('*** *** 678');
    expect(maskPhone(null)).toBeNull();
  });
});
