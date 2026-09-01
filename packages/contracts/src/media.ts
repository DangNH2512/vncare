import { z } from 'zod';

export const MediaKind = z.enum(['image', 'video']);
export type MediaKindT = z.infer<typeof MediaKind>;

/**
 * Accepted upload types.
 *
 * An allow-list, not a block-list: anything not named here is refused, so a new
 * format is a deliberate decision rather than something that slips in. HEIC is
 * included because it is what an iPhone produces by default and rejecting it
 * would fail most first uploads from the target audience.
 */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
] as const;

export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

/** Per-file ceilings, enforced server-side before a presigned URL is issued. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * Items a feed card renders before collapsing the rest behind a "+N" control.
 *
 * This is a rendering budget, not a limit on the author: a gallery may hold any
 * number of items, and the reader scrolling a feed is simply not shown all of
 * them at once. Opening the post resolves the rest.
 */
export const MAX_GALLERY_PREVIEW = 5;

export const MediaUploadRequest = z.object({
  kind: MediaKind,
  mimeType: z.string().max(100),
  byteSize: z.number().int().positive().max(MAX_VIDEO_BYTES),
});
export type MediaUploadRequestT = z.infer<typeof MediaUploadRequest>;

/**
 * Everything the client needs to upload without a second round trip.
 *
 * `uploadUrl` is a presigned PUT valid for a few minutes. The client must send
 * exactly `uploadHeaders` with it — a presigned URL signs the headers, so an
 * extra or altered one makes the signature fail.
 */
export const MediaUploadResponse = z.object({
  mediaId: z.uuid(),
  uploadUrl: z.url(),
  uploadHeaders: z.record(z.string(), z.string()),
  expiresInSeconds: z.number().int().positive(),
});
export type MediaUploadResponseT = z.infer<typeof MediaUploadResponse>;

/** Confirms the bytes landed; the server verifies against storage before believing it. */
export const MediaCompleteRequest = z.object({
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  durationSeconds: z.number().positive().max(3600).optional(),
});
export type MediaCompleteRequestT = z.infer<typeof MediaCompleteRequest>;

/**
 * A media item as rendered.
 *
 * `url` is a short-lived signed GET rather than a permanent public link:
 * user-generated photos are not public objects, and a durable URL would outlive
 * every moderation decision made about the post that carries it.
 */
export const MediaResponse = z.object({
  id: z.uuid(),
  kind: MediaKind,
  url: z.url(),
  mimeType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  durationSeconds: z.number().nullable(),
});
export type MediaResponseT = z.infer<typeof MediaResponse>;
