'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { cn } from '../../_lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: readonly SelectOption[];
  /** Selected values. Single mode keeps at most one. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** Multiple selection (default). Single mode closes after a pick. */
  multiple?: boolean;
  /** Shown when nothing is selected, e.g. "All roles". */
  placeholder: string;
  /** Text for the collapsed trigger when several are selected, e.g. "3 selected". */
  summarize?: (count: number) => string;
  /** Accessible label of the clear action inside the list. */
  clearLabel: string;
  disabled?: boolean;
  className?: string;
  /** Visually hidden usage hint (keyboard shortcuts), wired through `aria-describedby`. Pass an i18n string. */
  keyboardHint?: string;
}

interface Placement {
  style: CSSProperties;
  /** Max height of the option list, so list + clear action fit the chosen side. */
  listMaxHeight: number;
}

const LIST_MAX = 256;
const EDGE = 8;
const TYPEAHEAD_MS = 700;

/**
 * Select / multi-select built as a button + listbox popover.
 *
 * Focus stays on the trigger and the active option is exposed through
 * `aria-activedescendant`, which keeps one tab stop and lets the arrow keys,
 * Home/End, Enter/Space and Esc drive the list. Click-outside closes it.
 *
 * The popover is `position: fixed`, placed from the trigger's rect, so a parent
 * with `overflow` (a dialog body, the table frame) cannot clip it. It closes on
 * scroll and resize rather than trying to follow the trigger.
 */
export function Select({
  label,
  options,
  value,
  onChange,
  multiple = true,
  placeholder,
  summarize,
  clearLabel,
  disabled = false,
  className,
  keyboardHint,
}: SelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement>({ style: {}, listMaxHeight: LIST_MAX });
  const trigger = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typeahead = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const hasOptions = options.length > 0;

  const selectedCount = options.filter((option) => value.includes(option.value)).length;

  const place = useCallback(() => {
    const button = trigger.current;
    if (button === null) return;
    const pop = document.getElementById(`${id}-pop`);
    const list = document.getElementById(listId);
    const rect = button.getBoundingClientRect();
    const clearHeight = (pop?.offsetHeight ?? 0) - (list?.offsetHeight ?? 0);
    const natural = Math.min(list?.scrollHeight ?? LIST_MAX, LIST_MAX);
    const below = window.innerHeight - rect.bottom - 4 - EDGE;
    const above = rect.top - 4 - EDGE;
    // Prefer below; go above only when it does not fit there and above has more room.
    const useBelow = below >= natural + clearHeight || below >= above;
    const room = useBelow ? below : above;
    const listMaxHeight = Math.max(48, Math.min(LIST_MAX, room - clearHeight));
    const height = Math.min(natural, listMaxHeight) + clearHeight;
    const rawTop = useBelow ? rect.bottom + 4 : rect.top - 4 - height;
    const top = Math.max(EDGE, Math.min(rawTop, window.innerHeight - height - EDGE));
    const minWidth = Math.max(rect.width, 192);
    // Keep the popover inside the viewport horizontally.
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - minWidth - EDGE));
    setPlacement((prev) =>
      prev.listMaxHeight === listMaxHeight && prev.style.top === top && prev.style.left === left && prev.style.minWidth === minWidth
        ? prev
        : { listMaxHeight, style: { top, left, minWidth, maxWidth: 'calc(100vw - 16px)' } },
    );
  }, [id, listId]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, selectedCount, options.length]);

  // Re-place when the layout reflows under an open popover (filter bar wrapping,
  // sidebar toggling): observe the trigger and the page body.
  useEffect(() => {
    if (!open || trigger.current === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => place());
    observer.observe(trigger.current);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [open, place]);

  useEffect(() => () => clearTimeout(announceTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const closeOnOuterScroll = (event: Event) => {
      // Scrolling the popover's own list (long lists, scrollIntoView) must not close it.
      const pop = document.getElementById(`${id}-pop`);
      if (pop !== null && event.target instanceof Node && pop.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('resize', close);
    // Capture: scroll events of inner containers do not bubble.
    document.addEventListener('scroll', closeOnOuterScroll, true);
    return () => {
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', closeOnOuterScroll, true);
    };
  }, [id, open]);

  // Keep the active option visible during keyboard navigation.
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const inList = document.getElementById(`${id}-pop`)?.contains(target) === true;
      if (root.current !== null && !root.current.contains(target) && !inList) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [id, open]);

  const selected = options.filter((option) => value.includes(option.value));
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1 || summarize === undefined
        ? selected.map((option) => option.label).join(', ')
        : summarize(selected.length);

  const toggle = (option: SelectOption) => {
    if (multiple) {
      onChange(
        value.includes(option.value)
          ? value.filter((entry) => entry !== option.value)
          : [...value, option.value],
      );
    } else {
      onChange(value.includes(option.value) ? [] : [option.value]);
      setOpen(false);
    }
  };

  const openList = () => {
    const firstSelected = options.findIndex((option) => value.includes(option.value));
    if (!hasOptions) return;
    setActive(Math.max(firstSelected, 0));
    setOpen(true);
  };

  const clearAll = () => {
    onChange([]);
    // Screen readers hear the result; the trigger label then reads the placeholder.
    // Reset first so a repeated identical message is re-announced.
    setAnnouncement('');
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(`${label}: ${placeholder}`), 60);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const count = options.length;
    const now = Date.now();
    const typing = typeahead.current.text !== '' && now - typeahead.current.at <= TYPEAHEAD_MS;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      // While typeahead is running the key must not wipe the selection.
      if (typing) {
        event.preventDefault();
        return;
      }
      if (value.length > 0) {
        event.preventDefault();
        clearAll();
        return;
      }
    }
    // Typeahead: printable characters jump to the next option starting with the typed text.
    // Space joins the buffer only mid-typeahead ("Pending review"); otherwise it opens/picks.
    if (count > 0 && event.key.length === 1 && (event.key !== ' ' || typing) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === ' ') event.preventDefault();
      const buffer = typing ? typeahead.current.text + event.key : event.key;
      typeahead.current = { text: buffer, at: now };
      const needle = buffer.toLocaleLowerCase();
      const from = buffer.length === 1 ? active + 1 : active;
      const ordered = [...options.keys()].map((i) => (i + from) % count);
      const hit = ordered.find((i) => options[i]?.label.toLocaleLowerCase().startsWith(needle));
      if (hit !== undefined) {
        if (!open) setOpen(true);
        setActive(hit);
      }
      return;
    }
    if (count === 0) {
      if (event.key === 'Escape') setOpen(false);
      return;
    }
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((index) => (index - 1 + count) % count);
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(count - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = options[active];
        if (option !== undefined) toggle(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={root} className={cn('relative flex min-w-0 flex-col gap-1.5', className)}>
      <span id={`${id}-label`} className="text-sm font-medium text-fg">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={keyboardHint === undefined ? undefined : `${id}-hint`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left text-md',
          'transition-[border-color] duration-150 hover:border-line-strong disabled:opacity-55',
          open ? 'border-accent' : 'border-line',
          selected.length === 0 ? 'text-fg-subtle' : 'text-fg',
        )}
      >
        <span id={`${id}-value`} className="min-w-0 truncate">
          {summary}
        </span>
        <span aria-hidden className="shrink-0 text-xs text-fg-subtle">
          ▾
        </span>
      </button>
      {keyboardHint !== undefined && (
        <span id={`${id}-hint`} className="sr-only">
          {keyboardHint}
        </span>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {open && (
        <div
          id={`${id}-pop`}
          style={placement.style}
          className="fixed z-50 rounded-md border border-line bg-surface-raised shadow-raised"
        >
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${id}-label`}
            aria-multiselectable={multiple || undefined}
            style={{ maxHeight: placement.listMaxHeight }}
            className="overflow-auto py-1"
          >
            {options.map((option, index) => {
              const isSelected = value.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus on the trigger while the pointer picks an option.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => toggle(option)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm sm:min-h-9',
                    index === active && 'bg-accent-subtle text-accent-text',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center border border-line-strong text-xs',
                      multiple ? 'rounded-sm' : 'rounded-full',
                      isSelected && 'border-accent bg-accent text-on-accent',
                    )}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="min-w-0 break-words">{option.label}</span>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              onClick={clearAll}
              className="min-h-11 w-full border-t border-line px-3 text-left text-sm font-medium text-accent-text hover:bg-accent-subtle sm:min-h-9"
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
