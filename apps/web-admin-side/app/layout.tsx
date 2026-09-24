import { colors } from '@dnc/tokens';
import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import type { ReactNode } from 'react';

import { AuthProvider } from './_components/auth-provider';
import { LocaleProvider } from './_components/locale-provider';
import './globals.css';

/**
 * Be Vietnam Pro is drawn for Vietnamese: every diacritic stack renders at the
 * same optical weight as its Latin base, which a general-purpose UI face does
 * not guarantee. Playfair Display carries headings and also ships the
 * vietnamese subset, so a Vietnamese moderator's name or a category label is
 * safe at display sizes too. Same choice as apps/web-client-side.
 */
const bodyFont = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const headingFont = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

/**
 * The console is staff-only and sits entirely behind the login gate: nothing
 * here should ever appear in a search index. `robots.ts` covers crawlers that
 * respect robots.txt; this metadata covers the ones that do not.
 */
export const metadata: Metadata = {
  title: {
    default: 'Da Nang Connect Admin',
    template: '%s · Da Nang Connect Admin',
  },
  description: 'Operations console for Da Nang Connect staff.',
  applicationName: 'Da Nang Connect Admin',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Browser chrome colour comes from @dnc/tokens like every other colour.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colors.surfaceMuted },
    { media: '(prefers-color-scheme: dark)', color: colors.textPrimary },
  ],
};

/**
 * `lang` starts at the default locale; `LocaleProvider` rewrites it on the
 * client once a stored preference is read, so the server markup and the first
 * client render agree. There is no cookie-based theme yet — see globals.css.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="min-h-dvh bg-bg text-fg">
        {/* The console shell (sidebar, header) is applied by (console)/layout.tsx. */}
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
