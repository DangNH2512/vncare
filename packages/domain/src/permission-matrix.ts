import type { UserRoleT } from '@dnc/contracts';

/**
 * Roles that operate the platform rather than use it as a member. This is
 * the entry gate to the operations console (`apps/web-admin-side`); it says
 * nothing about what a given staff role can do once inside — see
 * PERMISSION_MATRIX for that.
 */
export const STAFF_ROLES: readonly UserRoleT[] = ['curator', 'moderator', 'admin', 'super_admin'];

/** True when `role` may sign in to the operations console. */
export function isStaffRole(role: UserRoleT): boolean {
  return STAFF_ROLES.includes(role);
}

/** Roles allowed to read the aggregated system-health snapshot. */
export const SYSTEM_HEALTH_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];

/** Roles allowed to read platform-wide analytics (the admin overview). */
export const ANALYTICS_PLATFORM_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];

/** A1: browse and search the user directory (read-only). */
export const USER_DIRECTORY_VIEW_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];
/** A2: browse events of every status (read-only). */
export const EVENT_DIRECTORY_VIEW_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];
/** A3/A4: hide user content without deleting it. */
export const CONTENT_HIDE_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];
/** A3: take an event down. */
export const EVENT_TAKEDOWN_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];
/** A3: suspend or restore an account; per-row limits (admin vs admin) live in the service. */
export const USER_SUSPEND_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];
/** A3: change a user's role. */
export const USER_ROLE_ASSIGN_ROLES: readonly UserRoleT[] = ['super_admin'];
/** A3: read the audit log; row filtering per role is applied in the service. */
export const AUDIT_LOG_VIEW_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];
/** A4: read the moderation queue. */
export const MODERATION_QUEUE_VIEW_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];
/** A4: decide a moderation case. */
export const MODERATION_DECIDE_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];
/** Every global role; for safety tools any signed-in account may use on its own behalf. */
export const ALL_ROLES: readonly UserRoleT[] = ['member', 'curator', 'moderator', 'admin', 'super_admin'];

/**
 * Machine-readable permission keys.
 *
 * `report.create` is deliberately absent: it is not role-based. Any signed-in
 * user with trust_level >= 1 may report (enforced by @MinTrustLevel(1)).
 *
 * This union covers what `apps/api` and `apps/web-admin-side` need today. It
 * is meant to grow toward the full 22-permission matrix in
 * docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 without changing shape —
 * new keys extend the union and add one PERMISSION_MATRIX entry each.
 */
export type PermissionKey =
  | 'admin_console.access'
  | 'system.health.view'
  | 'analytics.platform.view'
  | 'user.directory.view'
  | 'event.directory.view'
  | 'content.hide'
  | 'event.takedown'
  | 'user.suspend'
  | 'user.role.assign'
  | 'audit_log.view'
  | 'moderation.queue.view'
  | 'moderation.decide'
  | 'block.manage';

export interface PermissionRule {
  key: PermissionKey;
  /** Pointer into the authoritative business rule this entry encodes. */
  docRef: string;
  allowedRoles: readonly UserRoleT[];
}

/**
 * The single source of truth for "which role can do what".
 *
 * Consumed by both `apps/api` (RolesGuard, via `allowedRolesFor`) and
 * `apps/web-admin-side` (which sidebar entries to render for the signed-in
 * role). Neither surface keeps a role list of its own — drift between what
 * the API enforces and what the console shows is exactly what this file
 * exists to prevent.
 */
export const PERMISSION_MATRIX: readonly PermissionRule[] = [
  {
    key: 'admin_console.access',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2',
    allowedRoles: STAFF_ROLES,
  },
  {
    key: 'system.health.view',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2',
    allowedRoles: SYSTEM_HEALTH_ROLES,
  },
  {
    key: 'analytics.platform.view',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2',
    allowedRoles: ANALYTICS_PLATFORM_ROLES,
  },
  {
    key: 'user.directory.view',
    docRef: '.agent/specs/_changes/admin-console-v2/brief.md §2 (A1)',
    allowedRoles: USER_DIRECTORY_VIEW_ROLES,
  },
  {
    key: 'event.directory.view',
    docRef: '.agent/specs/_changes/admin-console-v2/brief.md §2 (A2)',
    allowedRoles: EVENT_DIRECTORY_VIEW_ROLES,
  },
  {
    key: 'content.hide',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 #14',
    allowedRoles: CONTENT_HIDE_ROLES,
  },
  {
    key: 'event.takedown',
    docRef: '.agent/specs/_changes/admin-console-v2/brief.md §2 (A3)',
    allowedRoles: EVENT_TAKEDOWN_ROLES,
  },
  {
    key: 'user.suspend',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 #15',
    allowedRoles: USER_SUSPEND_ROLES,
  },
  {
    key: 'user.role.assign',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.4',
    allowedRoles: USER_ROLE_ASSIGN_ROLES,
  },
  {
    key: 'audit_log.view',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 #22',
    allowedRoles: AUDIT_LOG_VIEW_ROLES,
  },
  {
    key: 'moderation.queue.view',
    docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 #16',
    allowedRoles: MODERATION_QUEUE_VIEW_ROLES,
  },
  {
    key: 'moderation.decide',
    docRef: 'docs/analysis/05-trust-safety-va-kiem-duyet.md §13.10',
    allowedRoles: MODERATION_DECIDE_ROLES,
  },
  {
    // Member-facing: a block only ever affects the caller's own view.
    key: 'block.manage',
    docRef: 'docs/analysis/05-trust-safety-va-kiem-duyet.md §13.10',
    allowedRoles: ALL_ROLES,
  },
];

/**
 * Looks up the allow-list for a permission key.
 *
 * Throws on a key with no registered rule rather than returning an empty
 * list: a typo'd key must fail loudly at the call site, not silently deny
 * every role.
 */
export function allowedRolesFor(key: PermissionKey): readonly UserRoleT[] {
  const rule = PERMISSION_MATRIX.find((candidate) => candidate.key === key);
  if (!rule) {
    throw new Error(`No permission rule registered for key "${key}"`);
  }
  return rule.allowedRoles;
}
