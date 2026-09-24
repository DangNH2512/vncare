import { NextResponse } from 'next/server';

/**
 * Marks every page response as never cacheable.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next 16 renamed the file convention
 * (`middleware` is deprecated) — see node_modules/next/dist/docs/01-app/
 * 03-api-reference/03-file-conventions/proxy.md.
 *
 * The console has no server session: whether a page renders the shell, the
 * sign-in form or a client-side redirect is decided entirely from state held
 * in memory (`AuthProvider`). Without this header a browser's back/forward
 * cache can replay an authenticated page's HTML after sign-out (AC-12);
 * `no-store` forces a fresh render, which is what re-reads that state.
 */
export function proxy(): NextResponse {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
