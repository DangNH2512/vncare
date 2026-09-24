'use client';

import { useState } from 'react';
import {
  ReportReason,
  type ModerationActionResponseT,
  type ModerationSeverityT,
  type ReportReasonT,
} from '@dnc/contracts';
import { maxSuspensionDays, MODERATION_NOTE_MAX_LENGTH } from '@dnc/domain';

import {
  ApiError,
  changeTicketSeverity,
  dismissTicket,
  newIdempotencyKey,
  takeModerationAction,
} from '../../_lib/api';
import { useTranslate } from '../locale-provider';
import { Button, Dialog, Input, Select, Textarea } from '../ui';
import {
  apiErrorMessage,
  FORM_KIND_LABEL_KEY,
  REASON_LABEL_KEY,
  SEVERITIES_HIGH_FIRST,
  SEVERITY_LABEL_KEY,
} from './labels';
import {
  buildActionRequest,
  isNoteValid,
  noteLength,
  parseDurationDays,
  type ActionFormValues,
  type ActionPlan,
  type Viewer,
} from './ticket-actions';

export interface ActionDialogProps {
  /** The decision being taken; null keeps the dialog closed. */
  plan: ActionPlan | null;
  ticketId: string;
  ticketSeverity: ModerationSeverityT;
  /** True once the ticket is closed: the request then carries `followUp: true`. */
  followUp: boolean;
  viewer: Viewer;
  onClose: () => void;
  onDone: (result: ModerationActionResponseT) => void;
  /** Someone else closed the ticket first (409); the page reloads and says so. */
  onConflict: (message: string) => void;
}

/**
 * The one form behind every moderation decision (AC-30..AC-38).
 *
 * A reason and a note of at least 20 characters (trimmed, as the API counts
 * them) are mandatory everywhere; the submit button stays disabled until both
 * are there, and the API rejects the request anyway if they are not (AC-36).
 * Mounted fresh for each decision, so its idempotency key is generated
 * once per decision and survives retries of that decision.
 */
export function ActionDialog(props: ActionDialogProps) {
  const t = useTranslate();
  const { plan, onClose } = props;

  return (
    <Dialog
      open={plan !== null}
      onClose={onClose}
      title={plan === null ? '' : t(FORM_KIND_LABEL_KEY[plan.kind])}
    >
      {plan !== null && <ActionForm key={`${plan.kind}:${plan.targetId}`} {...props} plan={plan} />}
    </Dialog>
  );
}

function ActionForm({
  plan,
  ticketId,
  ticketSeverity,
  followUp,
  viewer,
  onClose,
  onDone,
  onConflict,
}: ActionDialogProps & { plan: ActionPlan }) {
  const t = useTranslate();
  const [values, setValues] = useState<ActionFormValues>({
    reasonCode: '',
    note: '',
    durationDays: '',
  });
  const [severity, setSeverity] = useState<ModerationSeverityT | ''>('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDays = maxSuspensionDays(viewer.role);
  const durationDays =
    plan.kind === 'suspend_user' ? parseDurationDays(values.durationDays, viewer.role) : null;

  const valid =
    values.reasonCode !== '' &&
    isNoteValid(values.note) &&
    (plan.kind !== 'suspend_user' || durationDays !== null) &&
    (plan.kind !== 'changeSeverity' || (severity !== '' && severity !== ticketSeverity));

  const close = () => {
    if (!submitting) onClose();
  };

  const submit = async () => {
    if (!valid || submitting || values.reasonCode === '') return;
    setSubmitting(true);
    setError(null);
    const reasonCode = values.reasonCode;
    const note = values.note.trim();

    try {
      let result: ModerationActionResponseT;
      if (plan.kind === 'dismiss') {
        result = await dismissTicket(ticketId, { reasonCode, note }, idempotencyKey);
      } else if (plan.kind === 'changeSeverity') {
        if (severity === '') return;
        result = await changeTicketSeverity(ticketId, { severity, reasonCode, note }, idempotencyKey);
      } else {
        result = await takeModerationAction(
          buildActionRequest(plan, { reasonCode, note, durationDays }, ticketId, followUp),
          idempotencyKey,
        );
      }
      onDone(result);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'TICKET_ALREADY_CLOSED') {
        onConflict(apiErrorMessage(t, caught, 'errors.moderation.ticketAlreadyClosed'));
        return;
      }
      // A definitive refusal (4xx) settles this attempt; the next submit is a
      // new decision with a new key. Offline or 5xx: keep the key, so the
      // retry resolves to the first attempt if it did land.
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500) {
        setIdempotencyKey(newIdempotencyKey());
      }
      setError(apiErrorMessage(t, caught, 'admin.moderation.form.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = ReportReason.options.map((reason: ReportReasonT) => ({
    value: reason,
    label: t(REASON_LABEL_KEY[reason]),
  }));
  const severityOptions = SEVERITIES_HIGH_FIRST.filter((value) => value !== ticketSeverity).map(
    (value) => ({ value, label: t(SEVERITY_LABEL_KEY[value]) }),
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {plan.kind === 'changeSeverity' && (
        <Select
          label={t('admin.moderation.form.severity')}
          placeholder="—"
          options={severityOptions}
          value={severity}
          required
          disabled={submitting}
          onChange={(event) => {
            const next = SEVERITIES_HIGH_FIRST.find((value) => value === event.target.value);
            setSeverity(next ?? '');
          }}
        />
      )}

      <Select
        label={t('admin.moderation.form.reason')}
        placeholder="—"
        options={reasonOptions}
        value={values.reasonCode}
        required
        disabled={submitting}
        onChange={(event) => {
          const next = ReportReason.options.find(
            (reason: ReportReasonT) => reason === event.target.value,
          );
          setValues((current) => ({ ...current, reasonCode: next ?? '' }));
        }}
      />

      {plan.kind === 'suspend_user' && (
        <Input
          label={t('admin.moderation.form.duration')}
          type="number"
          inputMode="numeric"
          min={1}
          max={maxDays}
          step={1}
          required
          disabled={submitting}
          value={values.durationDays}
          hint={t('admin.moderation.form.durationHint', { maxDays })}
          onChange={(event) =>
            setValues((current) => ({ ...current, durationDays: event.target.value }))
          }
        />
      )}

      <Textarea
        label={t('admin.moderation.form.note')}
        rows={5}
        required
        maxLength={MODERATION_NOTE_MAX_LENGTH}
        disabled={submitting}
        value={values.note}
        hint={t('admin.moderation.form.noteCounter', { count: noteLength(values.note) })}
        onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
      />

      {error !== null && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close} disabled={submitting}>
          {t('admin.moderation.form.cancel')}
        </Button>
        <Button
          type="submit"
          variant={plan.destructive ? 'danger' : 'primary'}
          disabled={!valid || submitting}
          aria-busy={submitting || undefined}
        >
          {submitting ? t('admin.moderation.form.submitting') : t('admin.moderation.form.submit')}
        </Button>
      </div>
    </form>
  );
}
