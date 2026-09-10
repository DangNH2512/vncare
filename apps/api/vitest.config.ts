import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// The SWC plugin compiles TypeScript with decorator metadata (see .swcrc),
// which esbuild (vitest's default transform) does not support.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['e2e/**/*.spec.ts'],
    environment: 'node',
  },
});
