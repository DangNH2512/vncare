'use client';

import { useId, useRef, useState } from 'react';
import { ReportReason, type ReportReasonT, type ReportTargetTypeT } from '@dnc/contracts';
import { ALSO_BLOCK_DEFAULT_REASONS, REPORT_DESCRIPTION_MAX_LENGTH } from '@dnc/domain';
import type { MessageKey } from '@dnc/i18n';

import { Button, Dialog, Textarea } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { ApiError, createReport } from '../../../_lib/api';
import { cn } from '../../../_lib/cn';
import { INTL_LOCALE } from '../../../_lib/i18n';

const TITLE: Readonly<Record<ReportTargetTypeT, MessageKey>> = {
  event: 'safety.report.title.event',
  post: 'safety.report.title.post',
  comment: 'safety.report.title.comment',
  user: 'safety.report.title.user',
};

/** Display order is the contract's order (doc 05 §16.1): most urgent first. */
const REASONS: readonly ReportReasonT[] = ReportReason.options;

interface SubmitFailure {
  key: MessageKey;
  /** False when sending the same thing again cannot succeed (429, 404, 422...). */
  retryable: boolean;
}

/**
 * Maps a failed submit onto a message the reporter can act on.
 *
 * Mapped by status rather than by echoing `messageKey`: an unknown key would
 * render raw, and every status the endpoint documents has a catalogued string.
 */
function describeFailure(cause: unknown): SubmitFailure {
  if (!(cause instanceof ApiError)) return { key: 'safety.report.errorGeneric', retryable: true };
  if (cause.isOffline) return { key: 'safety.report.errorOffline', retryable: true };
  switch (cause.status) {
    case 400:
      return cause.messageKey === 'errors.report.descriptionTooLong'
        ? { key: 'errors.report.descriptionTooLong', retryable: false }
        : { key: 'safety.report.errorGeneric', retryable: true };
    case 401:
      return { key: 'errors.auth.unauthenticated', retryable: false };
    case 404:
      return { key: 'errors.report.targetNotFound', retryable: false };
    case 422:
      return { key: 'errors.report.selfNotAllowed', retryable: false };
    case 429:
      return { key: 'errors.report.rateLimited', retryable: false };
    default:
      return { key: 'safety.report.errorGeneric', retryable: true };
  }
}

export interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetTypeT;
  targetId: string;
  /**
   * Runs after the sheet closes on a filed report. Deferred to the close
   * rather than the 201 so a parent that removes the reported item (the feed
   * does, when "also block" was ticked) cannot unmount the confirmation
   * before it has been read.
   */
  onReported?: (outcome: { alsoBlocked: boolean }) => void;
}

/**
 * The report flow: pick one of the twelve reasons, optionally say more,
 * optionally block the person, send.
 *
 * Reports are the safety channel, so the sheet is forgiving by design: a
 * failed send keeps everything typed, a retry reuses the same idempotency key
 * (one report, however many taps), and "someone is in danger" puts the
 * emergency numbers first — the platform is not an emergency service.
 */
export function ReportSheet({ open, onClose, targetType, targetId, onReported }: ReportSheetProps) {
  const t = useTranslate();
  // Set by the form on a 201 and consumed on close; a ref because nothing
  // renders from it and the form unmounts with the dialog.
  const outcome = useRef<{ alsoBlocked: boolean } | null>(null);

  const close = () => {
    const filed = outcome.current;
    outcome.current = null;
    onClose();
    if (filed !== null) onReported?.(filed);
  };

  return (
    <Dialog open={open} onClose={close} title={t(TITLE[targetType])}>
      <ReportForm
        targetType={targetType}
        targetId={targetId}
        onFiled={(filed) => {
          outcome.current = filed;
        }}
        onClose={close}
      />
    </Dialog>
  );
}

interface ReportFormProps {
  targetType: ReportTargetTypeT;
  targetId: string;
  onFiled: (outcome: { alsoBlocked: boolean }) => void;
  onClose: () => void;
}

/** Mounted fresh on every opening (see Dialog), so the key below is per-opening. */
function ReportForm({ targetType, targetId, onFiled, onClose }: ReportFormProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const legendId = useId();

  // One key per opening, reused by every retry of this opening (AC-8).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState<ReportReasonT | null>(null);
  const [description, setDescription] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SubmitFailure | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pickReason = (next: ReportReasonT) => {
    setReason(next);
    // The default follows the reason (AC-4): harassment starts ticked.
    setAlsoBlock(ALSO_BLOCK_DEFAULT_REASONS.includes(next));
    setFailure(null);
  };

  const submit = async () => {
    if (reason === null || submitting) return;
    setSubmitting(true);
    setFailure(null);
    const trimmed = description.trim();
    try {
      await createReport(
        {
          targetType,
          targetId,
          reason,
          alsoBlock,
          ...(trimmed === '' ? {} : { description: trimmed }),
        },
        idempotencyKey,
      );
      onFiled({ alsoBlocked: alsoBlock });
      setSubmitted(true);
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div className="rounded-md bg-success-subtle px-4 py-3 text-success-text">
          <p className="font-semibold">{t('safety.report.submitted')}</p>
          <p className="mt-1 text-sm">{t('safety.report.submittedBody')}</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>{t('safety.report.close')}</Button>
        </div>
      </div>
    );
  }

  const counter = t('safety.report.descriptionCounter', {
    count: description.length.toLocaleString(INTL_LOCALE[locale]),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {/* First thing in the sheet once "danger" is picked, before the
          description (AC-3): someone in danger needs 113/115, not a form. */}
      {reason === 'danger' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-danger-text/30 bg-danger-subtle px-4 py-3 text-danger-text"
        >
          <p className="text-sm font-semibold">{t('safety.report.emergency_first')}</p>
          <div className="flex flex-wrap gap-2">
            {['113', '115'].map((number) => (
              <a
                key={number}
                href={`tel:${number}`}
                className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-md bg-danger-text px-4 text-md font-bold text-surface sm:min-h-9"
              >
                {number}
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-fg-muted">{t('safety.report.reassurance')}</p>

      <fieldset aria-labelledby={legendId} className="flex min-w-0 flex-col gap-2">
        <legend id={legendId} className="mb-2 text-sm font-medium text-fg">
          {t('safety.report.reasonLabel')}
        </legend>
        {REASONS.map((code) => (
          <label
            key={code}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
              reason === code
                ? 'border-accent bg-accent-subtle text-fg'
                : 'border-line hover:border-line-strong hover:bg-surface-sunken',
            )}
          >
            <input
              type="radio"
              name="report-reason"
              value={code}
              checked={reason === code}
              onChange={() => pickReason(code)}
              className="size-4 shrink-0 accent-accent"
            />
            <span className="min-w-0 break-words">{t(`safety.report.reason.${code}`)}</span>
          </label>
        ))}
      </fieldset>

      {reason !== null && (
        <>
          <Textarea
            label={t('safety.report.descriptionLabel')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            rows={4}
            counter={counter}
          />

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(event) => setAlsoBlock(event.target.checked)}
              className="size-4 shrink-0 accent-accent"
            />
            {t('safety.report.alsoBlock')}
          </label>
        </>
      )}

      {failure !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text"
        >
          <span className="min-w-0">{t(failure.key)}</span>
          {failure.retryable && (
            <Button variant="danger" size="sm" onClick={() => void submit()} disabled={submitting}>
              {t('common.retry')}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          {t('safety.block.cancel')}
        </Button>
        <Button type="submit" disabled={reason === null || submitting}>
          {submitting ? t('safety.report.submitting') : t('safety.report.submit')}
        </Button>
      </div>
    </form>
  );
}
