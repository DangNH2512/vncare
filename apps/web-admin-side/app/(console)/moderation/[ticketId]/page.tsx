'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { allowedRolesFor } from '@dnc/domain';
import type {
  ModerationActionResponseT,
  ModerationReportItemT,
  ModerationTicketDetailResponseT,
} from '@dnc/contracts';

import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { ActionDialog } from '../../../_components/moderation/action-dialog';
import {
  actionTypeLabel,
  apiErrorMessage,
  EVENT_STATUS_LABEL_KEY,
  FORM_KIND_LABEL_KEY,
  REASON_LABEL_KEY,
  TARGET_TYPE_LABEL_KEY,
  TICKET_STATUS_LABEL_KEY,
} from '../../../_components/moderation/labels';
import { SeverityBadge } from '../../../_components/moderation/severity-badge';
import { SlaCountdown } from '../../../_components/moderation/sla-countdown';
import { SnapshotView } from '../../../_components/moderation/snapshot-view';
import {
  attachReversals,
  planTicketActions,
  type ActionPlan,
  type Viewer,
} from '../../../_components/moderation/ticket-actions';
import { TicketHistory } from '../../../_components/moderation/ticket-history';
import { RequireRole } from '../../../_components/require-role';
import { Badge, Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { ApiError, getModerationTicket } from '../../../_lib/api';
import { formatDateTime } from '../../../_lib/datetime';
import type { Translate } from '../../../_lib/i18n';
import { roleLabelKey } from '../../../_lib/roles';
import { createServerClock, useServerNow, type ServerClock } from '../../../_lib/server-clock';

type TicketState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; ticket: ModerationTicketDetailResponseT; clock: ServerClock | null };

type Notice = { tone: 'success' | 'warning'; message: string };

/**
 * Ticket detail and every decision on it (T-ADM-3). Same role gate as the
 * queue; on top of it the API refuses a ticket the viewer is involved in
 * (403 CONFLICT_OF_INTEREST, AC-26), which lands in the error state below.
 */
export default function ModerationTicketPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('moderation.queue.view')}>
      <TicketContent />
    </RequireRole>
  );
}

/** Conflict of interest, not found, role refused: retrying cannot help. */
function isFinal(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

function TicketContent() {
  const t = useTranslate();
  const { user } = useAuth();
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;

  const [state, setState] = useState<TicketState>({ kind: 'loading' });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [openPlan, setOpenPlan] = useState<ActionPlan | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const loadSeq = useRef(0);

  /** `quiet` keeps the current ticket on screen while it reloads after a decision. */
  const load = useCallback(
    (quiet: boolean) => {
      const seq = ++loadSeq.current;
      if (!quiet) setState({ kind: 'loading' });
      getModerationTicket(ticketId)
        .then((ticket) => {
          const clock = createServerClock(ticket.serverTime);
          if (seq !== loadSeq.current) return;
          setState({ kind: 'ready', ticket, clock });
        })
        .catch((error: unknown) => {
          if (seq !== loadSeq.current) return;
          setState({ kind: 'error', error });
        });
    },
    [ticketId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const ticket = state.kind === 'ready' ? state.ticket : null;
  const clock = state.kind === 'ready' && state.ticket.status === 'open' ? state.clock : null;
  const nowMs = useServerNow(clock);

  const userId = user?.id;
  const userRole = user?.role;
  const viewer = useMemo<Viewer | null>(
    () => (userId === undefined || userRole === undefined ? null : { id: userId, role: userRole }),
    [userId, userRole],
  );
  const plans = useMemo(
    () => (ticket === null || viewer === null ? null : planTicketActions(ticket, viewer)),
    [ticket, viewer],
  );
  const reversals = useMemo(
    () => (ticket === null || plans === null ? null : attachReversals(ticket, plans.reversal)),
    [ticket, plans],
  );

  const handleDone = (result: ModerationActionResponseT) => {
    setOpenPlan(null);
    setShowFollowUp(false);
    setNotice({
      tone: 'success',
      message: actionTypeLabel(t, result.actionType, result.severityBefore, result.severityAfter),
    });
    load(true);
  };

  const handleConflict = (message: string) => {
    setOpenPlan(null);
    setNotice({ tone: 'warning', message });
    load(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/moderation"
        className="w-fit text-sm font-medium text-accent-text hover:underline"
      >
        ← {t('admin.moderation.ticket.back')}
      </Link>

      {state.kind === 'loading' && (
        <Card aria-busy="true">
          <SkeletonText lines={8} />
        </Card>
      )}

      {state.kind === 'error' && (
        <Card>
          <EmptyState
            icon={<span className="text-2xl">⚠</span>}
            title={t('admin.moderation.ticket.error.title')}
            {...(isFinal(state.error)
              ? { description: apiErrorMessage(t, state.error, 'errors.moderation.ticketNotFound') }
              : { action: <Button onClick={() => load(false)}>{t('common.retry')}</Button> })}
          />
        </Card>
      )}

      {ticket !== null && plans !== null && reversals !== null && viewer !== null && (
        <>
          {notice !== null && (
            <Card
              role="status"
              className={
                notice.tone === 'success'
                  ? 'border-success-text/30 bg-success-subtle text-success-text'
                  : 'border-warning-text/30 bg-warning-subtle text-warning-text'
              }
            >
              <p className="text-sm font-semibold">{notice.message}</p>
            </Card>
          )}

          <TicketHeader ticket={ticket} nowMs={nowMs} t={t} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <EvidenceSection ticket={ticket} t={t} />
              <ReportsSection reports={ticket.reports} t={t} />
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <Card as="section" className="flex flex-col gap-3">
                <ActionsPanel
                  ticket={ticket}
                  enforcement={plans.enforcement}
                  extraReversals={reversals.unattached}
                  ticketActions={plans.ticket}
                  showFollowUp={showFollowUp}
                  onShowFollowUp={() => setShowFollowUp(true)}
                  onOpen={setOpenPlan}
                  t={t}
                />
              </Card>

              <Card as="section" className="flex flex-col gap-3" aria-labelledby="ticket-history">
                <h2 id="ticket-history" className="text-md font-semibold text-fg">
                  {t('admin.moderation.ticket.historyTitle')}
                </h2>
                <TicketHistory
                  actions={ticket.actions}
                  reversals={reversals.byActionId}
                  onReverse={setOpenPlan}
                />
              </Card>
            </div>
          </div>

          <ActionDialog
            plan={openPlan}
            ticketId={ticket.id}
            ticketSeverity={ticket.severity}
            followUp={ticket.status !== 'open'}
            viewer={viewer}
            onClose={() => setOpenPlan(null)}
            onDone={handleDone}
            onConflict={handleConflict}
          />
        </>
      )}
    </div>
  );
}

function TicketHeader({
  ticket,
  nowMs,
  t,
}: {
  ticket: ModerationTicketDetailResponseT;
  nowMs: number | null;
  t: Translate;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={ticket.severity} />
        <Badge tone={ticket.status === 'open' ? 'accent' : 'neutral'}>
          {t(TICKET_STATUS_LABEL_KEY[ticket.status])}
        </Badge>
        <SlaCountdown severity={ticket.severity} slaDueAt={ticket.slaDueAt} nowMs={nowMs} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg-subtle">
          {t(TARGET_TYPE_LABEL_KEY[ticket.targetType])}
        </span>
        <h1 className="text-xl font-semibold break-words text-fg">{ticket.targetPreview}</h1>
      </div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <Field label={t('admin.moderation.queue.column.firstReported')}>
          {formatDateTime(ticket.firstReportedAt)}
        </Field>
        <Field label={t('admin.moderation.queue.column.reports')}>{ticket.reportCount}</Field>
        {ticket.closedAt !== null && (
          <Field label={t('admin.moderation.queue.column.closedAt')}>
            {formatDateTime(ticket.closedAt)}
            {ticket.outcome !== null && (
              <span className="block text-fg-muted">{actionTypeLabel(t, ticket.outcome)}</span>
            )}
          </Field>
        )}
      </dl>
    </Card>
  );
}

/** Live state of the target now, in words; null when the catalog has no label for it. */
function currentStatusLabel(ticket: ModerationTicketDetailResponseT, t: Translate): string | null {
  const { status } = ticket.currentTarget;
  if (ticket.currentTarget.deleted) return t('admin.moderation.ticket.targetDeleted');
  if (ticket.targetType === 'event') {
    const key = Object.entries(EVENT_STATUS_LABEL_KEY).find(([value]) => value === status)?.[1];
    return key === undefined ? null : t(key);
  }
  if ((ticket.targetType === 'post' || ticket.targetType === 'comment') && status === 'hidden') {
    return t('safety.label.contentHidden');
  }
  return null;
}

function EvidenceSection({ ticket, t }: { ticket: ModerationTicketDetailResponseT; t: Translate }) {
  const first = ticket.reports[0];
  const status = currentStatusLabel(ticket, t);
  const owner = ticket.targetOwner;
  const ownerRoleKey = owner === null ? undefined : roleLabelKey(owner.role);

  return (
    <Card as="section" className="flex flex-col gap-4" aria-labelledby="ticket-snapshot">
      <h2 id="ticket-snapshot" className="text-md font-semibold text-fg">
        {t('admin.moderation.ticket.snapshotTitle')}
      </h2>
      {first !== undefined && <SnapshotView snapshot={first.snapshot} />}

      {status !== null && (
        <p className="text-sm text-fg-muted">
          {t('admin.moderation.ticket.currentStatus', { status })}
        </p>
      )}

      {owner !== null && (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <span className="text-xs font-medium text-fg-subtle">
            {t('admin.moderation.ticket.owner')}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-fg">
              {owner.displayName} <span className="text-fg-muted">@{owner.handle}</span>
            </span>
            {ownerRoleKey !== undefined && <Badge tone="accent">{t(ownerRoleKey)}</Badge>}
          </div>
          {owner.status === 'suspended' && owner.suspendedUntil !== null && (
            <Badge tone="warning" className="w-fit">
              {t('admin.moderation.ticket.suspendedUntil', {
                time: formatDateTime(owner.suspendedUntil),
              })}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}

function ReportsSection({
  reports,
  t,
}: {
  reports: readonly ModerationReportItemT[];
  t: Translate;
}) {
  const firstSnapshot = reports[0] === undefined ? '' : JSON.stringify(reports[0].snapshot);

  return (
    <Card as="section" className="flex flex-col gap-3" aria-labelledby="ticket-reports">
      <h2 id="ticket-reports" className="text-md font-semibold text-fg">
        {t('admin.moderation.ticket.reportsTitle', { count: reports.length })}
      </h2>
      <ol className="flex flex-col gap-3">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-col gap-2 rounded-md border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="neutral">{t(REASON_LABEL_KEY[report.reason])}</Badge>
              <time dateTime={report.createdAt} className="text-xs text-fg-muted">
                {formatDateTime(report.createdAt)}
              </time>
            </div>
            <p className="text-sm text-fg-muted">
              {report.reporter === null
                ? t('admin.moderation.ticket.reporterDeleted')
                : t('admin.moderation.ticket.reporter', {
                    name: `${report.reporter.displayName} (@${report.reporter.handle})`,
                  })}
            </p>
            {report.description === null || report.description === '' ? (
              <p className="text-sm text-fg-subtle italic">
                {t('admin.moderation.ticket.noDescription')}
              </p>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words text-fg">
                {report.description}
              </p>
            )}
            {/* The author may have edited between two reports: show what this reporter saw. */}
            {JSON.stringify(report.snapshot) !== firstSnapshot && (
              <details className="text-sm">
                <summary className="cursor-pointer text-accent-text">
                  {t('admin.moderation.ticket.snapshotTitle')}
                </summary>
                <div className="pt-2">
                  <SnapshotView snapshot={report.snapshot} />
                </div>
              </details>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ActionsPanel({
  ticket,
  enforcement,
  extraReversals,
  ticketActions,
  showFollowUp,
  onShowFollowUp,
  onOpen,
  t,
}: {
  ticket: ModerationTicketDetailResponseT;
  enforcement: readonly ActionPlan[];
  extraReversals: readonly ActionPlan[];
  ticketActions: readonly ActionPlan[];
  showFollowUp: boolean;
  onShowFollowUp: () => void;
  onOpen: (plan: ActionPlan) => void;
  t: Translate;
}) {
  const decisions = [...enforcement, ...extraReversals];

  // A closed ticket keeps its buttons behind "Add another action": acting on
  // it again is deliberate (followUp: true), not the default next step.
  if (ticket.status !== 'open' && !showFollowUp) {
    return decisions.length === 0 ? null : (
      <Button variant="secondary" onClick={onShowFollowUp}>
        {t('admin.moderation.ticket.addAction')}
      </Button>
    );
  }

  const buttons = ticket.status === 'open' ? [...decisions, ...ticketActions] : decisions;
  if (buttons.length === 0) {
    return <p className="text-sm text-fg-muted">{t('errors.moderation.targetProtected')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {buttons.map((plan) => (
        <Button
          key={`${plan.kind}:${plan.targetId}`}
          variant={plan.destructive ? 'danger' : 'secondary'}
          fullWidth
          onClick={() => onOpen(plan)}
        >
          {t(FORM_KIND_LABEL_KEY[plan.kind])}
        </Button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}
