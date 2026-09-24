import type { ReactNode } from 'react';

/**
 * Layout for the signed-out routes (staff sign-in only, for now).
 *
 * No console shell: someone who has not signed in has no sidebar destination
 * to return to, and a chrome around the one action they came for is noise.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      {children}
    </main>
  );
}
