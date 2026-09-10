/**
 * Opaque keyset cursors.
 *
 * Offset pagination drifts on a feed that grows while the reader scrolls: rows
 * shift down by one for every insert and the reader sees the same item twice.
 * A keyset cursor carries the sort key of the last row instead, so the next
 * page continues from a fixed point regardless of what was inserted meanwhile.
 *
 * The encoding is base64url over JSON. It is opaque by contract, not by
 * secrecy — a client that decodes one gains nothing it could not read from the
 * rows it already holds.
 */
export function encodeCursor(key: Record<string, string | number | boolean>): string {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

/**
 * Decodes a cursor, returning null for anything malformed.
 *
 * A bad cursor yields the first page rather than a 400: cursors outlive
 * deploys in bookmarks and pasted links, and an error page is the wrong answer
 * to a stale one.
 */
export function decodeCursor<T extends Record<string, unknown>>(
  cursor: string | undefined,
): T | null {
  if (!cursor) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/**
 * Splits an over-fetched result into a page and its next cursor.
 *
 * Repositories select `limit + 1` rows: the extra row answers "is there more"
 * without a second COUNT query, and is dropped before the page is returned.
 */
export function toPage<TRow, TItem>(
  rows: readonly TRow[],
  limit: number,
  map: (row: TRow) => TItem,
  cursorOf: (row: TRow) => string,
): { items: TItem[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : [...rows];
  const last = page.at(-1);
  return {
    items: page.map(map),
    nextCursor: hasMore && last ? cursorOf(last) : null,
  };
}
