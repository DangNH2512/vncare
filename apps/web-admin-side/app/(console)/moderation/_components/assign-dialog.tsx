'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminUserListItemT } from '@dnc/contracts';

import { describeActionFailure, type ActionFailure } from '../../../_components/action-dialog';
import { useTranslate } from '../../../_components/locale-provider';
import { roleLabelKey } from '../../../_lib/roles';
import { Button, Dialog, MetricHint, Select } from '../../../_components/ui';
import { assignCase, listAssignableStaff } from '../../../_lib/moderation-api';

type Staff = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; people: AdminUserListItemT[] };

export interface AssignDialogProps {
  open: boolean;
  onClose: () => void;
  caseNumber: number;
  /** Called after the API accepted the assignment, with the new owner's handle. */
  onAssigned: (handle: string) => void;
  onRefresh: () => void;
}

/**
 * Administrator hands a case to another staff member. Assigning carries no
 * free-text reason (the API records "assigned by an administrator"), so this
 * is a plain picker rather than the reasoned `ActionDialog`.
 */
export function AssignDialog({ open, onClose, caseNumber, onAssigned, onRefresh }: AssignDialogProps) {
  const t = useTranslate();
  const [staff, setStaff] = useState<Staff>({ kind: 'loading' });
  const [choice, setChoice] = useState<string[]>([]);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guard = useRef(false);
  const key = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setChoice([]);
      setFailure(null);
      setSubmitting(false);
      setStaff({ kind: 'loading' });
      guard.current = false;
      key.current = null;
      return undefined;
    }
    let current = true;
    listAssignableStaff()
      .then((page) => current && setStaff({ kind: 'ready', people: page.items }))
      .catch(() => current && setStaff({ kind: 'error' }));
    return () => {
      current = false;
    };
  }, [open]);

  const person = staff.kind === 'ready' ? staff.people.find((item) => item.id === choice[0]) : undefined;

  const confirm = async () => {
    if (guard.current || person === undefined) return;
    guard.current = true;
    key.current ??= crypto.randomUUID();
    setSubmitting(true);
    setFailure(null);
    try {
      await assignCase(caseNumber, person.id, key.current);
      onAssigned(person.handle);
    } catch (error) {
      setFailure(describeActionFailure(error, t));
      guard.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('admin.moderation.dialog.assign.title')}
      description={t('admin.moderation.dialog.assign.effect')}
      closeLabel={t('admin.action.closeLabel')}
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" disabled={submitting} onClick={onClose}>
            {t('admin.action.review.cancel')}
          </Button>
          {failure?.conflict === true ? (
            <Button
              onClick={() => {
                onRefresh();
                onClose();
              }}
            >
              {t('admin.action.refresh')}
            </Button>
          ) : (
            <Button disabled={person === undefined || submitting} aria-busy={submitting || undefined} onClick={() => void confirm()}>
              {submitting ? t('admin.action.working') : t('admin.moderation.dialog.assign.confirm')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex justify-end">
          <MetricHint label={t('admin.action.hintLabel')} hint={t('admin.moderation.dialog.assign.hint')} />
        </div>
        {staff.kind === 'loading' && (
          <p aria-live="polite" className="text-sm text-fg-muted">
            {t('admin.moderation.dialog.assign.loading')}
          </p>
        )}
        {staff.kind === 'error' && (
          <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger-text">
            {t('admin.moderation.dialog.assign.error')}
          </p>
        )}
        {staff.kind === 'ready' && (
          <Select
            multiple={false}
            label={t('admin.moderation.dialog.assign.staff')}
            placeholder={t('admin.moderation.dialog.assign.choose')}
            options={staff.people.map((item) => {
              const roleKey = roleLabelKey(item.role);
              return {
                value: item.id,
                label: `@${item.handle}${roleKey === undefined ? '' : ` · ${t(roleKey)}`}`,
              };
            })}
            value={choice}
            onChange={setChoice}
            clearLabel={t('admin.moderation.filter.clearSelection')}
            keyboardHint={t('admin.common.select.keyboardHint')}
          />
        )}
        {failure !== null && (
          <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger-text">
            {failure.text}
          </p>
        )}
      </div>
    </Dialog>
  );
}
