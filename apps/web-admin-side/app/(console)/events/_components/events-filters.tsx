'use client';

import type { EventStatusT } from '@dnc/contracts';
import { daNangAreas } from '@dnc/geo';

import { DateRangeFilter } from '../../../_components/filters/date-range-filter';
import { EVENT_STATUS_LABEL_KEY, EVENT_STATUSES } from '../../../_components/labels/event-labels';
import { SearchWithHint } from '../../../_components/filters/search-with-hint';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { FilterBar, SearchBox, Select } from '../../../_components/ui';
import type { ListQuery } from '../../../_lib/list-query';


/**
 * Filter controls of the event directory. Every value lives in the URL; date
 * ranges are stored as UTC instants and shown as Da Nang calendar days.
 */
export function EventsFilters({
  list,
  onChange,
}: {
  list: ListQuery<'startsAt' | 'createdAt' | 'title'>;
  /** Runs before every change so the screen can drop transient notices. */
  onChange: () => void;
}) {
  const t = useTranslate();
  const { locale } = useLocale();
  const apply = (patch: Record<string, string | readonly string[] | null>) => {
    onChange();
    list.set(patch);
  };
  const summarize = (count: number) => t('admin.events.filter.selected', { count });
  const clearLabel = t('admin.events.filter.clearSelection');
  const keyboardHint = t('admin.common.select.keyboardHint');

  return (
    <FilterBar
      ariaLabel={t('admin.events.table.filterLabel')}
      isFiltered={list.isFiltered}
      onReset={() => {
        onChange();
        list.reset();
      }}
      resetLabel={t('admin.events.filter.clear')}
    >
      <SearchWithHint
        className="basis-full! lg:basis-96!"
        label={t('admin.events.search.label')}
        placeholder={t('admin.events.search.placeholder')}
        hint={t('admin.events.search.hint')}
        hintLabel={t('admin.events.search.hintLabel')}
        clearLabel={t('admin.events.search.clear')}
        value={list.get('q')}
        onSearch={(q) => apply({ q })}
      />
      <Select
        className="w-48"
        label={t('admin.events.filter.status')}
        placeholder={t('admin.events.filter.allStatuses')}
        options={EVENT_STATUSES.map((status: EventStatusT) => ({
          value: status,
          label: t(EVENT_STATUS_LABEL_KEY[status]),
        }))}
        value={list.getList('status')}
        onChange={(status) => apply({ status })}
        summarize={summarize}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-48"
        multiple={false}
        label={t('admin.events.filter.area')}
        placeholder={t('admin.events.filter.allAreas')}
        options={daNangAreas.map((area) => ({
          value: area.id,
          label: locale === 'vi' ? area.nameVi : area.nameEn,
        }))}
        value={list.getList('areaId')}
        onChange={(areaId) => apply({ areaId })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <Select
        className="w-40"
        multiple={false}
        label={t('admin.events.filter.timing')}
        placeholder={t('admin.events.timing.all')}
        options={[
          { value: 'upcoming', label: t('admin.events.timing.upcoming') },
          { value: 'past', label: t('admin.events.timing.past') },
        ]}
        value={list.getList('timing')}
        onChange={(timing) => apply({ timing })}
        clearLabel={clearLabel}
        keyboardHint={keyboardHint}
      />
      <DateRangeFilter
        list={list}
        fromKey="startsFrom"
        toKey="startsTo"
        fromLabel={t('admin.events.filter.startsFrom')}
        toLabel={t('admin.events.filter.startsTo')}
        onChange={onChange}
      />
      <DateRangeFilter
        list={list}
        fromKey="createdFrom"
        toKey="createdTo"
        fromLabel={t('admin.events.filter.createdFrom')}
        toLabel={t('admin.events.filter.createdTo')}
        onChange={onChange}
      />
      <SearchBox
        className="w-48 flex-none! basis-48!"
        label={t('admin.events.filter.hostHandle')}
        clearLabel={t('admin.events.search.clear')}
        minLength={1}
        value={list.get('hostHandle')}
        // Handles are shown with a leading @; accept it when pasted.
        onSearch={(hostHandle) => apply({ hostHandle: hostHandle.replace(/^@+/, '') })}
      />
    </FilterBar>
  );
}
