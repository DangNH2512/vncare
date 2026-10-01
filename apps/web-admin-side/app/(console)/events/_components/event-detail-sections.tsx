'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { AdminEventDetailResponseT, AdminEventOccurrenceT } from '@dnc/contracts';

import { Badge, Card, MetricHint } from '../../../_components/ui';
import { findAreaName } from '../../../_lib/areas';
import type { Locale, MessageKey, Translate } from '../../../_lib/i18n';
import { formatDayTime, NO_VALUE } from '../../../_components/labels/format';
import { RoleBadge, STATUS_KEY, TrustBadge } from '../../../_components/labels/user-labels';
import { isFull, isInProgress } from './event-labels';

interface SectionProps {
  t: Translate;
  locale: Locale;
  data: AdminEventDetailResponseT;
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

/** Section heading with an info tooltip for a note that would otherwise be a line of body text. */
function SectionTitleWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SectionTitle>{title}</SectionTitle>
      <MetricHint label={title} hint={hint} />
    </div>
  );
}

export function OverviewSection({ t, locale, data }: SectionProps) {
  const area = data.areaId === null ? undefined : findAreaName(data.areaId, locale);
  const coordinates =
    data.lat === null || data.lng === null ? NO_VALUE : `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`;
  return (
    <Card as="section" aria-label={t('admin.events.detail.section.overview')} className="flex flex-col gap-3">
      <SectionTitle>{t('admin.events.detail.section.overview')}</SectionTitle>
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.events.detail.field.id')}>
          <span translate="no" className="font-mono text-xs">{data.id}</span>
        </Field>
        <Field label={t('admin.events.detail.field.slug')}>
          <span translate="no" className="font-mono">{data.slug}</span>
        </Field>
        <Field label={t('admin.events.detail.field.area')}>{area ?? NO_VALUE}</Field>
        <Field label={t('admin.events.detail.field.coordinates')}>
          <span translate="no" className="font-mono">{coordinates}</span>
        </Field>
        <Field label={t('admin.events.detail.field.featured')}>
          {t(data.isFeatured ? 'admin.events.detail.yes' : 'admin.events.detail.no')}
        </Field>
        <Field label={t('admin.events.detail.field.requiredTrust')}>
          <TrustBadge level={data.requiredTrustLevel} t={t} showName />
        </Field>
        <Field label={t('admin.events.detail.field.comments')}>{data.commentCount}</Field>
        <Field label={t('admin.events.detail.field.createdAt')}>{formatDayTime(data.createdAt)}</Field>
        <Field label={t('admin.events.detail.field.updatedAt')}>{formatDayTime(data.updatedAt)}</Field>
      </dl>
    </Card>
  );
}

/** Title and description are user content: shown verbatim, as plain text, never translated. */
export function DescriptionSection({ t, data }: Pick<SectionProps, 't' | 'data'>) {
  return (
    <Card
      as="section"
      aria-label={t('admin.events.detail.section.description')}
      data-metric-anchor
      className="flex flex-col gap-3"
    >
      {data.description === null && data.status === 'draft' ? (
        <SectionTitleWithHint
          title={t('admin.events.detail.section.description')}
          hint={t('admin.events.detail.draftHidden')}
        />
      ) : (
        <SectionTitle>{t('admin.events.detail.section.description')}</SectionTitle>
      )}
      {data.description === null ? (
        <p className="text-sm text-fg-muted">{NO_VALUE}</p>
      ) : (
        <p className="text-sm break-words whitespace-pre-wrap text-fg">{data.description}</p>
      )}
    </Card>
  );
}

export function HostSection({
  t,
  data,
  canOpenUser,
}: Pick<SectionProps, 't' | 'data'> & { canOpenUser: boolean }) {
  const { host } = data;
  return (
    <Card as="section" aria-label={t('admin.events.detail.section.host')} className="flex flex-col gap-3">
      <SectionTitle>{t('admin.events.detail.section.host')}</SectionTitle>
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.events.detail.field.hostName')}>
          {canOpenUser ? (
            <Link href={`/users/${host.id}`} className="font-medium text-accent-text hover:underline">
              {host.displayName}
            </Link>
          ) : (
            host.displayName
          )}
        </Field>
        <Field label={t('admin.events.detail.field.hostHandle')}>
          <span translate="no" className="font-mono">@{host.handle}</span>
        </Field>
        <Field label={t('admin.events.detail.field.hostTrust')}>
          <TrustBadge level={host.trustLevel} t={t} showName />
        </Field>
        <Field label={t('admin.events.detail.field.hostRole')}>
          <RoleBadge role={host.role} t={t} />
        </Field>
        <Field label={t('admin.events.detail.field.hostStatus')}>{t(STATUS_KEY[host.status])}</Field>
      </dl>
    </Card>
  );
}

function Counter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div data-metric-anchor className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-sunken p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        {hint !== undefined && <MetricHint label={label} hint={hint} />}
      </div>
      <span className="text-xl font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}

const COUNTS: readonly (readonly [keyof AdminEventOccurrenceT['stats'], MessageKey])[] = [
  ['confirmed', 'admin.events.detail.counts.confirmed'],
  ['held', 'admin.events.detail.counts.held'],
  ['waitlisted', 'admin.events.detail.counts.waitlisted'],
  ['cancelled', 'admin.events.detail.counts.cancelled'],
  ['attended', 'admin.events.detail.counts.attended'],
  ['noShow', 'admin.events.detail.counts.noShow'],
];

function OccurrenceCard({
  t,
  occurrence,
  index,
}: {
  t: Translate;
  occurrence: AdminEventOccurrenceT;
  index: number;
}) {
  const { stats } = occurrence;
  return (
    <Card as="li" data-metric-anchor className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">
          {t('admin.events.detail.occurrence', { index })}
        </h3>
        {isInProgress(occurrence.startsAt, occurrence.endsAt) && (
          <Badge tone="accent">{t('admin.events.inProgress')}</Badge>
        )}
        {isFull(stats.seatsTaken, occurrence.capacity) && (
          <Badge tone="warning">{t('admin.events.full')}</Badge>
        )}
      </div>
      <dl className="flex flex-col gap-2">
        <Field label={t('admin.events.detail.occurrenceStarts')}>{formatDayTime(occurrence.startsAt)}</Field>
        <Field label={t('admin.events.detail.occurrenceEnds')}>
          {occurrence.endsAt === null ? NO_VALUE : formatDayTime(occurrence.endsAt)}
        </Field>
        <Field label={t('admin.events.detail.capacity')}>{occurrence.capacity}</Field>
      </dl>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Counter
          label={t('admin.events.detail.seatsTaken')}
          value={stats.seatsTaken}
          hint={t('admin.events.detail.seatsTakenHint')}
        />
        {COUNTS.map(([key, label]) => (
          <Counter key={key} label={t(label)} value={stats[key]} />
        ))}
        <Counter label={t('admin.events.detail.waitlistWaiting')} value={stats.waitlistWaiting} />
      </div>
    </Card>
  );
}

export function OccurrencesSection({ t, data }: Pick<SectionProps, 't' | 'data'>) {
  return (
    <section
      aria-label={t('admin.events.detail.occurrences')}
      data-metric-anchor
      className="flex min-w-0 flex-col gap-3"
    >
      <SectionTitleWithHint
        title={t('admin.events.detail.occurrences')}
        hint={t('admin.events.detail.attendeesNote')}
      />
      {data.occurrences.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('admin.events.detail.noOccurrences')}</p>
      ) : (
        <ul aria-label={t('admin.events.detail.occurrencesLabel')} className="flex min-w-0 flex-col gap-3">
          {data.occurrences.map((occurrence, index) => (
            <OccurrenceCard key={occurrence.id} t={t} occurrence={occurrence} index={index + 1} />
          ))}
        </ul>
      )}
    </section>
  );
}
