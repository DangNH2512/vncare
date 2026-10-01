'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { AdminUserDetailResponseT } from '@dnc/contracts';

import { Badge, Card, MaskedText, MetricHint } from '../../../_components/ui';
import { findAreaName } from '../../../_lib/areas';
import type { Locale, MessageKey, Translate } from '../../../_lib/i18n';
import {
  EXPAT_KEY,
  labelFor,
  LOCALE_KEY,
  PLATFORM_KEY,
  POST_KIND_KEY,
  POST_STATUS_KEY,
  REVOKED_REASON_KEY,
  RSVP_STATUS_KEY,
  SIGNAL_STATUS_KEY,
  SIGNAL_TYPE_KEY,
  VISIBILITY_KEY,
} from './user-detail-labels';
import { formatDay, formatDayTime, NO_VALUE } from '../../../_components/labels/format';
import { EventStatusBadge } from '../../../_components/labels/event-labels';
import { RoleBadge, StatusBadge, TrustBadge } from '../../../_components/labels/user-labels';

interface SectionProps {
  t: Translate;
  locale: Locale;
  data: AdminUserDetailResponseT;
}

/** One label/value row; the value cell wraps long text instead of widening the card. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="text-xs font-medium text-fg-subtle sm:w-40 sm:shrink-0 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm break-words text-fg">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-md font-semibold text-fg">{children}</h2>;
}

/** Section heading with an info tooltip for the note that used to sit in the card body. */
function SectionTitleWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SectionTitle>{title}</SectionTitle>
      <MetricHint label={title} hint={hint} />
    </div>
  );
}

function dayTime(iso: string | null): string {
  return iso === null ? NO_VALUE : formatDayTime(iso);
}

export function ProfileSection({ t, locale, data }: SectionProps) {
  const { profile } = data;
  const area = profile.homeAreaId === null ? undefined : findAreaName(profile.homeAreaId, locale);
  // Optional rows appear only when they hold a value; all empty reads as one line.
  const optional: { key: string; label: MessageKey; value: ReactNode }[] = [];
  const add = (key: string, label: MessageKey, value: ReactNode | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') optional.push({ key, label, value });
  };
  add('headline', 'admin.users.detail.field.headline', profile.headline);
  add(
    'bio',
    'admin.users.detail.field.bio',
    profile.bio === null || profile.bio === '' ? null : <span className="whitespace-pre-wrap">{profile.bio}</span>,
  );
  add('nationality', 'admin.users.detail.field.nationality', profile.nationalityCode);
  add(
    'expatType',
    'admin.users.detail.field.expatType',
    profile.expatType === null ? null : labelFor(EXPAT_KEY, profile.expatType, t),
  );
  add('homeArea', 'admin.users.detail.field.homeArea', area);
  add(
    'inDaNangSince',
    'admin.users.detail.field.inDaNangSince',
    profile.inDaNangSince === null ? null : formatDay(profile.inDaNangSince),
  );
  return (
    <Card as="section" aria-label={t('admin.users.detail.section.profile')} className="flex flex-col gap-3">
      <SectionTitle>{t('admin.users.detail.section.profile')}</SectionTitle>
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.users.detail.field.handle')}>
          <span translate="no" className="font-mono">@{profile.handle}</span>
        </Field>
        {optional.map((row) => (
          <Field key={row.key} label={t(row.label)}>
            {row.value}
          </Field>
        ))}
        <Field label={t('admin.users.detail.field.visibility')}>
          {labelFor(VISIBILITY_KEY, profile.visibility, t)}
        </Field>
        <Field label={t('admin.users.detail.field.createdAt')}>{formatDayTime(profile.createdAt)}</Field>
        <Field label={t('admin.users.detail.field.lastActive')}>
          {profile.lastActiveAt === null ? t('admin.users.never') : formatDayTime(profile.lastActiveAt)}
        </Field>
      </dl>
      {optional.length === 0 && <p className="text-sm text-fg-muted">{t('admin.users.detail.profile.empty')}</p>}
    </Card>
  );
}

export function AccountSection({ t, data }: SectionProps) {
  const { account } = data;
  const verified = (ok: boolean) => (
    <Badge tone={ok ? 'success' : 'neutral'}>{t(ok ? 'admin.users.verified' : 'admin.users.unverified')}</Badge>
  );
  // `emailMasked` is null for phone-only accounts and reads as "No email".
  const email = account.emailMasked;
  return (
    <Card
      as="section"
      aria-label={t('admin.users.detail.section.account')}
      data-metric-anchor
      className="flex flex-col gap-3"
    >
      <SectionTitleWithHint
        title={t('admin.users.detail.section.account')}
        hint={t('admin.users.detail.contactMasked')}
      />
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.users.detail.field.role')}>
          <RoleBadge role={account.role} t={t} />
        </Field>
        <Field label={t('admin.users.detail.field.status')}>
          <StatusBadge status={account.status} t={t} />
        </Field>
        {account.suspendedUntil !== null && (
          <Field label={t('admin.users.detail.field.suspendedUntil')}>{formatDayTime(account.suspendedUntil)}</Field>
        )}
        {account.suspensionReason !== null && (
          <Field label={t('admin.users.detail.field.suspensionReason')}>
            <span className="whitespace-pre-wrap">{account.suspensionReason}</span>
          </Field>
        )}
        <Field label={t('admin.users.detail.field.email')}>
          <MaskedText
            value={email}
            emptyLabel={t('admin.users.noEmail')}
            verified={email === null ? undefined : verified(account.emailVerified)}
          />
        </Field>
        <Field label={t('admin.users.detail.field.phone')}>
          <MaskedText
            value={account.phoneMasked}
            emptyLabel={t('admin.users.noPhone')}
            verified={account.phoneMasked === null ? undefined : verified(account.phoneVerified)}
          />
        </Field>
        <Field label={t('admin.users.detail.field.locale')}>{labelFor(LOCALE_KEY, account.locale, t)}</Field>
        {account.deletionRequestedAt !== null && (
          <Field label={t('admin.users.detail.field.deletionRequestedAt')}>
            {formatDayTime(account.deletionRequestedAt)}
          </Field>
        )}
        {account.anonymizedAt !== null && (
          <Field label={t('admin.users.detail.field.anonymisedAt')}>{formatDayTime(account.anonymizedAt)}</Field>
        )}
        {account.deletedAt !== null && (
          <Field label={t('admin.users.detail.field.deletedAt')}>{formatDayTime(account.deletedAt)}</Field>
        )}
        {account.legalHoldUntil !== null && (
          <Field label={t('admin.users.detail.field.legalHoldUntil')}>{formatDayTime(account.legalHoldUntil)}</Field>
        )}
      </dl>
    </Card>
  );
}

function Counter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div data-metric-anchor className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-sunken p-2 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <MetricHint label={label} hint={hint} />
      </div>
      <span className="text-xl font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}

export function TrustSection({ t, data }: SectionProps) {
  const { trust } = data;
  return (
    <Card
      as="section"
      aria-label={t('admin.users.detail.section.trust')}
      data-metric-anchor
      className="flex flex-col gap-4"
    >
      <SectionTitleWithHint
        title={t('admin.users.detail.section.trust')}
        hint={t('admin.users.detail.trust.hint')}
      />
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.users.detail.field.trustLevel')}>
          <TrustBadge level={trust.trustLevel} t={t} showName />
        </Field>
        <Field label={t('admin.users.detail.field.trustChangedAt')}>{dayTime(trust.trustLevelChangedAt)}</Field>
      </dl>
      <div className="grid grid-cols-3 gap-2">
        <Counter
          label={t('admin.users.detail.trust.hostedCount')}
          value={trust.eventsHostedCount}
          hint={t('admin.users.detail.trust.hostedCountHint')}
        />
        <Counter
          label={t('admin.users.detail.trust.attendedCount')}
          value={trust.eventsAttendedCount}
          hint={t('admin.users.detail.trust.attendedCountHint')}
        />
        <Counter
          label={t('admin.users.detail.trust.noShowCount')}
          value={trust.noShowCount}
          hint={t('admin.users.detail.trust.noShowCountHint')}
        />
      </div>
      <h3 className="text-sm font-semibold text-fg">{t('admin.users.detail.trust.signals')}</h3>
      {trust.signals.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('admin.users.detail.empty')}</p>
      ) : (
        <div tabIndex={0} role="region" aria-label={t('admin.users.detail.trust.signals')} className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="text-xs text-fg-muted">
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.signal.col.type')}</th>
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.signal.col.status')}</th>
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.signal.col.weight')}</th>
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.signal.col.verified')}</th>
                <th scope="col" className="py-1 font-medium">{t('admin.users.detail.signal.col.revoked')}</th>
              </tr>
            </thead>
            <tbody>
              {trust.signals.map((signal, index) => (
                <tr key={`${signal.type}-${index}`} className="border-t border-line">
                  <td className="py-1.5 pr-4">{labelFor(SIGNAL_TYPE_KEY, signal.type, t)}</td>
                  <td className="py-1.5 pr-4">{labelFor(SIGNAL_STATUS_KEY, signal.status, t)}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{signal.weight}</td>
                  <td className="py-1.5 pr-4 whitespace-nowrap">{dayTime(signal.verifiedAt)}</td>
                  <td className="py-1.5 whitespace-nowrap">{dayTime(signal.revokedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Card for a "latest N of total" list; the total carries its own tooltip. */
function ListCard<T>({
  t,
  title,
  block,
  render,
  getKey,
}: {
  t: Translate;
  title: string;
  block: { items: T[]; total: number };
  render: (item: T) => ReactNode;
  getKey: (item: T, index: number) => string;
}) {
  return (
    <Card as="section" aria-label={title} data-metric-anchor className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        {block.total > 0 && (
          <span className="flex items-center gap-2 text-xs text-fg-muted">
            {block.items.length === block.total ? (
              <Badge>{block.total}</Badge>
            ) : (
              t('admin.users.detail.total', { shown: block.items.length, total: block.total })
            )}
            <MetricHint label={title} hint={t('admin.users.detail.totalHint')} />
          </span>
        )}
      </div>
      {block.items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('admin.users.detail.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {block.items.map((item, index) => (
            <li key={getKey(item, index)} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              {render(item)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ActivitySections({ t, data }: SectionProps) {
  // Nothing in any of the three lists: one line instead of three empty cards.
  if (data.hostedEvents.total === 0 && data.rsvps.total === 0 && data.posts.total === 0) {
    return (
      <Card as="section" aria-label={t('admin.users.detail.activity.empty')} className="xl:col-span-2">
        <p className="text-sm text-fg-muted">{t('admin.users.detail.activity.empty')}</p>
      </Card>
    );
  }
  return (
    <>
      <ListCard
        t={t}
        title={t('admin.users.detail.section.hosted')}
        block={data.hostedEvents}
        getKey={(event) => event.id}
        render={(event) => (
          <>
            <Link href={`/events/${event.id}`} className="min-w-0 flex-1 font-medium break-words text-accent-text hover:underline">
              {event.title}
            </Link>
            <EventStatusBadge status={event.status} t={t} />
            <span className="text-xs whitespace-nowrap text-fg-muted">{dayTime(event.startsAt)}</span>
          </>
        )}
      />
      <ListCard
        t={t}
        title={t('admin.users.detail.section.rsvps')}
        block={data.rsvps}
        getKey={(rsvp, index) => `${rsvp.eventId}-${index}`}
        render={(rsvp) => (
          <>
            <Link href={`/events/${rsvp.eventId}`} className="min-w-0 flex-1 break-words text-accent-text hover:underline">
              {rsvp.eventTitle}
            </Link>
            <Badge>{labelFor(RSVP_STATUS_KEY, rsvp.status, t)}</Badge>
            <span className="text-xs whitespace-nowrap text-fg-muted">{formatDayTime(rsvp.createdAt)}</span>
          </>
        )}
      />
      <ListCard
        t={t}
        title={t('admin.users.detail.section.posts')}
        block={data.posts}
        getKey={(post) => post.id}
        render={(post) => (
          <>
            <span className="min-w-0 flex-1 break-words">{post.excerpt}</span>
            <Badge tone="accent">{labelFor(POST_KIND_KEY, post.kind, t)}</Badge>
            <Badge>{labelFor(POST_STATUS_KEY, post.status, t)}</Badge>
            <span className="text-xs whitespace-nowrap text-fg-muted">{formatDayTime(post.createdAt)}</span>
          </>
        )}
      />
    </>
  );
}

export function SessionsSection({ t, data }: SectionProps) {
  const { sessions } = data;
  return (
    <Card as="section" aria-label={t('admin.users.detail.section.sessions')} data-metric-anchor className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>{t('admin.users.detail.section.sessions')}</SectionTitle>
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          {t('admin.users.detail.sessions.active', { count: sessions.activeCount })}
          <MetricHint
            label={t('admin.users.detail.section.sessions')}
            hint={t('admin.users.detail.sessions.activeHint')}
          />
        </span>
      </div>
      {sessions.recent.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('admin.users.detail.session.none')}</p>
      ) : (
        <div tabIndex={0} role="region" aria-label={t('admin.users.detail.section.sessions')} className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="text-xs text-fg-muted">
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.session.col.platform')}</th>
                <th scope="col" className="py-1 pr-4 font-medium">{t('admin.users.detail.session.col.started')}</th>
                <th scope="col" className="py-1 font-medium">{t('admin.users.detail.session.col.revoked')}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.recent.map((session, index) => (
                <tr key={`${session.createdAt}-${index}`} className="border-t border-line">
                  <td className="py-1.5 pr-4">{labelFor(PLATFORM_KEY, session.platform, t)}</td>
                  <td className="py-1.5 pr-4 whitespace-nowrap">{formatDayTime(session.createdAt)}</td>
                  <td className="py-1.5 whitespace-nowrap">
                    {session.revokedAt === null ? NO_VALUE : formatDayTime(session.revokedAt)}
                    {session.revokedReason !== null && (
                      <Badge className="ml-2">{labelFor(REVOKED_REASON_KEY, session.revokedReason, t)}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
