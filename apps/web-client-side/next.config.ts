import type { NextConfig } from 'next';

/**
 * Workspace packages ship raw TypeScript (`main` points at `src/index.ts`), so
 * the bundler must compile them instead of treating them as pre-built deps.
 */
const config: NextConfig = {
  transpilePackages: [
    '@dnc/contracts',
    '@dnc/domain',
    '@dnc/geo',
    '@dnc/i18n',
    '@dnc/tokens',
  ],
  typedRoutes: true,
};

export default config;
