'use client';

import Link from 'next/link';
import type { AdminUserListItemT } from '@dnc/contracts';

import type { DataTableColumn } from '../../../_components/ui';
import { Badge, MaskedText } from '../../../_components/ui';
import type { Translate } from '../../../_lib/i18n';
import { formatDay, formatDayTime } from '../../../_components/labels/format';
import { RoleBadge, StatusBadge, TrustBadge } from '../../../_components/labels/user-labels';

/** Pinned column width (px); the DataTable needs it to place sticky offsets. */
const NAME_WIDTH = 200;

function Verified({ verified, t }: { verified: boolean; t: Translate }) {
  const label = t(verified ? 'admin.users.verified' : 'admin.users.unverified');
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className={verified ? 'text-success-text' : 'text-fg-subtle'}
    >
      <span aria-hidden>{verified ? '✓' : '○'}</span>
    </span>
  );
}

/**
 * Columns of the user directory (D-U6). Contact values arrive masked from the
 * server; `emailMasked` and `phoneMasked` are both nullable in the contract.
 */
export function buildUserColumns(t: Translate): DataTableColumn<AdminUserListItemT>[] {
  return [
    {
      key: 'name',
      header: t('admin.users.col.name'),
      pin: true,
      width: NAME_WIDTH,
      render: (user) => (
        <Link
          href={`/users/${user.id}`}
          className="block max-w-[11rem] truncate font-medium text-fg hover:text-accent-text"
          title={user.displayName}
        >
          {user.displayName}
        </Link>
      ),
    },
    {
      key: 'handle',
      header: t('admin.users.col.handle'),
      sortKey: 'handle',
      render: (user) => (
        <span translate="no" className="font-mono text-fg-muted">
          @{user.handle}
        </span>
      ),
    },
    {
      key: 'role',
      header: t('admin.users.col.role'),
      render: (user) => <RoleBadge role={user.role} t={t} />,
    },
    {
      key: 'status',
      header: t('admin.users.col.status'),
      render: (user) => (
        <span className="inline-flex flex-wrap gap-1">
          <StatusBadge status={user.status} t={t} />
          {user.deleted && user.status !== 'deleted' && (
            <Badge tone="neutral">{t('admin.users.status.deleted')}</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'trust',
      header: t('admin.users.col.trust'),
      sortKey: 'trustLevel',
      render: (user) => <TrustBadge level={user.trustLevel} t={t} />,
    },
    {
      key: 'email',
      header: t('admin.users.col.email'),
      pii: true,
      render: (user) => {
        // `emailMasked` is null for accounts without an email (phone-only sign-up).
        const email = user.emailMasked;
        return (
          <MaskedText
            value={email}
            emptyLabel={t('admin.users.noEmail')}
            verified={email === null ? undefined : <Verified verified={user.emailVerified} t={t} />}
          />
        );
      },
    },
    {
      key: 'phone',
      header: t('admin.users.col.phone'),
      pii: true,
      render: (user) => (
        <MaskedText
          value={user.phoneMasked}
          emptyLabel={t('admin.users.noPhone')}
          verified={
            user.phoneMasked === null ? undefined : <Verified verified={user.phoneVerified} t={t} />
          }
        />
      ),
    },
    {
      key: 'joined',
      header: t('admin.users.col.joined'),
      sortKey: 'createdAt',
      render: (user) => <span className="whitespace-nowrap">{formatDay(user.createdAt)}</span>,
    },
    {
      key: 'lastActive',
      header: t('admin.users.col.lastActive'),
      sortKey: 'lastActiveAt',
      render: (user) =>
        user.lastActiveAt === null ? (
          <span className="text-fg-subtle">{t('admin.users.never')}</span>
        ) : (
          <span className="whitespace-nowrap">{formatDayTime(user.lastActiveAt)}</span>
        ),
    },
  ];
}
