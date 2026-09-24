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

/**
 * Machine-readable permission keys.
 *
 * This union covers what `apps/api` and `apps/web-admin-side` need today. It
 * is meant to grow toward the full 22-permission matrix in
 * docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 without changing shape —
 * new keys extend the union and add one PERMISSION_MATRIX entry each.
 */
export type PermissionKey = 'admin_console.access' | 'system.health.view';

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
