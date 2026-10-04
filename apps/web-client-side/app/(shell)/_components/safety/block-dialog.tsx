'use client';

import { useState } from 'react';
import type { MessageKey } from '@dnc/i18n';

import { Button, Dialog } from '../../../_components/ui';
import { useTranslate } from '../../../_components/locale-provider';
import { ApiError, blockUser } from '../../../_lib/api';

/**
 * Status → message for a failed block or unblock. Shared with the safety menu
 * and the blocked-people page so one failure reads the same everywhere.
 */
export function blockFailureKey(cause: unknown): MessageKey {
  if (!(cause instanceof ApiError)) return 'safety.block.error';
  if (cause.isOffline) return 'auth.error.offline';
  switch (cause.status) {
    case 401:
      return 'errors.auth.unauthenticated';
    case 404:
      return 'errors.profile.notFound';
    case 422:
      return 'errors.block.selfNotAllowed';
    default:
      return 'safety.block.error';
  }
}

export interface BlockDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Resolves the person's user id. A function rather than a value because an
   * event only names its organizer by handle, and the lookup should happen
   * when someone actually decides to block, not on every page view.
   */
  resolveUserId: () => Promise<string>;
  /** Runs only after the API answered 204 (AC-19). */
  onBlocked: () => void;
}

/** Confirmation step for a block: says what will happen, then does it. */
export function BlockDialog({ open, onClose, resolveUserId, onBlocked }: BlockDialogProps) {
  const t = useTranslate();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('safety.block.confirmTitle')}
      description={t('safety.block.confirmBody')}
      width="sm"
    >
      <BlockConfirm onClose={onClose} resolveUserId={resolveUserId} onBlocked={onBlocked} />
    </Dialog>
  );
}

function BlockConfirm({
  onClose,
  resolveUserId,
  onBlocked,
}: Omit<BlockDialogProps, 'open'>) {
  const t = useTranslate();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<MessageKey | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await blockUser(await resolveUserId());
      onBlocked();
      onClose();
    } catch (cause) {
      setFailure(blockFailureKey(cause));
      setBusy(false);
    }
  };

  return (
    <>
      {failure !== null && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {t(failure)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t('safety.block.cancel')}
        </Button>
        {/* The confirm button doubles as Retry after a failure; the state it
            leads to never changes until the API has said yes. */}
        <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
          {busy
            ? t('safety.block.working')
            : failure !== null
              ? t('common.retry')
              : t('safety.block.confirm')}
        </Button>
      </div>
    </>
  );
}
