import type { NextConfig } from 'next';

/** Where the API actually listens. The browser never sees this — see rewrites. */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3001';

/**
 * Workspace packages ship raw TypeScript (`main` points at `src/index.ts`), so
 * the bundler must compile them instead of treating them as pre-built deps.
 * Their relative imports are extensionless, which is what Turbopack and Metro
 * both resolve; `experimental.extensionAlias` is a webpack-only option and
 * would silently do nothing here.
 */
const config: NextConfig = {
  transpilePackages: [
    '@dnc/contracts',
    '@dnc/domain',
    '@dnc/geo',
    '@dnc/i18n',
    '@dnc/tokens',
  ],
  /**
   * Off while the route tree is still being filled in: typed routes reject a
   * link to a screen another agent has not landed yet, and those links are how
   * the scaffold documents what is coming.
   */
  typedRoutes: false,

  /**
   * Proxies the API under this origin.
   *
   * Not a convenience: the refresh token is an httpOnly cookie, and a cookie
   * cannot be set cross-origin over plain HTTP without `SameSite=None; Secure`,
   * which needs TLS that localhost does not have. Serving the API from the same
   * origin as the app makes the cookie a first-party cookie, which is what it
   * is. It also removes the CORS preflight from every request.
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default config;
