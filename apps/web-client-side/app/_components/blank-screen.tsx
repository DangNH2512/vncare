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
 * The screen shown when there is nothing to show: a URL that matches nothing,
 * or a screen the navigation advertises but that is not built yet. Both say
 * what happened and carry a way back.
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
              // Anchor styled as the primary button: this navigates, so it
              // must support middle-click and "open in new tab".
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
