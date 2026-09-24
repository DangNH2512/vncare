'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

const WIDTH = {
  sm: 'w-[min(26rem,calc(100vw-2rem))]',
  md: 'w-[min(34rem,calc(100vw-2rem))]',
} as const;

export interface DialogProps {
  open: boolean;
  /** Called for Escape, the backdrop-less close button, and any programmatic close. */
  onClose: () => void;
  title: string;
  /** Optional line under the title. */
  description?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
  className?: string;
}

/**
 * Modal dialog on the native `<dialog>` element.
 *
 * Same reasoning as the post composer and sign-in prompt: `showModal()` brings
 * the focus trap, Escape and the inert background with it. Children are only
 * mounted while open, so every opening starts from fresh state — a form that
 * remembered the last person's report would be a privacy bug, not a feature.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  width = 'md',
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className={cn(
        'm-auto max-h-[min(90vh,48rem)] overflow-y-auto rounded-xl border border-line bg-surface p-0',
        'text-fg shadow-card backdrop:bg-fg/50 backdrop:backdrop-blur-sm',
        WIDTH[width],
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold break-words">
              {title}
            </h2>
            {description !== undefined && (
              <div className="mt-1 text-sm text-fg-muted">{description}</div>
            )}
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
