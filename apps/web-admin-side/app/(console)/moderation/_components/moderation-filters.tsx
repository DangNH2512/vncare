'use client';

import { ModerationQueueStatus, ModerationSeverity, ReportTargetType } from '@dnc/contracts';

import { useTranslate } from '../../../_components/locale-provider';
import { FilterBar, Select } from '../../../_components/ui';
import type { ListQuery } from '../../../_lib/list-query';
import { CASE_STATUS_KEY, SEVERITY_KEY, TARGET_TYPE_KEY } from './moderation-labels';

/** Filter controls of the queue. Every value lives in the URL, as the API's own query names. */
export function ModerationFilters({
  list,
  onChange,
}: {
  list: ListQuery<'severity'>;
  /** Runs before every change so the screen can drop transient notices. */
  onChange: () => void;
}) {
  const t = useTranslate();
  const apply = (patch: Record<string, string | readonly string[] | null>) => {
    onChange();
    list.set(patch);
  };
  const summarize = (count: number) => t('admin.moderation.filter.selected', { count });
  const clearLabel = t('admin.moderation.filter.clearSelection');
  const keyboardHint = t('admin.common.select.keyboardHint');

  return (
    <FilterBar
      ariaLabel={t('admin.moderation.filter.label')}
      isFiltered={list.isFiltered}
      onReset={() => {
        onChange();
        list.reset();
      }}
      resetLabel={t('admin.moderation.filter.clear')}
    >
      <Select
        className="w-44"
        label={t('admin.moderation.filter.severity')}
        placeholder={t('admin.moderation.filter.allSeverities')}
        options={ModerationSeverity.options.map((value) => ({ value, label: t(SEVERITY_KEY[value]) }))}
        value={list.getList('severity')}
        onChange={(severity) => apply({ severity })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-52"
        label={t('admin.moderation.filter.status')}
        placeholder={t('admin.moderation.filter.allStatuses')}
        options={ModerationQueueStatus.options.map((value) => ({ value, label: t(CASE_STATUS_KEY[value]) }))}
        value={list.getList('status')}
        onChange={(status) => apply({ status })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-44"
        label={t('admin.moderation.filter.targetType')}
        placeholder={t('admin.moderation.filter.allTargetTypes')}
        options={ReportTargetType.options.map((value) => ({ value, label: t(TARGET_TYPE_KEY[value]) }))}
        value={list.getList('targetType')}
        onChange={(targetType) => apply({ targetType })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-48"
        multiple={false}
        label={t('admin.moderation.filter.assignee')}
        placeholder={t('admin.moderation.filter.anyone')}
        options={[
          { value: 'me', label: t('admin.moderation.assigneeFilter.me') },
          { value: 'unassigned', label: t('admin.moderation.assigneeFilter.unassigned') },
        ]}
        value={list.getList('assignee')}
        onChange={(assignee) => apply({ assignee })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-44"
        multiple={false}
        label={t('admin.moderation.filter.overdue')}
        placeholder={t('admin.moderation.filter.allDeadlines')}
        options={[{ value: 'true', label: t('admin.moderation.filter.overdueOnly') }]}
        value={list.getList('overdue')}
        onChange={(overdue) => apply({ overdue })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
    </FilterBar>
  );
}
