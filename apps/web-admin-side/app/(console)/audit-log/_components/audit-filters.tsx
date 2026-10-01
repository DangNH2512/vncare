'use client';

import { DateRangeFilter } from '../../../_components/filters/date-range-filter';
import { useTranslate } from '../../../_components/locale-provider';
import { Button, FilterBar, Select } from '../../../_components/ui';
import type { ListQuery } from '../../../_lib/list-query';
import { ACTIONS, ENTITY_KEY, ENTITY_TYPES, SEVERITIES, severityLabel } from './audit-labels';

/** Filter parameters of the audit log; every one lives in the URL. */
export const AUDIT_FILTER_KEYS = [
  'action',
  'severity',
  'entityType',
  'from',
  'to',
  'actorId',
  'entityId',
] as const;

/** Short form of an id for a chip: the full value stays in the URL. */
const shortId = (id: string): string => id.slice(0, 8);

/**
 * Filter controls of the audit log. `actorId` and `entityId` have no input of
 * their own: they arrive in the URL from links on other pages, and show as
 * removable chips while they apply. The date range is stored as UTC instants
 * and shown as Da Nang days, with the upper bound exclusive.
 */
export function AuditFilters({
  list,
  onChange,
}: {
  list: ListQuery<'createdAt'>;
  /** Runs before every change so the screen can drop transient notices. */
  onChange: () => void;
}) {
  const t = useTranslate();
  const apply = (patch: Record<string, string | readonly string[] | null>) => {
    onChange();
    list.set(patch);
  };
  const summarize = (count: number) => t('admin.audit.filter.selected', { count });
  const clearLabel = t('admin.audit.filter.clearSelection');
  const keyboardHint = t('admin.common.select.keyboardHint');
  const actorId = list.get('actorId');
  const entityId = list.get('entityId');

  const chip = (key: 'actorId' | 'entityId', label: string) => (
    <span
      key={key}
      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-accent-subtle pr-1 pl-3 text-xs font-semibold text-accent-text"
    >
      <span>{label}</span>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-9 min-w-9 rounded-full px-0"
        aria-label={`${t('admin.audit.filter.remove')}: ${label}`}
        title={t('admin.audit.filter.remove')}
        onClick={() => apply({ [key]: null })}
      >
        <span aria-hidden>×</span>
      </Button>
    </span>
  );

  return (
    <FilterBar
      ariaLabel={t('admin.audit.table.filterLabel')}
      isFiltered={list.isFiltered}
      onReset={() => {
        onChange();
        list.reset();
      }}
      resetLabel={t('admin.audit.filter.clear')}
    >
      <Select
        className="w-52"
        label={t('admin.audit.filter.action')}
        placeholder={t('admin.audit.filter.allActions')}
        options={ACTIONS.map(([value, key]) => ({ value, label: t(key) }))}
        value={list.getList('action')}
        onChange={(action) => apply({ action })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-44"
        label={t('admin.audit.filter.severity')}
        placeholder={t('admin.audit.filter.allSeverities')}
        options={SEVERITIES.map((severity) => ({ value: severity, label: severityLabel(severity, t) }))}
        value={list.getList('severity')}
        onChange={(severity) => apply({ severity })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-40"
        multiple={false}
        label={t('admin.audit.filter.entityType')}
        placeholder={t('admin.audit.filter.allTypes')}
        options={ENTITY_TYPES.map((type) => ({ value: type, label: t(ENTITY_KEY[type]) }))}
        value={list.getList('entityType')}
        onChange={(entityType) => apply({ entityType })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <DateRangeFilter
        list={list}
        fromKey="from"
        toKey="to"
        fromLabel={t('admin.audit.filter.from')}
        toLabel={t('admin.audit.filter.to')}
        onChange={onChange}
      />
      {actorId !== '' && chip('actorId', t('admin.audit.filter.actorId', { id: shortId(actorId) }))}
      {entityId !== '' && chip('entityId', t('admin.audit.filter.entityId', { id: shortId(entityId) }))}
    </FilterBar>
  );
}
