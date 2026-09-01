import { colors } from '@dnc/tokens';
import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import type { ReactNode } from 'react';

import { LocaleProvider } from './_components/locale-provider';
import { THEME_BOOTSTRAP_SCRIPT, ThemeProvider } from './_components/theme-provider';
import './globals.css';

/**
 * Be Vietnam Pro is drawn for Vietnamese: every diacritic stack renders at the
 * same optical weight as its Latin base, which a general-purpose UI face does
 * not guarantee. Playfair Display carries headings and also ships the
 * vietnamese subset, so "Ngũ Hành Sơn" is safe at display sizes too.
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

export const metadata: Metadata = {
  title: {
    default: 'Da Nang Connect',
    template: '%s · Da Nang Connect',
  },
  description:
    'Community events, sports meetups and language exchange for expats in Da Nang.',
  applicationName: 'Da Nang Connect',
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
 * `lang` starts at the default locale and LocaleProvider rewrites it when the
 * user switches, so the server markup and the first client render agree.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <head>
        {/* Applies the stored palette before first paint; without it the light theme flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        {/* The app shell (side nav, tab bar, rails) is applied by the (shell) route group layout. */}
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
