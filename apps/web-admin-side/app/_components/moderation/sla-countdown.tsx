'use client';

import { slaState, type SlaState } from '@dnc/domain';
import type { ModerationSeverityT } from '@dnc/contracts';

import { formatDuration } from '../../_lib/datetime';
import { INTL_LOCALE } from '../../_lib/i18n';
import { useLocale, useTranslate } from '../locale-provider';
import { Badge, type BadgeTone } from '../ui';

const STATE_TONE: Readonly<Record<SlaState, BadgeTone>> = {
  normal: 'success',
  due_soon: 'warning',
  overdue: 'danger',
};

/**
 * SLA countdown for one ticket (AC-23, AC-48).
 *
 * `nowMs` is the server's clock (`useServerNow`), never `Date.now()`; the
 * colour band comes from `slaState` in `@dnc/domain` — the same function the
 * unit tests pin at "P0 with 30 minutes left is due soon". Each band has its
 * own sentence ("Due soon · 29m left"), so the state is readable without the
 * colour. `nowMs === null` means the console cannot vouch for its data (a
 * refresh failed, AC-28) or the ticket is closed: the timer shows "Stopped"
 * instead of counting on.
 */
export function SlaCountdown({
  severity,
  slaDueAt,
  nowMs,
}: {
  severity: ModerationSeverityT;
  slaDueAt: string;
  nowMs: number | null;
}) {
  const t = useTranslate();
  const { locale } = useLocale();
  const dueMs = Date.parse(slaDueAt);

  if (nowMs === null || Number.isNaN(dueMs)) {
    return <Badge tone="neutral">{t('admin.moderation.sla.stopped')}</Badge>;
  }

  const state = slaState(severity, new Date(dueMs), new Date(nowMs));
  const intlLocale = INTL_LOCALE[locale];
  const label =
    state === 'overdue'
      ? t('admin.moderation.sla.overdue', { overdue: formatDuration(nowMs - dueMs, intlLocale) })
      : t(state === 'due_soon' ? 'admin.moderation.sla.dueSoon' : 'admin.moderation.sla.normal', {
          remaining: formatDuration(dueMs - nowMs, intlLocale),
        });

  return (
    <Badge tone={STATE_TONE[state]} data-sla-state={state} className="tabular-nums">
      {label}
    </Badge>
  );
}
