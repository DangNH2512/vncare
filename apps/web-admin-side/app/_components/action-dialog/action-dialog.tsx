'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button, Dialog, Input, MetricHint } from '../ui';
import { useTranslate } from '../locale-provider';
import { describeActionFailure, type ActionFailure } from './error-text';
import { isReasonValid, ReasonField } from './reason-field';

export interface ActionSubmitInput {
  /** Trimmed, 20 to 255 characters. */
  reason: string;
  /** Created per opening and reused on retry. Reserved: the API does not deduplicate on it yet. */
  idempotencyKey: string;
}

export interface SummaryRow {
  label: string;
  value: ReactNode;
}

export interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One line on what the action does to the target. */
  description: string;
  /** Longer rules and consequences, shown behind the info trigger. */
  hint: string;
  /**
   * Where the info trigger sits. `row` (default) is its own right-aligned row
   * above the form; `label` puts it beside the reason label on step 1 and
   * leaves step 2, which has no form, without a trigger.
   */
  hintPlacement?: 'row' | 'label';
  /** Who the action is about; `identifier` is what step 2 may ask to retype. */
  target: { name: string; identifier: string };
  /** Label of the target row on the review step. Defaults to "Account". */
  targetLabel?: string;
  /** Shown before the identifier and ignored when typed: `@` for a username, `''` for an event slug. */
  identifierPrefix?: string;
  /** Step 2 asks the operator to type `target.identifier` again. */
  requireRetype: boolean;
  /** Extra step-1 fields (a role picker); the owner keeps their state. */
  fields?: ReactNode;
  /** False keeps "Continue" disabled until the extra fields are filled. */
  fieldsValid?: boolean;
  /** Rows between the target and the reason on the review step. */
  summaryRows?: readonly SummaryRow[];
  irreversible?: boolean;
  /** `danger` for actions that cut access, `primary` for the restoring ones. */
  tone?: 'danger' | 'primary';
  confirmLabel: string;
  /** Performs the request; reject with the `ApiError` so the dialog can word it. */
  onSubmit: (input: ActionSubmitInput) => Promise<void>;
  /** Reload the data behind the dialog; offered after a 409. */
  onRefresh: () => void;
}

/** Removes the configured prefix, and only that one, from what the operator typed. */
function stripPrefix(value: string, prefix: string): string {
  const trimmed = value.trim();
  return prefix !== '' && trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

/**
 * Two-step confirmation for a staff action with side effects.
 *
 * Step 1 collects the reason (and any extra fields); step 2 summarises what is
 * about to happen and, for irreversible or staff-affecting actions, asks for
 * the target's identifier again. Both buttons stay disabled until the input is
 * valid, and a ref guard blocks a second submit before React re-renders. The
 * UI guard is not the safety net: the API enforces the same rules. The
 * `Idempotency-Key` header is reserved; the API does not deduplicate on it yet.
 */
export function ActionDialog({
  open,
  onClose,
  title,
  description,
  hint,
  hintPlacement = 'row',
  target,
  targetLabel,
  identifierPrefix = '@',
  requireRetype,
  fields,
  fieldsValid = true,
  summaryRows = [],
  irreversible = false,
  tone = 'danger',
  confirmLabel,
  onSubmit,
  onRefresh,
}: ActionDialogProps) {
  const t = useTranslate();
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const body = useRef<HTMLDivElement>(null);

  // Children of the dialog unmount on close; reset what lives here too.
  useEffect(() => {
    if (open) return;
    setStep(1);
    setReason('');
    setTyped('');
    setFailure(null);
    setSubmitting(false);
    submitGuard.current = false;
    idempotencyKey.current = null;
  }, [open]);

  // The native dialog focuses its first control (the close button) on open;
  // move to the field the operator needs. Deferred: showModal() runs in the
  // Dialog's own effect, after this component's first render of the step.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      body.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open, step]);

  const handleMatches = stripPrefix(typed, identifierPrefix) === target.identifier;
  const canContinue = isReasonValid(reason) && fieldsValid;
  const canConfirm = !submitting && canContinue && (!requireRetype || handleMatches);

  const confirm = useCallback(async () => {
    if (submitGuard.current || !canConfirm) return;
    submitGuard.current = true;
    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    setFailure(null);
    try {
      await onSubmit({ reason: reason.trim(), idempotencyKey: idempotencyKey.current });
    } catch (error) {
      setFailure(describeActionFailure(error, t));
      submitGuard.current = false;
      setSubmitting(false);
    }
    // On success the owner closes the dialog, which resets this state.
  }, [canConfirm, onSubmit, reason, t]);

  const footer =
    step === 1 ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          {t('admin.action.review.cancel')}
        </Button>
        <Button disabled={!canContinue} onClick={() => setStep(2)}>
          {t('admin.action.next')}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" disabled={submitting} onClick={() => setStep(1)}>
          {t('admin.action.back')}
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
          <Button
            variant={tone}
            disabled={!canConfirm}
            aria-busy={submitting || undefined}
            onClick={() => void confirm()}
          >
            {submitting ? t('admin.action.working') : confirmLabel}
          </Button>
        )}
      </>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={step === 1 ? description : t('admin.action.review.title')}
      closeLabel={t('admin.action.closeLabel')}
      dismissible={!submitting}
      footer={footer}
    >
      <div ref={body} className="flex min-w-0 flex-col gap-4">
        {hintPlacement === 'row' && (
          <div className="flex justify-end">
            <MetricHint label={t('admin.action.hintLabel')} hint={hint} />
          </div>
        )}

        {step === 1 ? (
          <>
            {fields}
            <ReasonField
              value={reason}
              onChange={setReason}
              {...(hintPlacement === 'label'
                ? { labelAddon: <MetricHint label={t('admin.action.hintLabel')} hint={hint} /> }
                : {})}
            />
          </>
        ) : (
          <>
            <dl
              {...(requireRetype ? {} : { 'data-autofocus': true, tabIndex: -1 })}
              className="flex min-w-0 flex-col gap-2 text-sm outline-none"
            >
              <SummaryItem label={targetLabel ?? t('admin.action.target')}>
                <span className="font-medium">{target.name}</span>{' '}
                <span translate="no" className="font-mono text-fg-muted">
                  {identifierPrefix}{target.identifier}
                </span>
              </SummaryItem>
              {summaryRows.map((row) => (
                <SummaryItem key={row.label} label={row.label}>
                  {row.value}
                </SummaryItem>
              ))}
              <SummaryItem label={t('admin.action.reason.label')}>
                <span className="whitespace-pre-wrap">{reason.trim()}</span>
              </SummaryItem>
            </dl>
            {irreversible && (
              <p className="text-sm font-medium text-danger-text">{t('admin.action.irreversible')}</p>
            )}
            {requireRetype && (
              <Input
                data-autofocus
                label={t('admin.action.typeToConfirm', { value: `${identifierPrefix}${target.identifier}` })}
                value={typed}
                disabled={submitting}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canConfirm) {
                    event.preventDefault();
                    void confirm();
                  }
                }}
              />
            )}
            {failure !== null && (
              <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger-text">
                {failure.text}
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="text-xs font-medium text-fg-subtle sm:w-24 sm:shrink-0 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-fg">{children}</dd>
    </div>
  );
}
