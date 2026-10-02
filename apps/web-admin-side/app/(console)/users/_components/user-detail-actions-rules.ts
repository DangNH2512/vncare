import type { AdminUserDetailResponseT, AssignableRoleT, UserRoleT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

/** Roles the API lets a super admin assign; `super_admin` is never grantable (D-R3). */
export const ASSIGNABLE_ROLES: readonly AssignableRoleT[] = ['member', 'curator', 'moderator', 'admin'];

/** Moderator and admin need this trust level (D-R3 rule 5). The API still decides. */
export const MIN_TRUST_FOR_STAFF_ROLE = 3;

const TRUST_GATED: ReadonlySet<AssignableRoleT> = new Set(['moderator', 'admin']);

export interface UserActionActor {
  id: string;
  role: UserRoleT;
}

export interface UserActionAvailability {
  suspend: boolean;
  unsuspend: boolean;
  changeRole: boolean;
}

/**
 * Which actions get a button on this user's page (D-R16).
 *
 * A button that cannot succeed is left out of the DOM rather than disabled.
 * This only mirrors the API rules so the page does not offer dead ends; the
 * API remains the real gate for every one of them.
 */
export function availableUserActions(
  actor: UserActionActor,
  target: AdminUserDetailResponseT,
): UserActionAvailability {
  const { role, status, deletedAt, anonymizedAt } = target.account;
  const none = { suspend: false, unsuspend: false, changeRole: false };
  if (actor.id === target.id || deletedAt !== null || anonymizedAt !== null) return none;

  const mayModerate = allowedRolesFor('user.suspend').includes(actor.role);
  // An admin cannot touch admins or super admins (D-R4 rule 2).
  const protectedTarget = actor.role === 'admin' && (role === 'admin' || role === 'super_admin');
  const canTouch = mayModerate && !protectedTarget;
  const mayAssign = allowedRolesFor('user.role.assign').includes(actor.role);

  return {
    suspend: canTouch && status === 'active',
    unsuspend: canTouch && status === 'suspended',
    // A super admin cannot be demoted in v1 (D-R3 rule 6), and only an active account changes role.
    changeRole: mayAssign && status === 'active' && role !== 'super_admin',
  };
}

export interface RoleOption {
  role: AssignableRoleT;
  /** True when the target's trust level is too low for this role. */
  needsTrust: boolean;
}

/** Roles to choose from: every assignable role except the current one. */
export function roleOptions(currentRole: UserRoleT, trustLevel: number): RoleOption[] {
  return ASSIGNABLE_ROLES.filter((role) => role !== currentRole).map((role) => ({
    role,
    needsTrust: TRUST_GATED.has(role) && trustLevel < MIN_TRUST_FOR_STAFF_ROLE,
  }));
}
