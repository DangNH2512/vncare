/**
 * Copies MapLibre's worker bundle into `public/maplibre/`.
 *
 * The worker is an ES module that imports a sibling chunk. Asked to bundle it,
 * Turbopack emits the entry and drops the sibling, and the worker then fails to
 * import at runtime — in production as well as development. Serving both files
 * unchanged from our own origin keeps their relative import intact.
 *
 * Generated output; `public/maplibre/` is gitignored. Runs before dev and build.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
const target = resolve(import.meta.dirname, '..', 'public', 'maplibre');

mkdirSync(target, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(distDir, file), join(target, file));
}
console.log(`copied MapLibre worker bundle to ${target}`);
