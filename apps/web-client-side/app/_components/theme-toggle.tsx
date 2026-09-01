'use client';

import { cn } from '../_lib/cn';
import { useTranslate } from './locale-provider';
import { useTheme } from './theme-provider';

/**
 * Two-state switch between light and dark.
 *
 * It intentionally offers no explicit "system" option: choosing either value
 * pins the preference, and clearing it is a job for browser settings, not for a
 * third state most users never understand. The provider still starts from the
 * system setting until the first click.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setPreference, ready } = useTheme();
  const t = useTranslate();
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={t('a11y.toggleTheme')}
      title={t(next === 'dark' ? 'theme.dark' : 'theme.light')}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
        'border border-line text-fg-muted transition-colors duration-150',
        'hover:border-line-strong hover:text-fg sm:size-10',
        className,
      )}
    >
      {/* Rendered only once the stored preference is known, so the icon never flips after hydration. */}
      {ready && (
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          {resolved === 'dark' ? (
            <path
              d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
              fill="currentColor"
            />
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
            </g>
          )}
        </svg>
      )}
    </button>
  );
}
