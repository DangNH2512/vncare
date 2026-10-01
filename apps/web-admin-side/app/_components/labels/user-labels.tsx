import type { UserRoleT, UserStatusT } from '@dnc/contracts';

import { Badge, type BadgeTone } from '../ui';
import type { MessageKey, Translate } from '../../_lib/i18n';

/** Explicit maps: catalog keys mix snake_case and camelCase, so never interpolate them. */
export const ROLE_KEY: Readonly<Record<UserRoleT, MessageKey>> = {
  member: 'role.member.label',
  curator: 'role.curator.label',
  moderator: 'role.moderator.label',
  admin: 'role.admin.label',
  super_admin: 'role.superAdmin.label',
};

export const STATUS_KEY: Readonly<Record<UserStatusT, MessageKey>> = {
  pending: 'admin.users.status.pending',
  active: 'admin.users.status.active',
  suspended: 'admin.users.status.suspended',
  deactivated: 'admin.users.status.deactivated',
  deleted: 'admin.users.status.deleted',
};

const STATUS_TONE: Readonly<Record<UserStatusT, BadgeTone>> = {
  pending: 'warning',
  active: 'success',
  suspended: 'danger',
  deactivated: 'neutral',
  deleted: 'neutral',
};

const ROLE_TONE: Readonly<Record<UserRoleT, BadgeTone>> = {
  member: 'neutral',
  curator: 'accent',
  moderator: 'accent',
  admin: 'accent',
  super_admin: 'accent',
};

export const TRUST_LEVEL_KEY: Readonly<Record<number, MessageKey>> = {
  0: 'trust.level.t0',
  1: 'trust.level.t1',
  2: 'trust.level.t2',
  3: 'trust.level.t3',
  4: 'trust.level.t4',
  5: 'trust.level.t5',
};

export function trustLabel(level: number, t: Translate): string {
  const key = TRUST_LEVEL_KEY[level];
  return key === undefined ? '' : t(key);
}

export const ROLES: readonly UserRoleT[] = ['member', 'curator', 'moderator', 'admin', 'super_admin'];
export const STATUSES: readonly UserStatusT[] = [
  'pending',
  'active',
  'suspended',
  'deactivated',
  'deleted',
];

export function RoleBadge({ role, t }: { role: UserRoleT; t: Translate }) {
  return <Badge tone={ROLE_TONE[role]}>{t(ROLE_KEY[role])}</Badge>;
}

export function StatusBadge({ status, t }: { status: UserStatusT; t: Translate }) {
  return <Badge tone={STATUS_TONE[status]}>{t(STATUS_KEY[status])}</Badge>;
}

/**
 * `T3` badge. The level name is hover text and screen-reader text (sr-only, not
 * an `aria-label` on a span); `showName` prints it too (`T3 · Regular`).
 */
export function TrustBadge({
  level,
  t,
  showName = false,
}: {
  level: number;
  t: Translate;
  showName?: boolean;
}) {
  const full = t('trust.badge.aria', { level, label: trustLabel(level, t) });
  const short = t('trust.badge.short', { level });
  // `relative` makes the badge the containing block of the sr-only text, so it
  // cannot widen the page from inside a horizontally scrolling table.
  return (
    <Badge tone="neutral" title={full} className="relative">
      {showName ? (
        `${short} · ${trustLabel(level, t)}`
      ) : (
        <>
          <span aria-hidden>{short}</span>
          <span className="sr-only">{full}</span>
        </>
      )}
    </Badge>
  );
}
