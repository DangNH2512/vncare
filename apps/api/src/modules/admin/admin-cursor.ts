import { BadRequestException } from '@nestjs/common';
import { ADMIN_MAX_YEAR, ADMIN_MIN_YEAR, type AdminSortDirectionT } from '@dnc/contracts';

/** Keyset position of the last row of a page. `v` is null only for a NULL sort value. */
export interface AdminCursor {
  s: string;
  d: AdminSortDirectionT;
  v: string | null;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function invalidCursor(): BadRequestException {
  return new BadRequestException({
    code: 'ADMIN_CURSOR_INVALID',
    messageKey: 'errors.admin.cursorInvalid',
  });
}

export function encodeAdminCursor(cursor: AdminCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/**
 * Decodes a cursor and checks it belongs to this query: a cursor made under
 * another sort or direction is rejected, never reinterpreted. `valueOk`
 * validates `v` for the sort column in use.
 */
export function decodeAdminCursor(
  raw: string,
  expected: { sort: string; dir: AdminSortDirectionT },
  valueOk: (value: string | null) => boolean,
): AdminCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  if (typeof parsed !== 'object' || parsed === null) throw invalidCursor();
  const c = parsed as Record<string, unknown>;
  const value = c['v'];
  if (
    c['s'] !== expected.sort ||
    c['d'] !== expected.dir ||
    typeof c['id'] !== 'string' ||
    !UUID.test(c['id']) ||
    !(value === null || typeof value === 'string') ||
    !valueOk(value)
  ) {
    throw invalidCursor();
  }
  return { s: expected.sort, d: expected.dir, v: value, id: c['id'] };
}

const TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;
const HANDLE = /^[a-z0-9_]{3,24}$/;
const MIN_YEAR = ADMIN_MIN_YEAR;
const MAX_YEAR = ADMIN_MAX_YEAR;

/**
 * Value checks per kind of sort column. Each one answers "could the database
 * have produced this value?", so a forged `v` is refused here instead of
 * reaching a cast that fails with a 500.
 */
export const cursorValue = {
  /** `YYYY-MM-DDTHH:MM:SS.ffffffZ`, a real calendar instant inside a sane range. */
  timestamp: (v: string | null): boolean => {
    if (v === null || !TIMESTAMP.test(v)) return false;
    const ms = Date.parse(v.slice(0, 23) + 'Z');
    if (!Number.isFinite(ms)) return false;
    const year = new Date(ms).getUTCFullYear();
    if (year < MIN_YEAR || year > MAX_YEAR) return false;
    // Rejects overflowing dates such as 02-30 that Date would silently roll over.
    return new Date(ms).toISOString().slice(0, 19) === v.slice(0, 19);
  },
  /**
   * Free text as stored: only NUL is refused (Postgres cannot hold it). Tabs,
   * newlines and other control characters are legal in titles, and a cursor the
   * server itself issued for such a row must come back accepted.
   */
  text: (v: string | null, max: number): boolean =>
    v !== null && v.length > 0 && v.length <= max && !v.includes('\u0000'),
  /** Same charset as `profiles.handle`. */
  handle: (v: string | null): boolean => v !== null && HANDLE.test(v),
  trustLevel: (v: string | null): boolean => v !== null && /^[0-5]$/.test(v),
};

/** pg errors a malformed cursor parameter can raise: datetime field overflow, bad text, bad input. */
const CURSOR_PG_CODES = new Set(['22007', '22008', '22021', '22P02']);

/**
 * Safety net around the query that consumes a cursor: a data-exception class
 * error from the cursor parameter becomes 400, anything else propagates.
 */
export async function guardCursorQuery<T>(hasCursor: boolean, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (hasCursor && typeof code === 'string' && CURSOR_PG_CODES.has(code)) throw invalidCursor();
    throw err;
  }
}
