/**
 * Client for the Da Nang Connect API.
 *
 * Deliberately hand-written and small: `@dnc/api-client` (generated from the
 * OpenAPI document) replaces it, and until that generator exists a thin wrapper
 * beats a second hand-maintained type layer. Response shapes are imported from
 * `@dnc/contracts`, so this file owns transport only, never data shapes.
 */
import type {
  AttendeeResponseT,
  AuthSessionResponseT,
  EventCreateRequestT,
  EventResponseT,
  LoginRequestT,
  MediaCompleteRequestT,
  MediaResponseT,
  MediaUploadRequestT,
  MediaUploadResponseT,
  MyProfileResponseT,
  PostCreateRequestT,
  PostResponseT,
  RsvpResponseT,
  ProfileUpdateRequestT,
  PublicProfileResponseT,
  RegisterRequestT,
} from '@dnc/contracts';

/**
 * Same-origin by design.
 *
 * Next rewrites `/api/*` to the API process, so the refresh cookie is a
 * first-party cookie and no request is preflighted. Nothing here should ever
 * point at another origin.
 */
const API_BASE = '';

/**
 * The access token lives in a module variable, never in localStorage.
 *
 * Storage is readable by any script that gets onto the page; a variable is not,
 * and the cost of losing it on reload is one silent refresh call. The refresh
 * token itself is an httpOnly cookie this code cannot read at all.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
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

  /** True when the caller needs to sign in, or sign in again. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
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
  /** Set on the retry so a failed refresh cannot loop. */
  retried?: boolean;
}

async function call<T>(path: string, init?: CallInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      // Spread rather than assign: `exactOptionalPropertyTypes` treats an
      // explicit `undefined` as a value, and fetch does not accept one.
      ...(init?.method === undefined ? {} : { method: init.method }),
      ...(init?.body === undefined ? {} : { body: init.body }),
      // The refresh cookie must ride along on the auth routes.
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        ...(accessToken === null ? {} : { authorization: `Bearer ${accessToken}` }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'OFFLINE', undefined);
  }

  // An access token lasts fifteen minutes, so an expiry mid-session is normal
  // rather than exceptional: refresh once, silently, and replay the call.
  if (response.status === 401 && !init?.retried && path !== '/api/v1/auth/refresh') {
    const renewed = await refresh().catch(() => null);
    if (renewed) return call<T>(path, { ...init, retried: true });
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error =
      typeof body === 'object' && body !== null
        ? ((body as { message?: { code?: string; messageKey?: string } }).message ?? {})
        : {};
    throw new ApiError(response.status, error.code, error.messageKey);
  }

  if (response.status === 204) return undefined as T;
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

/* -------------------------------------------------------------------- auth */

async function adoptSession(session: AuthSessionResponseT): Promise<AuthSessionResponseT> {
  setAccessToken(session.accessToken);
  return session;
}

export async function register(body: RegisterRequestT): Promise<AuthSessionResponseT> {
  return adoptSession(
    await call<AuthSessionResponseT>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function login(body: LoginRequestT): Promise<AuthSessionResponseT> {
  return adoptSession(
    await call<AuthSessionResponseT>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

/**
 * In-flight refresh, shared by every concurrent caller.
 *
 * Refresh tokens rotate, so two simultaneous refreshes would spend the same
 * token twice and read as a replay.
 */
let inFlightRefresh: Promise<AuthSessionResponseT | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * Returns null both when there is no session to restore (204, the ordinary
 * case for a first-time visitor) and when the cookie was rejected. The caller
 * treats the two the same: show the signed-out view.
 */
export function refresh(): Promise<AuthSessionResponseT | null> {
  inFlightRefresh ??= runRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function runRefresh(): Promise<AuthSessionResponseT | null> {
  try {
    const session = await call<AuthSessionResponseT | undefined>('/api/v1/auth/refresh', {
      method: 'POST',
    });
    if (session === undefined) {
      setAccessToken(null);
      return null;
    }
    return await adoptSession(session);
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  await call<void>('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
  setAccessToken(null);
}

/* ----------------------------------------------------------------- profile */

export function myProfile(): Promise<MyProfileResponseT> {
  return call<MyProfileResponseT>('/api/v1/me/profile');
}

export function updateMyProfile(body: ProfileUpdateRequestT): Promise<MyProfileResponseT> {
  return call<MyProfileResponseT>('/api/v1/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function publicProfile(handle: string): Promise<PublicProfileResponseT> {
  return call<PublicProfileResponseT>(`/api/v1/profiles/${encodeURIComponent(handle)}`);
}

/* ------------------------------------------------------------------- media */

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

/* ------------------------------------------------------------------ events */

export function listEvents(limit = 20): Promise<{
  items: EventResponseT[];
  nextCursor: string | null;
}> {
  return call(`/api/v1/events?limit=${limit}`);
}

export function getEvent(id: string): Promise<EventResponseT> {
  return call<EventResponseT>(`/api/v1/events/${id}`);
}

export function createEvent(body: EventCreateRequestT): Promise<EventResponseT> {
  return call<EventResponseT>('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function publishEvent(id: string): Promise<EventResponseT> {
  return call<EventResponseT>(`/api/v1/events/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'published' }),
  });
}

/* -------------------------------------------------------------------- rsvp */

/**
 * Joins one occurrence. The Idempotency-Key is generated here, per call: a
 * network retry of THIS call must reuse it, which `fetch` does not do on its
 * own — so the server treats a duplicate submit as the same request only when
 * the caller passes the same key back.
 */
export function joinOccurrence(
  occurrenceId: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<RsvpResponseT> {
  return call<RsvpResponseT>(`/api/v1/occurrences/${occurrenceId}/rsvps`, {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
  });
}

export function cancelRsvp(occurrenceId: string): Promise<void> {
  return call<void>(`/api/v1/occurrences/${occurrenceId}/rsvps`, { method: 'DELETE' });
}

export function listAttendees(occurrenceId: string): Promise<AttendeeResponseT[]> {
  return call<AttendeeResponseT[]>(`/api/v1/occurrences/${occurrenceId}/rsvps`);
}

/* ------------------------------------------------------------------- posts */

export function createPost(body: PostCreateRequestT): Promise<PostResponseT> {
  return call<PostResponseT>('/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPosts(limit = 20): Promise<{
  items: PostResponseT[];
  nextCursor: string | null;
}> {
  return call(`/api/v1/posts?limit=${limit}`);
}
