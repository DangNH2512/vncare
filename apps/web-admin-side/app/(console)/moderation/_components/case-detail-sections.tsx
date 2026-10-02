import Link from 'next/link';
import type { ReactNode } from 'react';
import type {
  AdminModerationCaseDetailResponseT,
  AdminModerationOwnerT,
  AdminModerationTargetT,
} from '@dnc/contracts';
import { UserStatus } from '@dnc/contracts';

import { EventStatusBadge } from '../../../_components/labels/event-labels';
import { formatDayTime, NO_VALUE } from '../../../_components/labels/format';
import { RoleBadge, StatusBadge, TrustBadge } from '../../../_components/labels/user-labels';
import { Badge, Card } from '../../../_components/ui';
import { findAreaName } from '../../../_lib/areas';
import type { Locale, Translate } from '../../../_lib/i18n';
import {
  ACTION_TYPE_KEY,
  CONTENT_STATUS_KEY,
  REASON_CODE_KEY,
  REASON_GROUP_KEY,
  RESOLUTION_KEY,
  SeverityBadge,
  TARGET_TYPE_KEY,
} from './moderation-labels';

type Detail = AdminModerationCaseDetailResponseT;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
      {/* User text: plain text only, line breaks kept, long words wrapped. */}
      <dd className="min-w-0 break-words whitespace-pre-wrap text-fg">{children}</dd>
    </div>
  );
}

const text = (value: string | null | undefined): string =>
  value === null || value === undefined || value === '' ? NO_VALUE : value;

/** Fields of the evidence snapshot; the shape depends on the target type. */
function SnapshotFields({ target, t, locale }: { target: AdminModerationTargetT; t: Translate; locale: Locale }) {
  switch (target.type) {
    case 'event': {
      const { snapshot } = target;
      return (
        <>
          <Field label={t('admin.moderation.detail.field.title')}>{text(snapshot.title)}</Field>
          <Field label={t('admin.moderation.detail.field.description')}>{text(snapshot.description)}</Field>
          <Field label={t('admin.moderation.detail.field.startsAt')}>
            {snapshot.startsAt === null ? NO_VALUE : formatDayTime(snapshot.startsAt)}
          </Field>
          <Field label={t('admin.moderation.detail.field.endsAt')}>
            {snapshot.endsAt === null ? NO_VALUE : formatDayTime(snapshot.endsAt)}
          </Field>
          <Field label={t('admin.moderation.detail.field.area')}>
            {(snapshot.areaId === null ? undefined : findAreaName(snapshot.areaId, locale)) ?? NO_VALUE}
          </Field>
        </>
      );
    }
    case 'post':
    case 'comment':
      return <Field label={t('admin.moderation.detail.field.body')}>{text(target.snapshot.body)}</Field>;
    case 'user': {
      const { snapshot } = target;
      return (
        <>
          <Field label={t('admin.moderation.detail.field.handle')}>@{snapshot.handle}</Field>
          <Field label={t('admin.moderation.detail.field.displayName')}>{text(snapshot.displayName)}</Field>
          <Field label={t('admin.moderation.detail.field.headline')}>{text(snapshot.headline)}</Field>
          <Field label={t('admin.moderation.detail.field.bio')}>{text(snapshot.bio)}</Field>
        </>
      );
    }
    default:
      return null;
  }
}

function CurrentStatus({ target, t }: { target: AdminModerationTargetT; t: Translate }) {
  const status = target.currentStatus;
  if (status === null) return <Badge>{NO_VALUE}</Badge>;
  if (target.type === 'event') return <EventStatusBadge status={status} t={t} />;
  if (target.type === 'user') {
    const parsed = UserStatus.safeParse(status);
    return parsed.success ? <StatusBadge status={parsed.data} t={t} /> : <Badge>{NO_VALUE}</Badge>;
  }
  const key = CONTENT_STATUS_KEY[status];
  return <Badge tone={status === 'visible' ? 'success' : 'danger'}>{key === undefined ? NO_VALUE : t(key)}</Badge>;
}

/** Evidence as it was when first reported, next to the content as it stands now. */
export function TargetSection({ data, t, locale }: { data: Detail; t: Translate; locale: Locale }) {
  const { target } = data;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <Card as="section" aria-labelledby="case-snapshot" className="flex flex-col gap-3">
        <h2 id="case-snapshot" className="flex flex-wrap items-center gap-2 text-md font-semibold text-fg">
          {t('admin.moderation.detail.snapshot')}
          <Badge>{t(TARGET_TYPE_KEY[target.type])}</Badge>
        </h2>
        <dl className="flex min-w-0 flex-col gap-3 text-sm">
          <SnapshotFields target={target} t={t} locale={locale} />
        </dl>
      </Card>
      <Card as="section" aria-labelledby="case-current" className="flex flex-col gap-3">
        <h2 id="case-current" className="text-md font-semibold text-fg">
          {t('admin.moderation.detail.current')}
        </h2>
        {target.currentStatus === null && target.currentExcerpt === null ? (
          <p className="text-sm text-fg-muted">{t('admin.moderation.detail.gone')}</p>
        ) : (
          <dl className="flex min-w-0 flex-col gap-3 text-sm">
            <Field label={t('admin.moderation.detail.currentStatus')}>
              <CurrentStatus target={target} t={t} />
            </Field>
            <Field label={t('admin.moderation.detail.textLabel')}>{text(target.currentExcerpt)}</Field>
          </dl>
        )}
      </Card>
    </div>
  );
}

/** Case facts: deadline, who has it, how it ended. */
export function CaseFactsSection({ data, t }: { data: Detail; t: Translate }) {
  return (
    <Card as="section" aria-label={t('admin.moderation.col.case')}>
      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
        <Field label={t('admin.moderation.detail.firstReported')}>{formatDayTime(data.firstReportedAt)}</Field>
        <Field label={t('admin.moderation.detail.deadline')}>{formatDayTime(data.slaDueAt)}</Field>
        <Field label={t('admin.moderation.detail.firstResponse')}>
          {data.firstResponseAt === null ? t('admin.moderation.detail.noResponse') : formatDayTime(data.firstResponseAt)}
        </Field>
        <Field label={t('admin.moderation.detail.assignee')}>
          {data.assignee === null ? t('admin.moderation.unassigned') : <span translate="no">@{data.assignee.handle}</span>}
        </Field>
        {data.resolutionCode !== null && (
          <Field label={t('admin.moderation.detail.resolution')}>
            {t(RESOLUTION_KEY[data.resolutionCode])}
          </Field>
        )}
      </dl>
    </Card>
  );
}

/** Owner of the reported content, with the strikes that weigh on the decision. */
export function OwnerSection({
  owner,
  canOpenUser,
  t,
}: {
  owner: AdminModerationOwnerT | null;
  canOpenUser: boolean;
  t: Translate;
}) {
  return (
    <Card as="section" aria-labelledby="case-owner" className="flex flex-col gap-3">
      <h2 id="case-owner" className="text-md font-semibold text-fg">
        {t('admin.moderation.detail.owner')}
      </h2>
      {owner === null ? (
        <p className="text-sm text-fg-muted">{t('admin.moderation.detail.ownerNone')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {canOpenUser ? (
              <Link
                href={`/users/${owner.id}`}
                translate="no"
                className="font-mono font-medium text-accent-text hover:underline"
              >
                @{owner.handle}
              </Link>
            ) : (
              <span translate="no" className="font-mono font-medium">
                @{owner.handle}
              </span>
            )}
            <RoleBadge role={owner.role} t={t} />
            <StatusBadge status={owner.status} t={t} />
            <TrustBadge level={owner.trustLevel} t={t} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label={t('admin.moderation.detail.strikes')}>
              <span data-testid="owner-strikes" className="tabular-nums">
                {owner.activeStrikes}
              </span>
            </Field>
            <Field label={t('admin.moderation.detail.previousCases')}>
              <span className="tabular-nums">{owner.previousCaseCount}</span>
            </Field>
          </dl>
        </>
      )}
    </Card>
  );
}

/** Every report on the case: who, why, when. Handles and notes are shown as plain text. */
export function ReportsSection({ data, t }: { data: Detail; t: Translate }) {
  return (
    <Card as="section" aria-labelledby="case-reports" className="flex flex-col gap-3">
      <h2 id="case-reports" className="text-md font-semibold text-fg">
        {t('admin.moderation.detail.reports')}{' '}
        <span className="font-normal text-fg-muted tabular-nums">({data.reports.length})</span>
      </h2>
      <ul aria-label={t('admin.moderation.detail.reportList')} className="flex min-w-0 flex-col divide-y divide-line">
        {data.reports.map((report) => (
          <li key={report.id} className="flex min-w-0 flex-col gap-1 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">{t(REASON_GROUP_KEY[report.reasonGroup])}</span>
              <SeverityBadge severity={report.severity} t={t} />
              <span className="text-xs text-fg-muted">{formatDayTime(report.createdAt)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              {report.reporter === null ? (
                <span>{t('admin.moderation.detail.reporterGone')}</span>
              ) : (
                <>
                  <span translate="no" className="font-mono">
                    @{report.reporter.handle}
                  </span>
                  <TrustBadge level={report.reporter.trustLevel} t={t} />
                </>
              )}
            </div>
            <p className="break-words whitespace-pre-wrap text-sm text-fg">
              {report.description === null || report.description === ''
                ? t('admin.moderation.detail.noDescription')
                : report.description}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The case's action log, newest first as the API returns it. */
export function HistorySection({ data, t }: { data: Detail; t: Translate }) {
  return (
    <Card as="section" aria-labelledby="case-history" className="flex flex-col gap-3">
      <h2 id="case-history" className="text-md font-semibold text-fg">
        {t('admin.moderation.detail.history')}
      </h2>
      {data.actions.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('admin.moderation.detail.noActions')}</p>
      ) : (
        <ul aria-label={t('admin.moderation.detail.actionList')} className="flex min-w-0 flex-col divide-y divide-line">
          {data.actions.map((action) => (
            <li key={action.id} className="flex min-w-0 flex-col gap-1 py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{t(ACTION_TYPE_KEY[action.actionType])}</span>
                <Badge>{t(REASON_CODE_KEY[action.reasonCode])}</Badge>
                {action.strikeWeight > 0 && (
                  <Badge tone="warning">{t('admin.moderation.detail.strikeWeight', { weight: action.strikeWeight })}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
                <span>
                  {action.actorHandle === null
                    ? t('admin.moderation.detail.system')
                    : t('admin.moderation.detail.by', { name: `@${action.actorHandle}` })}
                </span>
                <span>{formatDayTime(action.createdAt)}</span>
                {action.expiresAt !== null && (
                  <span>{t('admin.moderation.detail.expires', { time: formatDayTime(action.expiresAt) })}</span>
                )}
                {action.revokedAt !== null && (
                  <span>{t('admin.moderation.detail.revoked', { time: formatDayTime(action.revokedAt) })}</span>
                )}
              </div>
              <p className="break-words whitespace-pre-wrap text-sm text-fg">{action.reasonNote}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
