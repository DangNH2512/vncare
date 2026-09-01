'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { MessageKey } from '@dnc/i18n';

import { Card, EmptyState } from './ui';
import { useTranslate } from './locale-provider';
import { cn } from '../_lib/cn';

export interface BlankScreenProps {
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  /** Decorative mark; the title carries the meaning. */
  glyph: string;
  /** Rendered in place of the default "back to home" button. */
  action?: ReactNode;
}

/**
 * The screen shown when there is nothing to show.
 *
 * One component for two situations that look identical to a visitor: a URL that
 * matches nothing, and a screen that exists in the navigation but has not been
 * built. Both leave someone stranded, and both are answered the same way — say
 * plainly what happened, and put the way back within reach.
 *
 * Deliberately not a bare "404": the number tells the visitor nothing they can
 * act on, and a dead end with no exit is the part that actually costs a session.
 */
export function BlankScreen({ titleKey, descriptionKey, glyph, action }: BlankScreenProps) {
  const t = useTranslate();

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
      <Card padding="none" className="w-full max-w-md border-none bg-transparent shadow-none">
        <EmptyState
          icon={<span className="text-2xl">{glyph}</span>}
          title={t(titleKey)}
          description={t(descriptionKey)}
          action={
            action ?? (
              // A link styled as the primary button, the same way the shell's
              // "Create event" call to action is built: this navigates, so it
              // must be an anchor — middle-click and "open in new tab" are not
              // optional on a dead end.
              <Link
                href="/"
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5',
                  'bg-accent text-md font-semibold text-on-accent shadow-card',
                  'transition-colors duration-150 hover:bg-accent-hover',
                )}
              >
                {t('blank.backHome')}
              </Link>
            )
          }
        />
      </Card>
    </div>
  );
}
