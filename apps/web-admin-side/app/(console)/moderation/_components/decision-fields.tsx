'use client';

import type { ModerationDecisionTypeT, ModerationSeverityT, ReportReasonT } from '@dnc/contracts';
import { ModerationSeverity } from '@dnc/contracts';

import { useTranslate } from '../../../_components/locale-provider';
import { Checkbox, Input, Select } from '../../../_components/ui';
import { REASON_CODE_KEY, SEVERITY_KEY } from './moderation-labels';

/** Longest suspension the picker accepts; the API alone enforces the role's own cap. */
export const MAX_SUSPENSION_DAYS = 3650;

export interface DecisionChoice {
  reasonCode: ReportReasonT;
  /** Text of the days input; parsed on submit. */
  days: string;
  closeCase: boolean;
}

export function parseDays(text: string): number | null {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= MAX_SUSPENSION_DAYS ? value : null;
}

/**
 * Step-1 fields of the decision dialog: reason category, suspension length
 * (suspend only) and whether the decision closes the case.
 */
export function DecisionFields({
  action,
  reasonCodes,
  value,
  onChange,
}: {
  action: ModerationDecisionTypeT;
  reasonCodes: readonly ReportReasonT[];
  value: DecisionChoice;
  onChange: (next: DecisionChoice) => void;
}) {
  const t = useTranslate();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Select
        multiple={false}
        label={t('admin.moderation.dialog.decide.reasonCode')}
        placeholder={t('admin.moderation.dialog.choose')}
        options={reasonCodes.map((code) => ({ value: code, label: t(REASON_CODE_KEY[code]) }))}
        value={[value.reasonCode]}
        onChange={(next) => {
          const code = reasonCodes.find((candidate) => candidate === next[0]);
          // The picker may be cleared; a decision always keeps a category.
          if (code !== undefined) onChange({ ...value, reasonCode: code });
        }}
        clearLabel={t('admin.moderation.filter.clearSelection')}
        keyboardHint={t('admin.common.select.keyboardHint')}
      />
      {action === 'suspended' && (
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_SUSPENSION_DAYS}
          step={1}
          label={t('admin.moderation.dialog.decide.days')}
          hint={t('admin.moderation.dialog.decide.daysHint')}
          value={value.days}
          onChange={(event) => onChange({ ...value, days: event.target.value })}
        />
      )}
      <Checkbox
        label={t('admin.moderation.dialog.decide.close')}
        checked={value.closeCase}
        onChange={(event) => onChange({ ...value, closeCase: event.target.checked })}
      />
    </div>
  );
}

/** Single-choice severity picker for the severity dialog. */
export function SeverityField({
  current,
  value,
  onChange,
}: {
  current: ModerationSeverityT;
  value: ModerationSeverityT | null;
  onChange: (next: ModerationSeverityT | null) => void;
}) {
  const t = useTranslate();
  return (
    <Select
      multiple={false}
      label={t('admin.moderation.dialog.severity.label')}
      placeholder={t('admin.moderation.dialog.choose')}
      options={ModerationSeverity.options
        .filter((level) => level !== current)
        .map((level) => ({ value: level, label: t(SEVERITY_KEY[level]) }))}
      value={value === null ? [] : [value]}
      onChange={(next) => onChange(ModerationSeverity.options.find((level) => level === next[0]) ?? null)}
      clearLabel={t('admin.moderation.filter.clearSelection')}
      keyboardHint={t('admin.common.select.keyboardHint')}
    />
  );
}
