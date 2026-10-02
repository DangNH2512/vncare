/**
 * Moderation console endpoints (A4): the queue, one case, and the three
 * actions on a case. Requires `moderation.queue.view` to read and
 * `moderation.decide` to act (moderator, admin, super_admin). Result shapes
 * come from `@dnc/contracts`, so this file owns transport only.
 *
 * Every mutation carries an `Idempotency-Key`. The header is reserved: the
 * moderation API does not deduplicate on it yet, so a replay must not be
 * treated as harmless.
 */
import type {
  AdminModerationCaseDetailResponseT,
  AdminModerationQueueResponseT,
  AdminUserListResponseT,
  AssignCaseResultT,
  ChangeCaseSeverityBodyT,
  ChangeCaseSeverityResultT,
  DecideCaseBodyT,
  DecideCaseResultT,
  ModerationSeverityT,
} from '@dnc/contracts';

import { call } from './api';
import { toQueryString } from './list-query';
import { listAdminUsers } from './users-api';

const BASE = '/api/v1/admin/moderation/cases';

const casePath = (caseNumber: number, action?: string): string =>
  `${BASE}/${encodeURIComponent(String(caseNumber))}${action === undefined ? '' : `/${action}`}`;

/** `query` is a `?a=b` string built from the queue filters and cursor, or ''. */
export function listModerationCases(query: string): Promise<AdminModerationQueueResponseT> {
  return call<AdminModerationQueueResponseT>(`${BASE}${query}`);
}

export function getModerationCase(caseNumber: number): Promise<AdminModerationCaseDetailResponseT> {
  return call<AdminModerationCaseDetailResponseT>(casePath(caseNumber));
}

/** Rows requested for the Reports block of one record; far above the open cases one item realistically has. */
const RELATED_LIMIT = 20;

/**
 * Open cases whose reported content is `targetId`, from one server-filtered
 * request. Only `items` is read: `stats` always describes the whole queue, not
 * this target. Cases the caller has a conflict of interest with never appear in
 * the queue, so they are not counted either.
 */
export async function listCasesForTarget(
  targetType: 'event' | 'user',
  targetId: string,
): Promise<AdminModerationQueueResponseT['items']> {
  const result = await listModerationCases(
    toQueryString({ targetType: [targetType], targetId, limit: RELATED_LIMIT }),
  );
  return result.items;
}

/** Takes the case for the caller, or assigns it to `assigneeId` (admin only, enforced by the API). */
export function assignCase(
  caseNumber: number,
  assigneeId: string | undefined,
  idempotencyKey: string,
): Promise<AssignCaseResultT> {
  return call<AssignCaseResultT>(casePath(caseNumber, 'assign'), {
    method: 'POST',
    body: JSON.stringify(assigneeId === undefined ? {} : { assigneeId }),
    headers: { 'idempotency-key': idempotencyKey },
  });
}

export function changeCaseSeverity(
  caseNumber: number,
  severity: ModerationSeverityT,
  reasonNote: string,
  idempotencyKey: string,
): Promise<ChangeCaseSeverityResultT> {
  const body: ChangeCaseSeverityBodyT = { severity, reasonNote };
  return call<ChangeCaseSeverityResultT>(casePath(caseNumber, 'severity'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'idempotency-key': idempotencyKey },
  });
}

export function decideCase(
  caseNumber: number,
  body: DecideCaseBodyT,
  idempotencyKey: string,
): Promise<DecideCaseResultT> {
  return call<DecideCaseResultT>(casePath(caseNumber, 'decisions'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'idempotency-key': idempotencyKey },
  });
}

/** Active staff an administrator may hand a case to, newest accounts first (one page, at most 100). */
export function listAssignableStaff(): Promise<AdminUserListResponseT> {
  return listAdminUsers(
    toQueryString({
      role: ['moderator', 'admin', 'super_admin'],
      status: ['active'],
      sort: 'createdAt',
      dir: 'desc',
      limit: 100,
    }),
  );
}
