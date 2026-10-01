import { describe, expect, it } from 'vitest';
import { cursorValue } from '../../../src/modules/admin/admin-cursor.js';
import {
  decodeAdminCursor,
  encodeAdminCursor,
} from '../../../src/modules/admin/admin-cursor.js';

const id = '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f';
const any = () => true;

describe('admin cursor', () => {
  it('round-trips, including a NULL value', () => {
    for (const v of ['x', null]) {
      const raw = encodeAdminCursor({ s: 'handle', d: 'asc', v, id });
      expect(decodeAdminCursor(raw, { sort: 'handle', dir: 'asc' }, any)).toEqual({
        s: 'handle',
        d: 'asc',
        v,
        id,
      });
    }
  });

  it('rejects a cursor made under another sort or direction', () => {
    const raw = encodeAdminCursor({ s: 'handle', d: 'asc', v: 'x', id });
    expect(() => decodeAdminCursor(raw, { sort: 'createdAt', dir: 'asc' }, any)).toThrow();
    expect(() => decodeAdminCursor(raw, { sort: 'handle', dir: 'desc' }, any)).toThrow();
  });

  it('rejects garbage, a bad id and a value the sort refuses', () => {
    expect(() => decodeAdminCursor('%%%', { sort: 'handle', dir: 'asc' }, any)).toThrow();
    const bad = encodeAdminCursor({ s: 'handle', d: 'asc', v: 'x', id: 'nope' });
    expect(() => decodeAdminCursor(bad, { sort: 'handle', dir: 'asc' }, any)).toThrow();
    const raw = encodeAdminCursor({ s: 'handle', d: 'asc', v: 'x', id });
    expect(() => decodeAdminCursor(raw, { sort: 'handle', dir: 'asc' }, () => false)).toThrow();
  });

  it('accepts stored text with tab, newline or C1 characters and refuses only NUL', () => {
    for (const v of ['a\tb', 'a\nb', 'a\u0085b', 'x'.repeat(300)]) expect(cursorValue.text(v, 300)).toBe(true);
    for (const v of ['a\u0000b', '', null, 'x'.repeat(301)]) expect(cursorValue.text(v, 300)).toBe(false);
  });
});
