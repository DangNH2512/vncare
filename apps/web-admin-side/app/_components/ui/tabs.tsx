'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface TabItem {
  id: string;
  label: string;
  /** Short count or marker shown after the label. */
  badge?: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  /** Names the tablist for assistive tech. */
  ariaLabel: string;
  className?: string;
}

/**
 * Controlled tabs with automatic activation (WAI-ARIA tabs pattern).
 *
 * Arrow keys, Home and End move between tabs and select them; only the active
 * tab is in the tab order. The caller owns `value`, so it can live in the URL.
 */
export function Tabs({ tabs, value, onValueChange, ariaLabel, className }: TabsProps) {
  const baseId = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const active = tabs.find((tab) => tab.id === value) ?? tabs[0];

  const move = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    if (next === undefined) return;
    onValueChange(next.id);
    refs.current.get(next.id)?.focus();
  };

  if (active === undefined) return null;

  return (
    <div className={cn('min-w-0', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node === null) refs.current.delete(tab.id);
                else refs.current.set(tab.id, node);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={selected ? `${baseId}-panel-${tab.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(tab.id)}
              onKeyDown={(event) => move(event, index)}
              className={cn(
                '-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold whitespace-nowrap',
                'transition-colors',
                selected
                  ? 'border-accent text-accent-text'
                  : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="rounded-full bg-surface-sunken px-2 text-xs text-fg-muted">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
        className="pt-4 outline-offset-2"
      >
        {active.content}
      </div>
    </div>
  );
}
