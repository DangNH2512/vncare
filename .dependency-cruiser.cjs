/**
 * Architectural boundary rules B1-B8. Violations fail CI (severity: error).
 * Rule sources and rationale: ADR-0000 and docs/analysis/11 §3.2.
 */
module.exports = {
  forbidden: [
    {
      name: 'B1-domain-no-framework',
      severity: 'error',
      comment:
        '@dnc/domain is pure TypeScript: no react/react-native/@nestjs/typeorm imports',
      from: { path: '^packages/domain' },
      to: {
        path: '(^|/)node_modules/(react|react-native|react-dom|@nestjs|typeorm)(/|$)',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'B1b-domain-no-api-client',
      severity: 'error',
      comment: '@dnc/domain must not depend on the generated API client',
      from: { path: '^packages/domain' },
      to: { path: '^packages/api-client' },
    },
    {
      name: 'B2-policy-no-framework',
      severity: 'error',
      comment:
        '@dnc/policy (CASL) must stay framework-free so it runs in api, web and mobile',
      from: { path: '^packages/policy' },
      to: {
        path: '(^|/)node_modules/(react|react-native|react-dom|@nestjs|typeorm)(/|$)',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'B4-tokens-no-jsx',
      severity: 'error',
      comment: '@dnc/tokens holds design tokens only: importing JSX modules is forbidden',
      from: { path: '^packages/tokens' },
      to: { path: '\\.(tsx|jsx)$' },
    },
    {
      name: 'B5-packages-no-apps',
      severity: 'error',
      comment: 'packages/* must never import from apps/*',
      from: { path: '^packages' },
      to: { path: '^apps' },
    },
    {
      name: 'B6-no-deep-module-imports',
      severity: 'error',
      comment:
        'Backend modules expose their API through index.ts only; reaching into another module internals is forbidden',
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/([^/]+)/(?!index\\.ts$).+',
        pathNot: '^apps/api/src/modules/$1/',
      },
    },
    {
      name: 'B7-no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'B8-single-rsvp-write-gate',
      severity: 'error',
      comment:
        'Only rsvp-write.service.ts may import the RSVP/waitlist repositories; every capacity-affecting write goes through that single gate',
      from: {
        path: '^apps/api/src',
        pathNot: 'rsvp-write\\.service\\.ts$|/rsvp/.*repository\\.ts$',
      },
      to: { path: '(rsvp|waitlist)[^/]*\\.repository\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '\\.(spec|test)\\.[cm]?tsx?$|/test/|/dist/' },
  },
};
