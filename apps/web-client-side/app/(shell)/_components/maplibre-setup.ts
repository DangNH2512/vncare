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
 * MapLibre style URL for the OpenStreetMap basemap.
 *
 * `NEXT_PUBLIC_MAP_STYLE_URL` selects the provider, for example a MapTiler
 * style URL carrying its key (docs/analysis/04, tile source). Without it the
 * map uses OpenFreeMap's Liberty style, which needs no key and allows
 * commercial use. Neither `tile.openstreetmap.org` (its usage policy rules out
 * app traffic, and some networks resolve it to localhost) nor CARTO (now
 * key-only) is used: both left the map blank.
 *
 * The style carries its own attribution, rendered by the attribution control;
 * it is required by the ODbL and is not optional.
 */
export const OSM_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

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
