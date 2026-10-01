'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useTranslate } from '../locale-provider';

/**
 * `GMT+7` chip that opens the full time zone note on tap, click or keyboard
 * focus. A `title` alone is unreachable on touch screens, so this is a real
 * button; it closes on Escape or when focus leaves it.
 */
export function TimeZoneNote() {
  const t = useTranslate();
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (root.current !== null && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <span ref={root} className="relative inline-flex">
      <button
        type="button"
        data-testid="timezone-note"
        title={t('datetime.timeZoneNote')}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-8 items-center rounded-full bg-surface-sunken px-2.5 text-xs font-semibold text-fg-muted hover:text-fg"
      >
        {t('admin.header.timeZone')}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-2 block w-60 rounded-md border border-line bg-surface-raised p-3 text-xs text-fg shadow-raised"
        >
          {t('datetime.timeZoneNote')}
        </span>
      )}
    </span>
  );
}
