'use client';

import type { MessageKey } from '@dnc/i18n';

import { cn } from '../../_lib/cn';
import { useTranslate } from '../locale-provider';

export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Visual ladder for the T0-T5 trust levels computed by `computeTrustLevel`
 * in @dnc/domain.
 *
 * Tone rises with the level rather than cycling through the palette: a member
 * scanning a host's card should read seniority from the colour alone. T0 is the
 * only warning-coloured tier because it is the only one that restricts actions.
 */
const TIER: Readonly<
  Record<TrustLevel, { labelKey: MessageKey; className: string; dot: string }>
> = {
  0: {
    labelKey: 'trust.level.t0',
    className: 'bg-danger-subtle text-danger-text',
    dot: 'bg-danger-text',
  },
  1: {
    labelKey: 'trust.level.t1',
    className: 'bg-surface-sunken text-fg-muted',
    dot: 'bg-fg-subtle',
  },
  2: {
    labelKey: 'trust.level.t2',
    className: 'bg-accent-subtle text-accent-text',
    dot: 'bg-accent',
  },
  3: {
    labelKey: 'trust.level.t3',
    className: 'bg-success-subtle text-success-text',
    dot: 'bg-success-text',
  },
  4: {
    labelKey: 'trust.level.t4',
    className: 'bg-sun-subtle text-sun-text',
    dot: 'bg-sun-text',
  },
  5: {
    labelKey: 'trust.level.t5',
    className: 'bg-accent text-on-accent',
    dot: 'bg-on-accent',
  },
};

export interface TrustBadgeProps {
  level: TrustLevel;
  /**
   * `full` shows the tier name and is used on profiles; `compact` shows only
   * `T3`, for feed cards where the host name must keep the width.
   */
  variant?: 'full' | 'compact';
  className?: string;
}

export function TrustBadge({ level, variant = 'full', className }: TrustBadgeProps) {
  const t = useTranslate();
  const tier = TIER[level];
  const label = t(tier.labelKey);

  return (
    <span
      title={label}
      aria-label={t('trust.badge.aria', { level, label })}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5',
        'text-xs font-semibold',
        tier.className,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', tier.dot)} />
      <span aria-hidden className="min-w-0 truncate">
        {variant === 'compact' ? t('trust.badge.short', { level }) : label}
      </span>
    </span>
  );
}
