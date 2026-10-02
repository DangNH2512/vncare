import { setWorkerUrl } from 'maplibre-gl';

/**
 * Shared MapLibre configuration for every web-client map (post location
 * picker, Discover map). Importing this module pulls in `maplibre-gl`, so only
 * lazily loaded map components may import it.
 */

/**
 * Marker fill.
 *
 * MapLibre paints the pin into an SVG it owns, so it cannot read a Tailwind
 * class or a CSS variable. This is the one place a literal colour is
 * unavoidable; it is the `primaryDark` value from @dnc/tokens, and it is named
 * here so a token change has a single place to follow.
 */
export const MARKER_COLOR = '#0369A1';

/**
 * Raster OpenStreetMap.
 *
 * Raster rather than vector: these maps are small and short-lived, and a
 * vector style would download a glyph and sprite set for no gain at this size.
 * Attribution is required by the ODbL and is rendered by the attribution
 * control, not optional.
 */
export const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

let workerConfigured = false;

/**
 * Points MapLibre at its worker bundle, served from our own origin.
 *
 * Left alone, MapLibre resolves the worker to the current document URL and the
 * browser parses an HTML page as JavaScript. Bundling it instead drops the
 * sibling chunk the worker imports. `scripts/copy-maplibre-worker.mjs` copies
 * both files into `public/maplibre/`, where their relative import still works.
 * Idempotent: safe to call from every map component.
 */
export function initMapLibreWorker(): void {
  if (workerConfigured) return;
  setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
  workerConfigured = true;
}
