'use client';

import { LOCALES, type Locale } from '../_lib/i18n';
import { cn } from '../_lib/cn';
import { useLocale, useTranslate } from './locale-provider';

const SHORT_LABEL: Readonly<Record<Locale, string>> = { en: 'EN', vi: 'VI' };

/**
 * Locale switch rendered as a segmented control.
 *
 * Both options stay visible: a single toggle button showing the *other*
 * language is ambiguous in a bilingual product, where the label itself is the
 * thing being switched.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useTranslate();

  return (
    <div
      role="group"
      aria-label={t('a11y.switchLanguage')}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-line p-0.5',
        className,
      )}
    >
      {LOCALES.map((candidate) => {
        const active = candidate === locale;
        return (
          <button
            key={candidate}
            type="button"
            lang={candidate}
            aria-pressed={active}
            onClick={() => setLocale(candidate)}
            className={cn(
              'min-h-10 min-w-11 rounded-full px-3 text-xs font-semibold',
              'transition-colors duration-150 sm:min-h-9',
              active
                ? 'bg-accent text-on-accent'
                : 'text-fg-subtle hover:text-fg',
            )}
          >
            {SHORT_LABEL[candidate]}
          </button>
        );
      })}
    </div>
  );
}
