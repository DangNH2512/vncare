'use client';

import type { ReactNode } from 'react';

import { useTranslate } from '../locale-provider';
import { BottomTabs } from './bottom-tabs';
import { RightRail } from './right-rail';
import { SideNav } from './side-nav';
import { TopBar } from './top-bar';

/**
 * Social-network shell around every screen in the `(shell)` route group.
 *
 * Mobile: thin top bar + fixed bottom tab bar; the main column takes the
 * whole width and reserves bottom padding so content never hides behind the
 * tabs. Tablet (md): icon side rail + main column. Desktop (lg): full side
 * nav; the right rail joins from xl, capping the line at three columns.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslate();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1220px]">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t('common.skipToContent')}
      </a>

      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-w-0 flex-1 justify-center gap-6 lg:px-6">
          {/* pb clears the fixed tab bar on mobile; md+ has no tab bar. */}
          <main id="main" className="w-full max-w-[600px] min-w-0 pb-28 md:pb-10">
            {children}
          </main>
          <RightRail />
        </div>
      </div>

      <BottomTabs />
    </div>
  );
}
