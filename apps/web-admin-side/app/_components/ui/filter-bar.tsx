'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';
import { Button } from './button';
import { Input } from './input';

export interface FilterBarProps {
  /** Names the search landmark, e.g. "Filter users". */
  ariaLabel: string;
  /** Search box, `Select`s, date fields... laid out in a wrapping row. */
  children: ReactNode;
  /** Shows the reset action only when something is actually filtered. */
  isFiltered: boolean;
  onReset: () => void;
  resetLabel: string;
  className?: string;
}

/**
 * Wrapping row of filter controls plus a reset action.
 *
 * Controls wrap instead of shrinking, so the longest Vietnamese label is never
 * clipped at 768px. Each control keeps a sensible minimum width.
 */
export function FilterBar({
  ariaLabel,
  children,
  isFiltered,
  onReset,
  resetLabel,
  className,
}: FilterBarProps) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn('flex min-w-0 flex-wrap items-end gap-x-3 gap-y-3', className)}
    >
      {children}
      {isFiltered && (
        <Button variant="ghost" onClick={onReset}>
          {resetLabel}
        </Button>
      )}
    </div>
  );
}

export interface SearchBoxProps {
  label: string;
  placeholder?: string;
  /** Committed value, i.e. what the URL currently holds. */
  value: string;
  /** Called once typing pauses (or on Enter) with the trimmed text. */
  onSearch: (value: string) => void;
  debounceMs?: number;
  /** Shorter non-empty text is never committed (the API rejects `q` under 2). */
  minLength?: number;
  clearLabel: string;
  /** Hint under the field, e.g. "Email and phone must match exactly". */
  hint?: ReactNode;
  className?: string;
}

/**
 * Debounced search input synchronised with the URL.
 *
 * Typing updates local state at once and commits to the URL after `debounceMs`
 * of silence; Enter commits immediately. When the committed `value` changes
 * from outside (reset, Back) the field follows it, unless the operator is
 * mid-typing. Echoes of our own commits are recognised and ignored.
 */
export function SearchBox({
  label,
  placeholder,
  value,
  onSearch,
  debounceMs = 350,
  minLength = 2,
  clearLabel,
  hint,
  className,
}: SearchBoxProps) {
  const id = useId();
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest callback without restarting the debounce when its identity changes.
  const latest = useRef(onSearch);
  useEffect(() => {
    latest.current = onSearch;
  });

  // Values this box pushed to the URL whose echo has not come back yet, oldest
  // first. Refs are only touched in handlers and effects, never during render.
  const pendingEchoes = useRef<string[]>([]);
  const lastCommitted = useRef(value);

  // The `value` prop changed. An echo of our own commit is ignored (it would
  // overwrite newer keystrokes and flicker); anything else is external (reset,
  // Back) and replaces the text unless a debounce is pending.
  useEffect(() => {
    const index = pendingEchoes.current.indexOf(value);
    if (index >= 0) {
      pendingEchoes.current = pendingEchoes.current.slice(index + 1);
      return;
    }
    pendingEchoes.current = [];
    lastCommitted.current = value;
    if (timer.current === null) setText(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const commit = (next: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const trimmed = next.trim();
    // Too short to search, but not empty: leave the committed value alone.
    if (trimmed !== '' && trimmed.length < minLength) return;
    if (trimmed === lastCommitted.current) return;
    lastCommitted.current = trimmed;
    pendingEchoes.current.push(trimmed);
    latest.current(trimmed);
  };

  const schedule = (next: string) => {
    setText(next);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), debounceMs);
  };

  return (
    <div className={cn('relative min-w-56 flex-1 basis-64', className)}>
      <Input
        id={id}
        type="search"
        label={label}
        value={text}
        autoComplete="off"
        spellCheck={false}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(hint === undefined ? {} : { hint })}
        leading={<span>⌕</span>}
        onChange={(event) => schedule(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(text);
          }
        }}
        // Room for the clear button.
        className="pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {text !== '' && (
        <button
          type="button"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => {
            setText('');
            commit('');
          }}
          className={cn(
            'absolute right-0 flex size-11 items-center justify-center rounded-md text-fg-muted hover:text-fg',
            // Aligned to the input's bottom edge so a two-line label cannot push it off.
            hint === undefined ? 'bottom-0' : 'top-[1.625rem]',
          )}
        >
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}
