'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminUserDetailResponseT, AssignableRoleT } from '@dnc/contracts';
import { isStaffRole } from '@dnc/domain';

import { ActionDialog, type ActionSubmitInput } from '../../../_components/action-dialog';
import { useAuth } from '../../../_components/auth-provider';
import { ROLE_KEY } from '../../../_components/labels/user-labels';
import { useTranslate } from '../../../_components/locale-provider';
import { Button } from '../../../_components/ui';
import { changeUserRole, suspendUser, unsuspendUser } from '../../../_lib/actions-api';
import { cn } from '../../../_lib/cn';
import type { MessageKey } from '../../../_lib/i18n';
import { availableUserActions, roleOptions } from './user-detail-actions-rules';

type DialogKind = 'suspendUser' | 'unsuspendUser' | 'changeRole';

interface Notice {
  kind: DialogKind;
  role?: AssignableRoleT;
  deferred: boolean;
}

const DONE_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendUser: 'admin.action.done.suspendUser',
  unsuspendUser: 'admin.action.done.unsuspendUser',
  changeRole: 'admin.action.done.changeRole',
};

const EFFECT_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendUser: 'admin.action.suspendUserEffect',
  unsuspendUser: 'admin.action.unsuspendUserEffect',
  changeRole: 'admin.action.changeRoleEffect',
};

const HINT_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendUser: 'admin.action.hint.suspendUser',
  unsuspendUser: 'admin.action.hint.unsuspendUser',
  changeRole: 'admin.action.hint.changeRole',
};

const TITLE_KEY: Readonly<Record<DialogKind, MessageKey>> = {
  suspendUser: 'admin.action.suspendUser',
  unsuspendUser: 'admin.action.unsuspendUser',
  changeRole: 'admin.action.changeRole',
};

export interface UserDetailActionsProps {
  data: AdminUserDetailResponseT;
  /** Reloads the detail without a loading flash, so the buttons keep their place. */
  refresh: () => Promise<void>;
}

/**
 * Suspend, restore and change-role buttons for one user, plus the result notice.
 *
 * Renders nothing when the signed-in staff member has no action to offer and
 * no result to show. The buttons are absent (not disabled) when role or state
 * rules out the action; see `availableUserActions`.
 */
export function UserDetailActions({ data, refresh }: UserDetailActionsProps) {
  const t = useTranslate();
  const { user } = useAuth();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [roleChoice, setRoleChoice] = useState<AssignableRoleT | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // The button that opened the dialog may be gone after the refresh (Suspend
  // becomes Restore), so focus lands on the result message instead.
  useEffect(() => {
    if (notice !== null) noticeRef.current?.focus();
  }, [notice]);

  if (user === null) return null;
  const available = availableUserActions(user, data);
  const handle = data.profile.handle;
  const target = { name: data.profile.displayName, identifier: handle };

  const open = (kind: DialogKind, opener: HTMLElement) => {
    openerRef.current = opener;
    setNotice(null);
    setRoleChoice(null);
    setDialog(kind);
  };
  // Dismissing returns focus to the opener explicitly: Safari does not focus a
  // button on click, so the dialog's own focus restoration has nothing to return to.
  const dismiss = () => {
    setDialog(null);
    setTimeout(() => {
      if (openerRef.current?.isConnected === true) openerRef.current.focus();
    }, 0);
  };
  const finish = (next: Notice) => {
    setDialog(null);
    setNotice(next);
    void refresh();
  };

  const submit = async ({ reason, idempotencyKey }: ActionSubmitInput) => {
    if (dialog === 'suspendUser' || dialog === 'unsuspendUser') {
      const act = dialog === 'suspendUser' ? suspendUser : unsuspendUser;
      const result = await act(data.id, reason, idempotencyKey);
      finish({ kind: dialog, deferred: result.sessionCutDeferred === true });
    } else if (dialog === 'changeRole' && roleChoice !== null) {
      const result = await changeUserRole(data.id, roleChoice, reason, idempotencyKey);
      finish({ kind: 'changeRole', role: roleChoice, deferred: result.sessionCutDeferred === true });
    }
  };

  const hasButtons = available.suspend || available.unsuspend || available.changeRole;
  if (!hasButtons && notice === null && dialog === null) return null;

  const currentRole = data.account.role;
  const options = roleOptions(currentRole, data.trust.trustLevel);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {hasButtons && (
        <div className="flex flex-wrap gap-2">
          {available.suspend && (
            <Button variant="danger" onClick={(event) => open('suspendUser', event.currentTarget)}>
              {t('admin.action.suspendUser')}
            </Button>
          )}
          {available.unsuspend && (
            <Button variant="secondary" onClick={(event) => open('unsuspendUser', event.currentTarget)}>
              {t('admin.action.unsuspendUser')}
            </Button>
          )}
          {available.changeRole && (
            <Button variant="secondary" onClick={(event) => open('changeRole', event.currentTarget)}>
              {t('admin.action.changeRole')}
            </Button>
          )}
        </div>
      )}

      {notice !== null && (
        <>
          <div
            ref={noticeRef}
            role="status"
            tabIndex={-1}
            className="flex flex-wrap items-center gap-x-4 rounded-md bg-success-subtle px-3 py-1 text-sm font-medium text-success-text outline-none"
          >
            <span>
              {t(DONE_KEY[notice.kind], {
                role: notice.role === undefined ? '' : t(ROLE_KEY[notice.role]),
              })}
            </span>
            <Link
              href={`/audit-log?entityType=user&entityId=${encodeURIComponent(data.id)}`}
              className="inline-flex min-h-11 items-center underline"
            >
              {t('admin.action.history')}
            </Link>
          </div>
          {notice.deferred && (
            <p
              role="alert"
              className={cn(
                'rounded-md border border-warning-text bg-warning-subtle p-3 text-sm font-semibold text-warning-text',
              )}
            >
              {t('admin.action.sessionCutDeferred')}
            </p>
          )}
        </>
      )}

      <ActionDialog
        open={dialog !== null}
        onClose={dismiss}
        title={t(dialog === null ? 'admin.action.suspendUser' : TITLE_KEY[dialog])}
        description={t(dialog === null ? 'admin.action.suspendUserEffect' : EFFECT_KEY[dialog])}
        hint={t(dialog === null ? 'admin.action.hint.suspendUser' : HINT_KEY[dialog])}
        target={target}
        // Staff accounts and role changes ask for the username again (D-R2).
        requireRetype={dialog === 'changeRole' || (dialog === 'suspendUser' && isStaffRole(currentRole))}
        tone={dialog === 'suspendUser' ? 'danger' : 'primary'}
        confirmLabel={t(dialog === null ? 'admin.action.suspendUser' : TITLE_KEY[dialog])}
        fieldsValid={dialog !== 'changeRole' || roleChoice !== null}
        fields={
          dialog === 'changeRole' ? (
            <fieldset className="flex min-w-0 flex-col gap-1">
              <legend className="mb-1 text-sm font-medium text-fg">{t('admin.action.role.label')}</legend>
              {options.map((option) => (
                <label
                  key={option.role}
                  className={cn(
                    'flex min-h-11 items-center gap-2 text-sm text-fg',
                    option.needsTrust ? 'opacity-60' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="new-role"
                    value={option.role}
                    disabled={option.needsTrust}
                    checked={roleChoice === option.role}
                    onChange={() => setRoleChoice(option.role)}
                    className="size-4 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span>{t(ROLE_KEY[option.role])}</span>
                  {option.needsTrust && (
                    <span className="text-xs text-fg-muted">{t('admin.action.role.trustRequired')}</span>
                  )}
                </label>
              ))}
            </fieldset>
          ) : undefined
        }
        summaryRows={
          dialog === 'changeRole' && roleChoice !== null
            ? [
                {
                  label: t('admin.action.review.role'),
                  value: t('admin.action.review.change', {
                    from: t(ROLE_KEY[currentRole]),
                    to: t(ROLE_KEY[roleChoice]),
                  }),
                },
              ]
            : []
        }
        onSubmit={submit}
        onRefresh={() => void refresh()}
      />
    </div>
  );
}
