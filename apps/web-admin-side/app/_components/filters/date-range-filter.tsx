'use client';

import { useEffect, useState } from 'react';

import type { ListQuery } from '../../_lib/list-query';
import {
  endOfVnDayExclusive,
  isValidDay,
  lastIncludedVnDay,
  MAX_DAY,
  MIN_DAY,
  startOfVnDay,
  vnDay,
} from '../../_lib/vn-date';
import { useTranslate } from '../locale-provider';
import { Input } from '../ui';

type Problem = 'order' | 'invalid';

/**
 * Two date fields bound to a pair of URL params that hold UTC instants.
 *
 * The fields show Da Nang calendar days; the stored upper bound is the start of
 * the next day so the last chosen day is fully included (the API treats it as
 * exclusive). A value that cannot be applied (end before start, or a year the
 * contract rejects) is not committed, and the field says why.
 */
export function DateRangeFilter({
  list,
  fromKey,
  toKey,
  fromLabel,
  toLabel,
  onChange,
  wrapperClassName = 'w-40',
}: {
  list: Pick<ListQuery<string>, 'get' | 'set'>;
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  onChange: () => void;
  wrapperClassName?: string;
}) {
  const t = useTranslate();
  const [problem, setProblem] = useState<{ field: 'from' | 'to'; kind: Problem } | null>(null);
  const from = list.get(fromKey);
  const to = list.get(toKey);
  const fromDay = from === '' ? '' : vnDay(from);
  const toDay = to === '' ? '' : lastIncludedVnDay(to);

  // A change that arrives from outside (reset, Back) makes an old notice stale.
  useEffect(() => {
    setProblem(null);
  }, [from, to]);

  const apply = (patch: Record<string, string | null>) => {
    setProblem(null);
    onChange();
    list.set(patch);
  };
  const message = (field: 'from' | 'to'): string =>
    problem?.field === field
      ? t(problem.kind === 'order' ? 'admin.common.dateRange.order' : 'admin.common.dateRange.invalid')
      : '';

  return (
    <>
      <Input
        wrapperClassName={wrapperClassName}
        type="date"
        label={fromLabel}
        value={fromDay}
        min={MIN_DAY}
        max={toDay === '' ? MAX_DAY : toDay}
        error={message('from')}
        onChange={(event) => {
          const day = event.target.value;
          if (day === '') return apply({ [fromKey]: null });
          if (!isValidDay(day)) return setProblem({ field: 'from', kind: 'invalid' });
          if (toDay !== '' && day > toDay) return setProblem({ field: 'from', kind: 'order' });
          apply({ [fromKey]: startOfVnDay(day) });
        }}
      />
      <Input
        wrapperClassName={wrapperClassName}
        type="date"
        label={toLabel}
        value={toDay}
        min={fromDay === '' ? MIN_DAY : fromDay}
        max={MAX_DAY}
        error={message('to')}
        onChange={(event) => {
          const day = event.target.value;
          if (day === '') return apply({ [toKey]: null });
          if (!isValidDay(day)) return setProblem({ field: 'to', kind: 'invalid' });
          if (fromDay !== '' && day < fromDay) return setProblem({ field: 'to', kind: 'order' });
          apply({ [toKey]: endOfVnDayExclusive(day) });
        }}
      />
    </>
  );
}
