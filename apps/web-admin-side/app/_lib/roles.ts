import type { UserRoleT } from '@dnc/contracts';

import type { MessageKey } from './i18n';

/**
 * i18n key holding the display label for each staff role.
 *
 * `member` has no entry: that role never reaches a screen that renders this
 * map — `AuthProvider` signs a member back out before the console shell ever
 * mounts (see `isStaffRole` in `@dnc/domain`).
 */
const ROLE_LABEL_KEY: Readonly<Partial<Record<UserRoleT, MessageKey>>> = {
  curator: 'role.curator.label',
  moderator: 'role.moderator.label',
  admin: 'role.admin.label',
  super_admin: 'role.superAdmin.label',
};

/** Looks up the label key for a role; undefined only for `member`. */
export function roleLabelKey(role: UserRoleT): MessageKey | undefined {
  return ROLE_LABEL_KEY[role];
}
