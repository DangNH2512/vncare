'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminEventDetailResponseT, EventStatusT } from '@dnc/contracts';

import { ActionDialog, type ActionSubmitInput } from '../../../_components/action-dialog';
import { useAuth } from '../../../_components/auth-provider';
import { EVENT_STATUS_LABEL_KEY } from '../../../_components/labels/event-labels';
import { useTranslate } from '../../../_components/locale-provider';
import { Button } from '../../../_components/ui';
import { actOnEvent, type EventAction } from '../../../_lib/actions-api';
import type { MessageKey } from '../../../_lib/i18n';
import { availableEventActions } from './event-detail-actions-rules';

type DialogKind = 'suspendEvent' | 'restoreEvent' | 'takeDownEvent';

const ACTION: Readonly<Record<DialogKind, EventAction>> = {
  suspendEvent: 'suspend',
  restoreEvent: 'restore',
  takeDownEvent: 'takedown',
};

const TITLE_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendEvent: 'admin.action.suspendEvent',
  restoreEvent: 'admin.action.restoreEvent',
  takeDownEvent: 'admin.action.takeDownEvent',
};

const EFFECT_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendEvent: 'admin.action.suspendEventEffect',
  restoreEvent: 'admin.action.restoreEventEffect',
  takeDownEvent: 'admin.action.takeDownEventEffect',
};

const HINT_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendEvent: 'admin.action.hint.suspendEvent',
  restoreEvent: 'admin.action.hint.restoreEvent',
  takeDownEvent: 'admin.action.hint.takeDownEvent',
};

const DONE_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendEvent: 'admin.action.done.suspendEvent',
  restoreEvent: 'admin.action.done.restoreEvent',
  takeDownEvent: 'admin.action.done.takeDownEvent',
};

interface Notice {
  kind: DialogKind;
  /** Status the API reports, not the one the UI expected. */
  status: EventStatusT;
}

export interface EventDetailActionsProps {
  data: AdminEventDetailResponseT;
  /** Reloads the detail without a loading flash. */
  /** Resolves false when the reload failed, so the page can say the status may be stale. */
  refresh: () => Promise<boolean>;
}

/**
 * Suspend, restore and take-down buttons for one event, plus the result notice.
 *
 * Buttons are absent (not disabled) when role or state rules the action out;
 * see `availableEventActions`. Take down is irreversible and asks for the slug
 * again. The notice names the status the API returned, since a restore can land
 * on "awaiting review" instead of "published".
 */
export function EventDetailActions({ data, refresh }: EventDetailActionsProps) {
  const t = useTranslate();
  const { user } = useAuth();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stale, setStale] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // The opener disappears once the status changes, so focus moves to the result.
  useEffect(() => {
    if (notice !== null) noticeRef.current?.focus();
  }, [notice]);

  if (user === null) return null;
  const available = availableEventActions(user, data);
  const hasButtons = available.suspend || available.restore || available.takeDown;
  if (!hasButtons && notice === null && dialog === null) return null;

  const open = (kind: DialogKind, opener: HTMLElement) => {
    openerRef.current = opener;
    setNotice(null);
    setDialog(kind);
  };
  // Safari does not focus a button on click, so return focus explicitly.
  const dismiss = () => {
    setDialog(null);
    setTimeout(() => {
      if (openerRef.current?.isConnected === true) openerRef.current.focus();
    }, 0);
  };

  const reload = async () => setStale(!(await refresh()));

  const submit = async ({ reason, idempotencyKey }: ActionSubmitInput) => {
    if (dialog === null) return;
    const result = await actOnEvent(data.id, ACTION[dialog], reason, idempotencyKey);
    setDialog(null);
    setNotice({ kind: dialog, status: result.status });
    setStale(false);
    void reload();
  };

  const kind = dialog ?? 'suspendEvent';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {hasButtons && (
        <div className="flex flex-wrap gap-2">
          {available.suspend && (
            <Button variant="secondary" onClick={(event) => open('suspendEvent', event.currentTarget)}>
              {t('admin.action.suspendEvent')}
            </Button>
          )}
          {available.restore && (
            <Button variant="secondary" onClick={(event) => open('restoreEvent', event.currentTarget)}>
              {t('admin.action.restoreEvent')}
            </Button>
          )}
          {available.takeDown && (
            <Button variant="danger" onClick={(event) => open('takeDownEvent', event.currentTarget)}>
              {t('admin.action.takeDownEvent')}
            </Button>
          )}
        </div>
      )}

      {notice !== null && (
        <div
          ref={noticeRef}
          role="status"
          tabIndex={-1}
          className="rounded-md bg-success-subtle px-3 py-1 text-sm font-medium text-success-text outline-none"
        >
          {t(DONE_KEY[notice.kind], { status: t(EVENT_STATUS_LABEL_KEY[notice.status]) })}
        </div>
      )}

      {stale && notice !== null && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
          <span>{t('admin.action.staleNotice')}</span>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            {t('admin.action.reload')}
          </Button>
        </p>
      )}

      <ActionDialog
        open={dialog !== null}
        onClose={dismiss}
        title={t(TITLE_KEY[kind])}
        description={t(EFFECT_KEY[kind])}
        hint={t(HINT_KEY[kind])}
        target={{ name: data.title, identifier: data.slug }}
        targetLabel={t('admin.action.targetEvent')}
        identifierPrefix=""
        requireRetype={kind === 'takeDownEvent'}
        irreversible={kind === 'takeDownEvent'}
        tone={kind === 'restoreEvent' ? 'primary' : 'danger'}
        confirmLabel={t(TITLE_KEY[kind])}
        onSubmit={submit}
        onRefresh={() => void reload()}
      />
    </div>
  );
}
