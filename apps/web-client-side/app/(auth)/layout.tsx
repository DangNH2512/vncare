import type { ReactNode } from 'react';

/**
 * Layout for the signed-out routes.
 *
 * No app shell: someone who has not signed in has no feed to return to and no
 * notifications to check, and a navigation rail full of things they cannot open
 * is noise around the one action they came for.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      {children}
    </main>
  );
}
