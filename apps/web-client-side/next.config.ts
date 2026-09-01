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
  /**
   * Off while the route tree is still being filled in: typed routes reject a
   * link to a screen another agent has not landed yet, and those links are how
   * the scaffold documents what is coming. Turn on once /events, /areas and
   * /profile all exist.
   */
  typedRoutes: false,
  experimental: {
    // Workspace packages are authored with NodeNext-style './x.js' specifiers.
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
};

export default config;
