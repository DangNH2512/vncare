import type { MediaResponseT } from '@dnc/contracts';
import type { MediaRow } from './media.repository.js';

/**
 * Maps a media row plus its freshly signed URL onto the response.
 *
 * `duration_seconds` arrives as a string: the pg driver returns `numeric` that
 * way because not every value fits a JS number exactly. Parsing here keeps the
 * conversion in one place instead of at each call site.
 */
export function toMediaResponse(row: MediaRow, url: string): MediaResponseT {
  return {
    id: row.id,
    kind: row.kind,
    url,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
  };
}
