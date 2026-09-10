'use client';

import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type MediaKindT,
} from '@dnc/contracts';

import { completeUpload, reserveUpload } from './api';

/** One item in the composer, from the moment it is picked until it is attached. */
export interface DraftMedia {
  /** Local identity, stable across the whole lifecycle; the server id arrives later. */
  localId: string;
  mediaId: string | null;
  kind: MediaKindT;
  file: File;
  /** Object URL for the local preview — no round trip to see what you just picked. */
  previewUrl: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  progress: number;
  status: 'uploading' | 'ready' | 'failed';
}

/** Why a picked file was refused. There is no count-based rejection: a gallery is uncapped. */
export type MediaRejection = 'type' | 'size';

export function kindOf(file: File): MediaKindT | null {
  if ((ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) return 'image';
  if ((ALLOWED_VIDEO_MIME as readonly string[]).includes(file.type)) return 'video';
  return null;
}

/**
 * Rejects a file before any network call.
 *
 * The same limits are enforced server-side before a URL is signed; checking here
 * as well means the user learns a 90 MB video is too large immediately rather
 * than after watching it upload.
 */
export function rejectionFor(file: File): MediaRejection | null {
  const kind = kindOf(file);
  if (kind === null) return 'type';
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  return file.size > max ? 'size' : null;
}

/**
 * Reads intrinsic dimensions from the file itself.
 *
 * Sent on completion so the feed can reserve the right aspect ratio before the
 * image arrives; without it every gallery reflows as each item loads.
 */
async function probe(
  file: File,
  kind: MediaKindT,
  url: string,
): Promise<{ width: number | null; height: number | null; durationSeconds: number | null }> {
  const empty = { width: null, height: null, durationSeconds: null };
  try {
    if (kind === 'image') {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height, durationSeconds: null };
      bitmap.close();
      return size;
    }
    return await new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth || null,
          height: video.videoHeight || null,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        });
      };
      video.onerror = () => resolve(empty);
      video.src = url;
    });
  } catch {
    // A codec the browser cannot decode still uploads fine; it just renders
    // without a reserved aspect ratio.
    return empty;
  }
}

/**
 * Uploads one file straight to object storage.
 *
 * XMLHttpRequest rather than fetch purely for `upload.onprogress`: fetch still
 * reports no upload progress, and a 100 MB video with no progress bar reads as
 * a frozen app.
 */
function put(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`upload failed with ${request.status}`));
    request.onerror = () => reject(new Error('upload failed'));
    request.send(file);
  });
}

/**
 * Runs the three-step handshake for one draft item.
 *
 * Uploading on pick rather than on submit: by the time the author finishes
 * writing a caption the bytes are already stored, so publishing is instant even
 * on a slow connection.
 */
export async function uploadDraft(
  draft: DraftMedia,
  onChange: (patch: Partial<DraftMedia>) => void,
): Promise<void> {
  try {
    const dimensions = await probe(draft.file, draft.kind, draft.previewUrl);
    onChange(dimensions);

    const reservation = await reserveUpload({
      kind: draft.kind,
      mimeType: draft.file.type,
      byteSize: draft.file.size,
    });
    onChange({ mediaId: reservation.mediaId });

    await put(reservation.uploadUrl, reservation.uploadHeaders, draft.file, (fraction) =>
      onChange({ progress: fraction }),
    );

    await completeUpload(reservation.mediaId, {
      ...(dimensions.width === null ? {} : { width: dimensions.width }),
      ...(dimensions.height === null ? {} : { height: dimensions.height }),
      ...(dimensions.durationSeconds === null
        ? {}
        : { durationSeconds: dimensions.durationSeconds }),
    });
    onChange({ progress: 1, status: 'ready' });
  } catch {
    onChange({ status: 'failed' });
  }
}
