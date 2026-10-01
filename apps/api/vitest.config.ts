import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// The SWC plugin compiles TypeScript with decorator metadata (see .swcrc),
// which esbuild (vitest's default transform) does not support.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['e2e/**/*.spec.ts'],
    environment: 'node',
    // Thresholds far above anything a spec reaches, so the suite never locks
    // itself out of register/login from 127.0.0.1. The rate-limit specs
    // override these in process.env before building their own app.
    env: {
      RATE_LIMIT_LOGIN_IP_MAX: '100000',
      RATE_LIMIT_LOGIN_IDENTIFIER_MAX: '100000',
      RATE_LIMIT_REGISTER_HOURLY_MAX: '100000',
      RATE_LIMIT_REGISTER_DAILY_MAX: '100000',
      RATE_LIMIT_HMAC_SECRET: 'e2e-fixed-hmac-secret-not-for-production-use',
    },
  },
});
