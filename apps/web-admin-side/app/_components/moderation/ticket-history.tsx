'use client';

import type { ModerationActionResponseT } from '@dnc/contracts';

import { formatDateTime } from '../../_lib/datetime';
import { roleLabelKey } from '../../_lib/roles';
import { useTranslate } from '../locale-provider';
import { Badge, Button } from '../ui';
import { actionTypeLabel, FORM_KIND_LABEL_KEY, REASON_LABEL_KEY } from './labels';
import type { ActionPlan } from './ticket-actions';

/**
 * Action history of a ticket, its target and the target's owner, oldest
 * first (as the API returns it). Read-only: a row is never edited — undoing
 * a decision records a new row (AC-31), offered here as a button on the row
 * it would undo.
 *
 * Who acted: "System" for automatic lifts; for a moderator viewing another
 * staff member's action the API sends no identity (D14, AC-41), so only the
 * role at the time is shown.
 */
export function TicketHistory({
  actions,
  reversals,
  onReverse,
}: {
  actions: readonly ModerationActionResponseT[];
  reversals: ReadonlyMap<string, ActionPlan>;
  onReverse: (plan: ActionPlan) => void;
}) {
  const t = useTranslate();

  if (actions.length === 0) {
    return <p className="text-sm text-fg-muted">{t('admin.moderation.ticket.historyEmpty')}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {actions.map((action) => {
        const reversal = reversals.get(action.id);
        const roleKey = action.actor.role === null ? undefined : roleLabelKey(action.actor.role);
        return (
          <li
            key={action.id}
            className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">
                {actionTypeLabel(t, action.actionType, action.severityBefore, action.severityAfter)}
              </p>
              <time dateTime={action.createdAt} className="text-xs text-fg-muted">
                {formatDateTime(action.createdAt)}
              </time>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              {action.actor.type === 'system' ? (
                <span>{t('admin.moderation.ticket.actorSystem')}</span>
              ) : (
                <>
                  {action.actor.user !== null && (
                    <span className="text-fg">
                      {action.actor.user.displayName}{' '}
                      <span className="text-fg-muted">@{action.actor.user.handle}</span>
                    </span>
                  )}
                  {roleKey !== undefined && <Badge tone="accent">{t(roleKey)}</Badge>}
                </>
              )}
              {action.reasonCode !== null && (
                <Badge tone="neutral">{t(REASON_LABEL_KEY[action.reasonCode])}</Badge>
              )}
            </div>

            {action.suspendedUntil !== null && (
              <p className="text-sm text-fg-muted">
                {t('admin.moderation.ticket.suspendedUntil', {
                  time: formatDateTime(action.suspendedUntil),
                })}
              </p>
            )}

            {/* A system row's note is a fixed English sentence written by the
                database function; its label already says what happened, in the
                reader's language. Staff notes are the moderator's own words. */}
            {action.actor.type === 'staff' && (
              <p className="text-sm whitespace-pre-wrap break-words text-fg">{action.note}</p>
            )}

            {reversal !== undefined && (
              <div>
                <Button size="sm" variant="secondary" onClick={() => onReverse(reversal)}>
                  {t(FORM_KIND_LABEL_KEY[reversal.kind])}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
