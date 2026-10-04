/**
 * Client for the Da Nang Connect API, staff-facing auth surface only.
 *
 * Mirrors the transport in apps/web-client-side/app/_lib/api.ts: deliberately
 * hand-written and small. `@dnc/api-client` (generated from the OpenAPI
 * document) replaces it, and until that generator exists a thin wrapper beats
 * a second hand-maintained type layer. Response shapes are imported from
 * `@dnc/contracts`, so this file owns transport only, never data shapes.
 *
 * Only the endpoints the operations console needs are exposed here: auth
 * (`login`, `refresh`, `logout`, `me`), system health, the moderation queue
 * and its actions, and the audit log. There is no `register` — staff accounts
 * are provisioned another way, not self-served through this app.
 */
import type {
  AdminSystemHealthResponseT,
  AuditLogQueryT,
  AuditLogResponseT,
  AuthSessionResponseT,
  LoginRequestT,
  ModerationActionRequestT,
  ModerationActionResponseT,
  ModerationQueueQueryT,
  ModerationQueueResponseT,
  ModerationTicketDetailResponseT,
  SessionUserResponseT,
  TicketDismissRequestT,
  TicketSeverityRequestT,
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
    /** Extra values for the message, e.g. `{ maxDays }` on SUSPENSION_TOO_LONG. */
    readonly details: Readonly<Record<string, unknown>> | undefined = undefined,
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
  // rather than exceptional: refresh once, silently, and replay the call. The
  // caller reaching this branch already holds (or held) a session — this is
  // not the initial authentication decision, so adopting the renewed token
  // outright is correct here, unlike `login`/the mount-time `refresh` call in
  // AuthProvider, which must not adopt before checking the role (see below).
  if (response.status === 401 && !init?.retried && path !== '/api/v1/auth/refresh') {
    const renewed = await refresh().catch(() => null);
    if (renewed) {
      setAccessToken(renewed.accessToken);
      return call<T>(path, { ...init, retried: true });
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    // Every guard and service in apps/api throws `new SomeHttpException({ code,
    // messageKey })` — a plain object, not a string. Nest's default exception
    // filter sends that object as the response body verbatim (no `message`
    // envelope, no `statusCode` field), so the body is flat: confirmed against
    // the running API and the RolesGuard e2e suite (`{ code: 'ROLE_NOT_ALLOWED',
    // messageKey: 'errors.auth.roleNotAllowed' }`, no nesting).
    const error =
      typeof body === 'object' && body !== null
        ? (body as { code?: string; messageKey?: string; details?: Record<string, unknown> })
        : {};
    const details =
      typeof error.details === 'object' && error.details !== null ? error.details : undefined;
    throw new ApiError(response.status, error.code, error.messageKey, details);
  }

  if (response.status === 204) return undefined as T;
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

/* -------------------------------------------------------------------- auth */

/**
 * Authenticates without adopting the session.
 *
 * Deliberately does not call `setAccessToken`: the caller (`AuthProvider`)
 * has not yet checked whether this account holds a staff role, and this
 * console must never hold even a member's access token in memory, not even
 * for the instant between the API answering and that check running. The
 * caller adopts the token itself once it decides the session belongs here.
 */
export async function login(body: LoginRequestT): Promise<AuthSessionResponseT> {
  return call<AuthSessionResponseT>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * In-flight refresh, shared by every concurrent caller.
 *
 * Refresh tokens rotate, so two simultaneous refreshes would spend the same
 * token twice and read as a replay.
 */
let inFlightRefresh: Promise<AuthSessionResponseT | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token, without adopting it.
 *
 * Returns null both when there is no session to restore (204, the ordinary
 * case for a first-time visitor) and when the cookie was rejected. The caller
 * treats the two the same: show the signed-out view. Same "do not adopt
 * before the role check" rule as `login` — this is also the mount-time call
 * `AuthProvider` uses to silently restore a session, and the refresh cookie
 * is host-scoped rather than port-scoped, so it can just as easily belong to
 * a member signed in on `apps/web-client-side` on the same machine. The
 * internal 401-retry in `call()` above adopts explicitly instead, since that
 * caller already held a vetted session.
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
    return session ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await call<void>('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
  setAccessToken(null);
}

/** The signed-in staff member, read straight from the database on every call. */
export function me(): Promise<SessionUserResponseT> {
  return call<SessionUserResponseT>('/api/v1/auth/me');
}

/* ---------------------------------------------------------------- admin */

/**
 * Aggregated readiness snapshot for the operations console.
 *
 * Requires `admin` or `super_admin` (`SYSTEM_HEALTH_ROLES` in `@dnc/domain`);
 * every other role gets 403 `ROLE_NOT_ALLOWED`. Unlike the public
 * `/health/ready` probe this always resolves 200 with `data.status` carrying
 * the verdict, so a signed-in operator sees the page render even while a
 * dependency is down.
 */
export function getSystemHealth(): Promise<AdminSystemHealthResponseT> {
  return call<AdminSystemHealthResponseT>('/api/v1/admin/system/health');
}

/* ----------------------------------------------------------- moderation */

/** Page of any cursor-paginated list (`cursorPage()` in `@dnc/contracts`). */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Serialises only the parameters that are set. An empty string counts as
 * unset: it is what a cleared filter field holds, and sending `severity=`
 * would fail validation instead of meaning "any".
 */
function toQueryString(params: Readonly<Record<string, string | number | undefined>>): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(name, String(value));
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

/**
 * One key per decision, generated when the operator opens the form and kept
 * across retries of that same submit — a network retry then resolves to the
 * first attempt instead of recording the decision twice.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function idempotencyHeaders(key: string | undefined): Record<string, string> {
  return key === undefined ? {} : { 'idempotency-key': key };
}

/**
 * Open or handled tickets, conflict-of-interest tickets already removed by
 * the API (task board D10). `serverTime` drives every countdown (D15).
 * Requires `moderation.queue.view`.
 */
export function getModerationQueue(
  query: Partial<ModerationQueueQueryT> = {},
): Promise<ModerationQueueResponseT> {
  return call<ModerationQueueResponseT>(
    `/api/v1/admin/moderation/queue${toQueryString({
      status: query.status,
      severity: query.severity,
      cursor: query.cursor,
      limit: query.limit,
    })}`,
  );
}

/** Full ticket: snapshots, reporters, owner, action history. 403 `CONFLICT_OF_INTEREST` when involved. */
export function getModerationTicket(ticketId: string): Promise<ModerationTicketDetailResponseT> {
  return call<ModerationTicketDetailResponseT>(
    `/api/v1/admin/moderation/tickets/${encodeURIComponent(ticketId)}`,
  );
}

/** Enforcement or reversal (E7). Writes one moderation action and one audit row server-side. */
export function takeModerationAction(
  body: ModerationActionRequestT,
  idempotencyKey?: string,
): Promise<ModerationActionResponseT> {
  return call<ModerationActionResponseT>('/api/v1/admin/moderation/actions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: idempotencyHeaders(idempotencyKey),
  });
}

/** Closes an open ticket as "no violation" (`no_action`, E8). */
export function dismissTicket(
  ticketId: string,
  body: TicketDismissRequestT,
  idempotencyKey?: string,
): Promise<ModerationActionResponseT> {
  return call<ModerationActionResponseT>(
    `/api/v1/admin/moderation/tickets/${encodeURIComponent(ticketId)}/dismiss`,
    { method: 'POST', body: JSON.stringify(body), headers: idempotencyHeaders(idempotencyKey) },
  );
}

/** Re-grades an open ticket; the API recomputes its deadline (`severity_changed`, E9). */
export function changeTicketSeverity(
  ticketId: string,
  body: TicketSeverityRequestT,
  idempotencyKey?: string,
): Promise<ModerationActionResponseT> {
  return call<ModerationActionResponseT>(
    `/api/v1/admin/moderation/tickets/${encodeURIComponent(ticketId)}/severity`,
    { method: 'POST', body: JSON.stringify(body), headers: idempotencyHeaders(idempotencyKey) },
  );
}

/* ---------------------------------------------------------------- audit */

/**
 * Read-only journal, newest first (E10). The API narrows the result by role
 * (`auditLogScope`): a moderator only ever receives their own entries, and
 * filtering on someone else's id returns an empty page rather than a 403.
 * There is deliberately no write function here — the API has no such route.
 */
export function listAuditLogs(
  query: Partial<AuditLogQueryT> = {},
): Promise<CursorPage<AuditLogResponseT>> {
  return call<CursorPage<AuditLogResponseT>>(
    `/api/v1/admin/audit-logs${toQueryString({
      from: query.from,
      to: query.to,
      action: query.action,
      actorUserId: query.actorUserId,
      entityType: query.entityType,
      cursor: query.cursor,
      limit: query.limit,
    })}`,
  );
}
