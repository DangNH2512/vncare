import { SetMetadata } from '@nestjs/common';
import type { UserRoleT } from '@dnc/contracts';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to an explicit allow-list of global roles.
 *
 * Checked by RolesGuard ahead of @MinTrustLevel (D-07: role denies before
 * trust is even considered), so a member with a high trust level still
 * cannot reach a staff-only route. Prefer sourcing the list from
 * `@dnc/domain`'s `PERMISSION_MATRIX` via `allowedRolesFor(key)` rather than
 * spelling the same roles out again at each call site.
 */
export const Roles = (...roles: readonly UserRoleT[]) => SetMetadata(ROLES_KEY, roles);
