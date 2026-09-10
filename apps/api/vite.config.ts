import swc from 'unplugin-swc';
import { defineConfig } from 'vite';

/**
 * Config for running the API from source with vite-node (`pnpm dev`).
 *
 * The SWC plugin is required rather than convenient: Nest resolves constructor
 * dependencies from `design:paramtypes`, which only a transform with
 * `decoratorMetadata` emits. esbuild — vite's default — drops it, and every
 * provider then fails to inject.
 */
export default defineConfig({
  plugins: [swc.vite()],
});
