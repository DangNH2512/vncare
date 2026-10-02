/**
 * Admin action endpoints (A3): suspend, unsuspend and change role.
 *
 * Every call carries an `Idempotency-Key`. The header is reserved: the admin
 * action API does not deduplicate on it yet, so it must not be relied on to
 * make a replay harmless. Result shapes come from `@dnc/contracts`.
 */
import type {
  AdminRoleActionResultT,
  AdminUserActionResultT,
  AssignableRoleT,
  ReasonedActionBodyT,
} from '@dnc/contracts';

import { call } from './api';

function userActionPath(id: string, action: 'suspend' | 'unsuspend' | 'role'): string {
  return `/api/v1/admin/users/${encodeURIComponent(id)}/${action}`;
}

export function suspendUser(
  id: string,
  reason: string,
  idempotencyKey: string,
): Promise<AdminUserActionResultT> {
  const body: ReasonedActionBodyT = { reason, confirm: true };
  return call<AdminUserActionResultT>(userActionPath(id, 'suspend'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'idempotency-key': idempotencyKey },
  });
}

export function unsuspendUser(
  id: string,
  reason: string,
  idempotencyKey: string,
): Promise<AdminUserActionResultT> {
  const body: ReasonedActionBodyT = { reason, confirm: true };
  return call<AdminUserActionResultT>(userActionPath(id, 'unsuspend'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'idempotency-key': idempotencyKey },
  });
}

export function changeUserRole(
  id: string,
  role: AssignableRoleT,
  reason: string,
  idempotencyKey: string,
): Promise<AdminRoleActionResultT> {
  return call<AdminRoleActionResultT>(userActionPath(id, 'role'), {
    method: 'POST',
    body: JSON.stringify({ role, reason, confirm: true }),
    headers: { 'idempotency-key': idempotencyKey },
  });
}
