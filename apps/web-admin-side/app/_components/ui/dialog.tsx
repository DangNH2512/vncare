'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Action row; buttons should be the shared `Button` (44px touch target). */
  footer?: ReactNode;
  size?: keyof typeof SIZE;
  /** Accessible name of the corner close button. */
  closeLabel: string;
  /**
   * False while a request is in flight: Esc, the backdrop and the close button
   * stop working, so a dismissal cannot orphan a half-sent action.
   */
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog on the native `<dialog>` element.
 *
 * `showModal()` makes everything behind inert, handles Esc and restores focus
 * to the opener on close. Tab is additionally wrapped here, because a native
 * modal otherwise lets focus escape into browser chrome. Children mount only
 * while open, so form state resets on every opening.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel,
  dismissible = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // A drag that starts inside the box and ends on the backdrop must not close it.
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const trapTab = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      onKeyDown={trapTab}
      onCancel={(event) => {
        // Esc: let the parent state decide; the effect closes the element.
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // A click on the dialog box itself (not its content) is a backdrop click.
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current && dismissible) {
          onClose();
        }
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] min-w-0 rounded-lg border border-line bg-surface-raised p-0 text-fg shadow-raised',
        'backdrop:bg-overlay',
        SIZE[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-4rem)] min-w-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-balance text-fg">
                {title}
              </h2>
              {description !== undefined && (
                <p id={descriptionId} className="mt-1 text-sm text-pretty text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label={closeLabel}
              title={closeLabel}
              disabled={!dismissible}
              onClick={onClose}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg disabled:opacity-55"
            >
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </button>
          </header>
          <div className="min-w-0 overflow-y-auto px-5 py-4">{children}</div>
          {footer !== undefined && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
