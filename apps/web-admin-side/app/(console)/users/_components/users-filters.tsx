'use client';

import type { UserRoleT, UserStatusT } from '@dnc/contracts';

import { DateRangeFilter } from '../../../_components/filters/date-range-filter';
import { SearchWithHint } from '../../../_components/filters/search-with-hint';
import {
  ROLE_KEY,
  ROLES,
  STATUSES,
  STATUS_KEY,
  trustLabel,
} from '../../../_components/labels/user-labels';
import { useTranslate } from '../../../_components/locale-provider';
import { Checkbox, FilterBar, Select } from '../../../_components/ui';
import type { ListQuery } from '../../../_lib/list-query';

const TRUST_LEVELS = [0, 1, 2, 3, 4, 5] as const;

/** A URL value as a trust level, or `undefined` when it is empty or not a level. */
function levelOf(value: string): number | undefined {
  const level = Number(value);
  return value !== '' && (TRUST_LEVELS as readonly number[]).includes(level) ? level : undefined;
}

/**
 * Filter controls of the user directory. Every value lives in the URL; the
 * join range is stored as UTC instants (the API contract) and shown as
 * Da Nang calendar days, with the upper bound exclusive (start of next day).
 */
export function UsersFilters({
  list,
  onChange,
}: {
  list: ListQuery<'createdAt' | 'lastActiveAt' | 'trustLevel' | 'handle'>;
  /** Runs before every change so the screen can drop transient notices. */
  onChange: () => void;
}) {
  const t = useTranslate();
  const apply = (patch: Record<string, string | readonly string[] | null>) => {
    onChange();
    list.set(patch);
  };

  // The two trust selects exclude each other's impossible half, so the range
  // can never be inverted from the UI.
  const min = levelOf(list.get('trustMin'));
  const max = levelOf(list.get('trustMax'));
  const trustOptions = (accept: (level: number) => boolean) =>
    TRUST_LEVELS.filter(accept).map((level) => ({
      value: String(level),
      label: `${t('trust.badge.short', { level })} · ${trustLabel(level, t)}`,
    }));
  const summarize = (count: number) => t('admin.users.filter.selected', { count });
  const clearLabel = t('admin.users.filter.clearSelection');
  const keyboardHint = t('admin.common.select.keyboardHint');

  return (
    <FilterBar
      ariaLabel={t('admin.users.table.filterLabel')}
      isFiltered={list.isFiltered}
      onReset={() => {
        onChange();
        list.reset();
      }}
      resetLabel={t('admin.users.filter.clear')}
    >
      <SearchWithHint
        className="basis-full! lg:basis-96!"
        label={t('admin.users.search.label')}
        placeholder={t('admin.users.search.placeholder')}
        hint={t('admin.users.search.hint')}
        hintLabel={t('admin.users.search.hintLabel')}
        clearLabel={t('admin.users.search.clear')}
        value={list.get('q')}
        onSearch={(q) => apply({ q })}
      />
      <Select
        className="w-44"
        label={t('admin.users.filter.role')}
        placeholder={t('admin.users.filter.allRoles')}
        options={ROLES.map((role: UserRoleT) => ({ value: role, label: t(ROLE_KEY[role]) }))}
        value={list.getList('role')}
        onChange={(role) => apply({ role })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-44"
        label={t('admin.users.filter.status')}
        placeholder={t('admin.users.filter.allStatuses')}
        options={STATUSES.map((status: UserStatusT) => ({
          value: status,
          label: t(STATUS_KEY[status]),
        }))}
        value={list.getList('status')}
        onChange={(status) => apply({ status })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-40"
        multiple={false}
        label={t('admin.users.filter.trustMin')}
        placeholder={t('admin.users.filter.any')}
        options={trustOptions((level) => max === undefined || level <= max)}
        value={list.getList('trustMin')}
        onChange={(value) => apply({ trustMin: value })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-40"
        multiple={false}
        label={t('admin.users.filter.trustMax')}
        placeholder={t('admin.users.filter.any')}
        options={trustOptions((level) => min === undefined || level >= min)}
        value={list.getList('trustMax')}
        onChange={(value) => apply({ trustMax: value })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <DateRangeFilter
        list={list}
        fromKey="joinedFrom"
        toKey="joinedTo"
        fromLabel={t('admin.users.filter.joinedFrom')}
        toLabel={t('admin.users.filter.joinedTo')}
        onChange={onChange}
      />
      <Checkbox
        label={t('admin.users.filter.includeDeleted')}
        checked={list.get('includeDeleted') === 'true'}
        onChange={(event) => apply({ includeDeleted: event.target.checked ? 'true' : null })}
      />
    </FilterBar>
  );
}
