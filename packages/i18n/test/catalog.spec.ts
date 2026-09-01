import { describe, expect, it } from 'vitest';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { MESSAGE_KEYS } from '../src/message-keys.js';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? flatten(value as Record<string, unknown>, path)
      : [path];
  });

describe('message catalogs', () => {
  it('en and vi contain exactly the same keys', () => {
    expect(flatten(vi).toSorted()).toEqual(flatten(en).toSorted());
  });

  it('generated MessageKey union is in sync with en.json', () => {
    expect(MESSAGE_KEYS.toSorted()).toEqual(flatten(en).toSorted());
  });

  it('no message value is an empty string', () => {
    const check = (obj: Record<string, unknown>) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          check(value as Record<string, unknown>);
        } else {
          expect(String(value).trim().length).toBeGreaterThan(0);
        }
      }
    };
    check(en);
    check(vi);
  });
});
