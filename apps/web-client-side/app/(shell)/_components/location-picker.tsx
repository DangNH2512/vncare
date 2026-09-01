'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  MapMouseEvent,
  Marker,
  NavigationControl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { Button, Input } from '../../_components/ui';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { AREAS, areaName, DA_NANG_CENTER } from '../../_lib/areas';
import { cn } from '../../_lib/cn';

export interface PickedLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (value: PickedLocation | null) => void;
}

/**
 * Raster OpenStreetMap.
 *
 * Raster rather than vector for this picker: it is one small map used for a few
 * seconds, and a vector style would download a glyph and sprite set for no gain
 * at this size. Attribution is required by the ODbL and is rendered by the
 * attribution control below, not optional.
 */
/**
 * Marker fill.
 *
 * MapLibre paints the pin into an SVG it owns, so it cannot read a Tailwind
 * class or a CSS variable. This is the one place a literal colour is
 * unavoidable; it is the `primaryDark` value from @dnc/tokens, and it is named
 * here so a token change has a single place to follow.
 */
const MARKER_COLOR = '#0369A1';

const OSM_STYLE = {
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

/** Nearest launch area to a point, used to pre-fill the label the author can then edit. */
function nearestAreaName(lat: number, lng: number, locale: 'en' | 'vi'): string {
  let best = AREAS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const area of AREAS) {
    // Equirectangular approximation: exact enough to rank six areas inside one
    // city, and it avoids pulling in a geodesy dependency for a label guess.
    const dx = (area.center.lng - lng) * Math.cos((lat * Math.PI) / 180);
    const dy = area.center.lat - lat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = area;
    }
  }
  return best === undefined ? '' : areaName(best, locale);
}

/**
 * Drops a pin on a real map and names it.
 *
 * The label is typed, not reverse-geocoded: there is no geocoding provider in
 * the stack, and inventing a plausible-looking address the author never
 * confirmed is worse than asking them for one. The nearest area seeds the field
 * so the common case is one tap.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = new MapLibreMap({
      container: container.current,
      style: OSM_STYLE,
      center: [value?.lng ?? DA_NANG_CENTER.lng, value?.lat ?? DA_NANG_CENTER.lat],
      zoom: 13,
      attributionControl: { compact: true },
    });
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.on('error', () => setFailed(true));

    // The map is the input: clicking anywhere places or moves the pin, which is
    // faster than hunting for a draggable handle on a phone.
    instance.on('click', (event: MapMouseEvent) => {
      const { lat, lng } = event.lngLat;
      onChange({ lat, lng, label: nearestAreaName(lat, lng, locale) });
    });

    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
    // Mount once: re-creating the map on every value change would fight the
    // user's own panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    if (value === null) {
      marker.current?.remove();
      marker.current = null;
      return;
    }

    if (marker.current) {
      marker.current.setLngLat([value.lng, value.lat]);
    } else {
      marker.current = new Marker({ color: MARKER_COLOR })
        .setLngLat([value.lng, value.lat])
        .addTo(instance);
    }
    instance.easeTo({ center: [value.lng, value.lat], duration: 400 });
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-md border border-line">
        <div ref={container} className="h-52 w-full" />
        {failed && (
          <p className="absolute inset-0 grid place-items-center bg-surface-sunken px-4 text-center text-sm text-fg-muted">
            {t('post.location.mapUnavailable')}
          </p>
        )}
        {value === null && !failed && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-fg/70 px-3 py-1.5 text-center text-xs font-medium text-bg"
          >
            {t('post.location.tapToPin')}
          </p>
        )}
      </div>

      {/* Shortcut row: most posts are about one of the six launch areas, and
          tapping a name is faster than aiming at a map. */}
      <div className="flex flex-wrap gap-1.5">
        {AREAS.map((area) => (
          <button
            key={area.slug}
            type="button"
            onClick={() =>
              onChange({
                lat: area.center.lat,
                lng: area.center.lng,
                label: areaName(area, locale),
              })
            }
            className={cn(
              'min-h-8 rounded-full border border-line px-3 text-xs font-medium',
              'transition-colors hover:border-line-strong hover:bg-surface-sunken',
            )}
          >
            {areaName(area, locale)}
          </button>
        ))}
      </div>

      {value !== null && (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('post.location.labelField')}
              value={value.label}
              maxLength={200}
              onChange={(event) => onChange({ ...value, label: event.target.value })}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t('post.location.remove')}
          </Button>
        </div>
      )}
    </div>
  );
}
