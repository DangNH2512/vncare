/**
 * Minimal client for the Da Nang Connect API.
 *
 * Deliberately hand-written and small: `@dnc/api-client` (generated from the
 * OpenAPI document) replaces it, and until that generator exists a thin wrapper
 * beats a second hand-maintained type layer. Response shapes are imported from
 * `@dnc/contracts`, so this file owns transport only, never data shapes.
 */
import type {
  MediaCompleteRequestT,
  MediaResponseT,
  MediaUploadRequestT,
  MediaUploadResponseT,
  PostCreateRequestT,
  PostResponseT,
} from '@dnc/contracts';

/** Overridden per environment; the default matches the API's own default port. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const DEV_USER_STORAGE_KEY = 'dnc-dev-user-id';

/**
 * Identity for local development.
 *
 * The auth module does not exist yet, so the API accepts an `x-user-id` header
 * behind a guard that refuses to run in production. One id is generated per
 * browser and kept, so a post made yesterday still belongs to you today.
 * This whole function disappears when real sessions land.
 */
function devUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage.getItem(DEV_USER_STORAGE_KEY);
    if (stored) return stored;
    const generated = crypto.randomUUID();
    window.localStorage.setItem(DEV_USER_STORAGE_KEY, generated);
    return generated;
  } catch {
    // Private browsing can throw on access rather than return null. A per-session
    // identity is still better than no identity.
    return crypto.randomUUID();
  }
}

/** Distinguishes "the API said no" from "the API was not reachable". */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly messageKey: string | undefined,
  ) {
    super(`API ${status} ${code ?? ''}`.trim());
    this.name = 'ApiError';
  }

  /** True when the request never reached a server — the API is probably not running. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Narrower than `RequestInit` on purpose: `HeadersInit` also admits `Headers`
 * and an array of tuples, neither of which merges correctly into an object
 * literal. A plain record is the only shape this client ever needs.
 */
interface CallInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

async function call<T>(path: string, init?: CallInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-user-id': devUserId(),
        // Trust level 3 unlocks posting and commenting while the real ladder is
        // computed from trust signals that do not exist yet.
        'x-trust-level': '3',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'OFFLINE', undefined);
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error =
      typeof body === 'object' && body !== null
        ? ((body as { message?: { code?: string; messageKey?: string } }).message ?? {})
        : {};
    throw new ApiError(response.status, error.code, error.messageKey);
  }

  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

export function createPost(body: PostCreateRequestT): Promise<PostResponseT> {
  return call<PostResponseT>('/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function reserveUpload(body: MediaUploadRequestT): Promise<MediaUploadResponseT> {
  return call<MediaUploadResponseT>('/api/v1/media/uploads', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function completeUpload(
  mediaId: string,
  body: MediaCompleteRequestT,
): Promise<MediaResponseT> {
  return call<MediaResponseT>(`/api/v1/media/${mediaId}/complete`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function listPosts(limit = 20): Promise<{
  items: PostResponseT[];
  nextCursor: string | null;
}> {
  return call(`/api/v1/posts?limit=${limit}`);
}
