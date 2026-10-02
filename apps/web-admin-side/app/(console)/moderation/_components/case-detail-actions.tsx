'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  AdminModerationCaseDetailResponseT,
  ModerationCaseStatusT,
  ModerationDecisionTypeT,
  ModerationSeverityT,
} from '@dnc/contracts';

import {
  ActionDialog,
  describeActionFailure,
  type ActionFailure,
  type ActionSubmitInput,
} from '../../../_components/action-dialog';
import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { Button } from '../../../_components/ui';
import { cn } from '../../../_lib/cn';
import type { MessageKey } from '../../../_lib/i18n';
import { assignCase, changeCaseSeverity, decideCase } from '../../../_lib/moderation-api';
import { AssignDialog } from './assign-dialog';
import { availableCaseActions, reasonCodesFor } from './case-actions-rules';
import { DecisionFields, parseDays, SeverityField, type DecisionChoice } from './decision-fields';
import { CASE_STATUS_KEY, REASON_CODE_KEY, SEVERITY_KEY } from './moderation-labels';

const DAY_MS = 24 * 60 * 60 * 1000;

type Dialog =
  | { kind: 'assign' }
  | { kind: 'severity' }
  | { kind: 'decide'; action: ModerationDecisionTypeT };

type Notice =
  | { kind: 'taken' }
  | { kind: 'assigned'; name: string }
  | { kind: 'severity'; severity: ModerationSeverityT }
  | { kind: 'decided'; status: ModerationCaseStatusT; deferred: boolean };

const DECISION_LABEL: Readonly<Record<ModerationDecisionTypeT, MessageKey>> = {
  no_action: 'admin.moderation.decision.dismiss',
  content_hidden: 'admin.moderation.decision.hide',
  content_removed: 'admin.moderation.decision.remove',
  warning: 'admin.moderation.decision.warn',
  suspended: 'admin.moderation.decision.suspend',
};

const DECISION_EFFECT: Readonly<Record<ModerationDecisionTypeT, MessageKey>> = {
  no_action: 'admin.moderation.effect.no_action',
  content_hidden: 'admin.moderation.effect.content_hidden',
  content_removed: 'admin.moderation.effect.content_removed',
  warning: 'admin.moderation.effect.warning',
  suspended: 'admin.moderation.effect.suspended',
};

export interface CaseDetailActionsProps {
  data: AdminModerationCaseDetailResponseT;
  /** Reloads the case without a loading flash; resolves false when the reload failed. */
  refresh: () => Promise<boolean>;
}

/**
 * Take, assign, change severity and decide, plus the result notice.
 *
 * Buttons are absent (not disabled) when role or state rules the action out;
 * see `availableCaseActions`. Hiding a button is not authorization: the API
 * decides, and its refusals (conflict of interest, protected role, a case that
 * moved under the operator) are worded through `describeActionFailure`.
 */
export function CaseDetailActions({ data, refresh }: CaseDetailActionsProps) {
  const t = useTranslate();
  const { user } = useAuth();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stale, setStale] = useState(false);
  const [severityChoice, setSeverityChoice] = useState<ModerationSeverityT | null>(null);
  const [decision, setDecision] = useState<DecisionChoice | null>(null);
  const [takeFailure, setTakeFailure] = useState<ActionFailure | null>(null);
  const [taking, setTaking] = useState(false);
  const takeGuard = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // The opener may be gone after the refresh (Take disappears), so focus moves to the result.
  useEffect(() => {
    if (notice !== null) noticeRef.current?.focus();
  }, [notice]);

  if (user === null) return null;
  const available = availableCaseActions(user, data);
  const hasButtons =
    available.take || available.assignOther || available.changeSeverity || available.decisions.length > 0;
  if (!hasButtons && notice === null && dialog === null && takeFailure === null) return null;

  const reasonCodes = reasonCodesFor(data.reports.map((report) => report.reasonGroup));
  // `moderation_actions` is append-only, so a wrong category cannot be fixed later: a dismissal
  // starts on `other` (it never inherits the reporters' accusation), while a violation starts on
  // the category of the first report's group, which the moderator can still change.
  const defaultChoice = (next: Dialog): DecisionChoice => ({
    reasonCode: next.kind === 'decide' && next.action === 'no_action' ? 'other' : (reasonCodes[0] ?? 'other'),
    days: '7',
    closeCase: true,
  });

  const open = (next: Dialog, opener: HTMLElement) => {
    openerRef.current = opener;
    setNotice(null);
    setTakeFailure(null);
    setSeverityChoice(null);
    setDecision(defaultChoice(next));
    setDialog(next);
  };
  // Safari does not focus a button on click, so return focus explicitly.
  const dismiss = () => {
    setDialog(null);
    setTimeout(() => {
      if (openerRef.current?.isConnected === true) openerRef.current.focus();
    }, 0);
  };
  const reload = async () => setStale(!(await refresh()));
  const finish = (next: Notice) => {
    setDialog(null);
    setNotice(next);
    setStale(false);
    void reload();
  };

  const take = async () => {
    if (takeGuard.current) return;
    takeGuard.current = true;
    setTaking(true);
    setTakeFailure(null);
    setNotice(null);
    try {
      await assignCase(data.caseNumber, undefined, crypto.randomUUID());
      finish({ kind: 'taken' });
    } catch (error) {
      setTakeFailure(describeActionFailure(error, t));
    } finally {
      takeGuard.current = false;
      setTaking(false);
    }
  };

  const submit = async ({ reason, idempotencyKey }: ActionSubmitInput) => {
    if (dialog?.kind === 'severity' && severityChoice !== null) {
      const result = await changeCaseSeverity(data.caseNumber, severityChoice, reason, idempotencyKey);
      finish({ kind: 'severity', severity: result.severity });
    } else if (dialog?.kind === 'decide' && decision !== null) {
      const days = parseDays(decision.days);
      const result = await decideCase(
        data.caseNumber,
        {
          actionType: dialog.action,
          reasonCode: decision.reasonCode,
          reasonNote: reason,
          closeCase: decision.closeCase,
          confirm: true,
          ...(dialog.action === 'suspended' && days !== null
            ? { expiresAt: new Date(Date.now() + days * DAY_MS).toISOString() }
            : {}),
        },
        idempotencyKey,
      );
      finish({ kind: 'decided', status: result.status, deferred: result.sessionCutDeferred === true });
    }
  };

  const decideAction = dialog?.kind === 'decide' ? dialog.action : null;
  const irreversible = decideAction === 'content_removed';
  const fieldsValid =
    dialog?.kind === 'severity'
      ? severityChoice !== null
      : decideAction === 'suspended'
        ? decision !== null && parseDays(decision.days) !== null
        : true;
  const title =
    dialog?.kind === 'severity'
      ? t('admin.moderation.dialog.severity.title')
      : decideAction !== null
        ? t(DECISION_LABEL[decideAction])
        : t('admin.moderation.dialog.decide.title');
  const description =
    dialog?.kind === 'severity'
      ? t('admin.moderation.dialog.severity.effect')
      : decideAction !== null
        ? t(DECISION_EFFECT[decideAction])
        : t('admin.moderation.dialog.decide.effect');
  const summaryRows = [
    ...(dialog?.kind === 'severity' && severityChoice !== null
      ? [{ label: t('admin.moderation.dialog.severity.summary'), value: t(SEVERITY_KEY[severityChoice]) }]
      : []),
    ...(decideAction !== null && decision !== null
      ? [
          { label: t('admin.moderation.dialog.decide.summary.action'), value: t(DECISION_LABEL[decideAction]) },
          { label: t('admin.moderation.dialog.decide.summary.reasonCode'), value: t(REASON_CODE_KEY[decision.reasonCode]) },
          ...(decideAction === 'suspended' && parseDays(decision.days) !== null
            ? [
                {
                  label: t('admin.moderation.dialog.decide.summary.duration'),
                  value: t('admin.moderation.dialog.decide.daysCount', { count: parseDays(decision.days) ?? 0 }),
                },
              ]
            : []),
          {
            label: t('admin.moderation.dialog.decide.summary.closes'),
            value: t(decision.closeCase ? 'admin.moderation.dialog.decide.yes' : 'admin.moderation.dialog.decide.no'),
          },
        ]
      : []),
  ];

  const noticeText =
    notice === null
      ? ''
      : notice.kind === 'taken'
        ? t('admin.moderation.done.taken')
        : notice.kind === 'assigned'
          ? t('admin.moderation.done.assigned', { name: notice.name })
          : notice.kind === 'severity'
            ? t('admin.moderation.done.severity', { severity: t(SEVERITY_KEY[notice.severity]) })
            : notice.status === 'resolved'
              ? t('admin.moderation.done.decidedClosed', { status: t(CASE_STATUS_KEY[notice.status]) })
              : t('admin.moderation.done.decidedOpen');

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {hasButtons && (
        <div className="flex flex-wrap gap-2">
          {available.take && (
            <Button aria-busy={taking || undefined} disabled={taking} onClick={() => void take()}>
              {t('admin.moderation.assign')}
            </Button>
          )}
          {available.assignOther && (
            <Button variant="secondary" onClick={(event) => open({ kind: 'assign' }, event.currentTarget)}>
              {t('admin.moderation.action.assignOther')}
            </Button>
          )}
          {available.changeSeverity && (
            <Button variant="secondary" onClick={(event) => open({ kind: 'severity' }, event.currentTarget)}>
              {t('admin.moderation.action.changeSeverity')}
            </Button>
          )}
          {available.decisions.map((action) => (
            <Button
              key={action}
              variant={action === 'no_action' ? 'secondary' : 'danger'}
              onClick={(event) => open({ kind: 'decide', action }, event.currentTarget)}
            >
              {t(DECISION_LABEL[action])}
            </Button>
          ))}
        </div>
      )}

      {takeFailure !== null && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          <span>{takeFailure.text}</span>
          {takeFailure.conflict && (
            <Button variant="ghost" size="sm" onClick={() => void reload()}>
              {t('admin.action.refresh')}
            </Button>
          )}
        </p>
      )}

      {notice !== null && (
        <>
          <div
            ref={noticeRef}
            role="status"
            tabIndex={-1}
            className="flex flex-wrap items-center gap-x-4 rounded-md bg-success-subtle px-3 py-1 text-sm font-medium text-success-text outline-none"
          >
            <span>{noticeText}</span>
            <Link
              href={`/audit-log?entityType=moderation_case&entityId=${encodeURIComponent(data.id)}`}
              className="inline-flex min-h-11 items-center underline"
            >
              {t('admin.action.history')}
            </Link>
          </div>
          {notice.kind === 'decided' && notice.deferred && (
            <p
              role="alert"
              className={cn('rounded-md border border-warning-text bg-warning-subtle p-3 text-sm font-semibold text-warning-text')}
            >
              {t('admin.action.sessionCutDeferred')}
            </p>
          )}
        </>
      )}

      {stale && notice !== null && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
          <span>{t('admin.moderation.done.stale')}</span>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            {t('admin.action.reload')}
          </Button>
        </p>
      )}

      <AssignDialog
        open={dialog?.kind === 'assign'}
        onClose={dismiss}
        caseNumber={data.caseNumber}
        onAssigned={(name) => finish({ kind: 'assigned', name: `@${name}` })}
        onRefresh={() => void reload()}
      />

      <ActionDialog
        open={dialog?.kind === 'severity' || dialog?.kind === 'decide'}
        onClose={dismiss}
        title={title}
        description={description}
        hint={t(
          dialog?.kind === 'severity'
            ? 'admin.moderation.dialog.severity.hint'
            : 'admin.moderation.dialog.decide.hint',
        )}
        hintPlacement="label"
        target={{
          name: data.target.currentExcerpt ?? data.target.id.slice(0, 8),
          identifier: String(data.caseNumber),
        }}
        targetLabel={t('admin.moderation.action.target')}
        identifierPrefix="#"
        requireRetype={irreversible}
        irreversible={irreversible}
        tone={decideAction === null || decideAction === 'no_action' ? 'primary' : 'danger'}
        confirmLabel={
          dialog?.kind === 'severity'
            ? t('admin.moderation.dialog.severity.confirm')
            : decideAction !== null
              ? t(DECISION_LABEL[decideAction])
              : t('admin.moderation.dialog.decide.confirm')
        }
        fieldsValid={fieldsValid}
        fields={
          dialog?.kind === 'severity' ? (
            <SeverityField current={data.severity} value={severityChoice} onChange={setSeverityChoice} />
          ) : decideAction !== null && decision !== null ? (
            <DecisionFields action={decideAction} reasonCodes={reasonCodes} value={decision} onChange={setDecision} />
          ) : undefined
        }
        summaryRows={summaryRows}
        onSubmit={submit}
        onRefresh={() => void reload()}
      />
    </div>
  );
}
