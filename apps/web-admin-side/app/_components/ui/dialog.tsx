'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface DialogProps {
  open: boolean;
  /** Called on Escape and on a backdrop click; the caller decides whether to close. */
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Buttons row, right-aligned on desktop. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Modal built on the native `<dialog>` element.
 *
 * `showModal()` gives focus containment, `inert` on the rest of the page, the
 * top layer and Escape handling without a focus-trap library. Escape fires a
 * `cancel` event; it is intercepted so the caller's `onClose` stays the only
 * way the dialog closes — a form that is mid-submit can then refuse.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the element itself (not its content) is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto w-[min(36rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto',
        'rounded-lg border border-line bg-surface p-0 text-fg shadow-raised',
        'backdrop:bg-overlay',
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-bold text-fg">
              {title}
            </h2>
            {description !== undefined && (
              <p id={descriptionId} className="text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          {children}
          {footer !== undefined && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
