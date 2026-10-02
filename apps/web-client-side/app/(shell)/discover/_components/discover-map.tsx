'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRouter } from 'next/navigation';
import type { EventResponseT } from '@dnc/contracts';

import { Button } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { areaName, DA_NANG_CENTER, findAreaById } from '../../../_lib/areas';
import { formatEventDate, formatEventTime } from '../../../_lib/datetime';
import { MapUnavailable } from './discover-states';
import type { Translate } from '../../../_lib/i18n';
import { initMapLibreWorker, MARKER_COLOR, OSM_STYLE } from '../../_components/maplibre-setup';

initMapLibreWorker();

export interface DiscoverMapProps {
  /** Events already loaded by the list (every page the user has opened). */
  events: EventResponseT[];
  onShowList: () => void;
  /** More pages exist on the server; the map only shows what is loaded. */
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

interface Spot {
  key: string;
  lat: number;
  lng: number;
  events: EventResponseT[];
}

/** Events sharing a coordinate collapse into one marker whose popup lists them all. */
function groupBySpot(events: EventResponseT[]): Spot[] {
  const spots = new Map<string, Spot>();
  for (const event of events) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    const spot = spots.get(key);
    if (spot === undefined) spots.set(key, { key, lat: event.lat, lng: event.lng, events: [event] });
    else spot.events.push(event);
  }
  return [...spots.values()];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Popup body, built from DOM nodes with `textContent` only. Event titles are
 * user-written, so nothing here may go through an HTML string.
 */
function buildPopup(
  spot: Spot,
  t: Translate,
  locale: 'en' | 'vi',
  open: (id: string) => void,
): HTMLElement {
  const root = el('div', 'flex max-h-64 min-w-48 max-w-64 flex-col gap-3 overflow-y-auto pr-1');
  for (const event of spot.events) {
    const item = el('div', 'flex flex-col gap-0.5');
    item.append(el('p', 'text-md font-bold break-words text-fg', event.title));
    item.append(
      el(
        'p',
        'text-sm text-fg-muted',
        `${formatEventDate(event.startsAt, locale)} · ${formatEventTime(event.startsAt, locale)}`,
      ),
    );
    const area = findAreaById(event.areaId);
    if (area !== undefined) item.append(el('p', 'text-sm text-fg-muted', areaName(area, locale)));
    const seatsLeft = Math.max(0, event.capacity - event.seatsTaken);
    item.append(
      el(
        'p',
        'text-sm text-fg-muted',
        seatsLeft === 0 ? t('event.detail.full') : t('event.detail.seatsLeft', { count: seatsLeft }),
      ),
    );
    const link = el(
      'a',
      'mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-accent-text underline-offset-2 hover:underline',
      t('discover.map.popupOpen'),
    );
    link.href = `/events/${event.id}`;
    link.addEventListener('click', (click) => {
      // Keep modified clicks (new tab) native; navigate in-app otherwise.
      if (click.metaKey || click.ctrlKey || click.shiftKey || click.button !== 0) return;
      click.preventDefault();
      open(event.id);
    });
    item.append(link);
    root.append(item);
  }
  return root;
}

function buildMarker(count: number, label: string): HTMLElement {
  const node = el('button', 'cursor-pointer');
  node.type = 'button';
  node.setAttribute('aria-label', label);
  Object.assign(node.style, {
    width: '34px',
    height: '34px',
    borderRadius: '9999px',
    background: MARKER_COLOR,
    border: '3px solid var(--color-on-accent)',
    boxShadow: '0 2px 6px rgb(0 0 0 / 0.35)',
    color: 'var(--color-on-accent)',
    font: '700 13px/1 var(--font-sans, system-ui)',
    display: 'grid',
    placeItems: 'center',
    padding: '0',
  });
  if (count > 1) node.textContent = String(count);
  return node;
}

/**
 * Map view of the events the list has loaded. It shares the list's filters and
 * data (no queries of its own) and never re-searches when the user pans.
 */
export default function DiscoverMap({
  events,
  onShowList,
  hasMore,
  loadingMore,
  onLoadMore,
}: DiscoverMapProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const fitted = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Latest callbacks/labels without re-creating the map.
  const live = useRef({ t, locale, open: (id: string) => router.push(`/events/${id}`) });
  live.current = { t, locale, open: (id: string) => router.push(`/events/${id}`) };

  useEffect(() => {
    if (container.current === null) return undefined;
    let instance: MapLibreMap;
    let loaded = false;
    let removed = false;
    const dispose = () => {
      if (removed) return;
      removed = true;
      instance.remove();
    };
    // MapLibre can leave half-built internals (and throw later, from its own
    // timers) when WebGL is missing, so probe first and never construct then.
    const probe = document.createElement('canvas');
    if (probe.getContext('webgl2') === null && probe.getContext('webgl') === null) {
      setFailed(true);
      return undefined;
    }
    try {
      instance = new MapLibreMap({
        container: container.current,
        style: OSM_STYLE,
        center: [DA_NANG_CENTER.lng, DA_NANG_CENTER.lat],
        zoom: 11.5,
        attributionControl: { compact: true },
      });
    } catch {
      // No WebGL: say so instead of leaving a blank box.
      setFailed(true);
      return undefined;
    }
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.on('load', () => {
      loaded = true;
    });
    // With the worker bundle blocked MapLibre raises no error: the map simply
    // never reports a loaded source and stays blank. Any sign of life disarms
    // the watchdog; silence for eight seconds is treated as a failed start.
    let alive = false;
    const markAlive = () => {
      alive = true;
    };
    instance.on('load', markAlive);
    instance.on('sourcedata', (data) => {
      if (data.isSourceLoaded) markAlive();
    });
    const watchdog = window.setTimeout(() => {
      if (alive) return;
      // Release the WebGL context and worker before swapping in the fallback.
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      mapRef.current = null;
      dispose();
      setFailed(true);
    }, 8000);
    // A single tile that fails to load must not blank a working map, so only
    // errors raised before the map first loaded (style, worker) count as fatal.
    instance.on('error', (failure) => {
      const isTile = 'tile' in failure;
      if (!loaded && !isTile) setFailed(true);
    });
    mapRef.current = instance;
    setReady(true);
    return () => {
      window.clearTimeout(watchdog);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      dispose();
      mapRef.current = null;
      fitted.current = false;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const instance = mapRef.current;
    if (instance === null || !ready) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const spots = groupBySpot(events);
    const { t: translate, locale: lang } = live.current;
    for (const spot of spots) {
      const first = spot.events[0];
      const area = first === undefined ? undefined : findAreaById(first.areaId);
      const label = translate('discover.map.markerAria', {
        area: area === undefined ? '' : areaName(area, lang),
        count: spot.events.length,
      });
      const popup = new Popup({ offset: 22, maxWidth: '300px', closeButton: true }).setDOMContent(
        buildPopup(spot, translate, lang, (id) => live.current.open(id)),
      );
      popup.on('open', () => {
        const content = popup.getElement()?.querySelector<HTMLElement>('.maplibregl-popup-content');
        if (content) {
          content.style.background = 'var(--color-surface)';
          content.style.color = 'var(--color-fg)';
          content.style.borderRadius = '12px';
          content.style.fontFamily = 'inherit';
        }
      });
      markers.current.push(
        new Marker({ element: buildMarker(spot.events.length, label) })
          .setLngLat([spot.lng, spot.lat])
          .setPopup(popup)
          .addTo(instance),
      );
    }

    // Frame the markers once. Later additions ("Show more") must not yank the
    // camera away from wherever the user has panned or zoomed to.
    if (spots.length === 0 || fitted.current) return;
    fitted.current = true;
    const only = spots.length === 1 ? spots[0] : undefined;
    if (only !== undefined) {
      instance.jumpTo({ center: [only.lng, only.lat], zoom: 14 });
      return;
    }
    const bounds = new LngLatBounds();
    spots.forEach((spot) => bounds.extend([spot.lng, spot.lat]));
    instance.fitBounds(bounds, { padding: 56, maxZoom: 15, animate: false });
  }, [events, ready, locale]);

  if (failed) return <MapUnavailable onShowList={onShowList} />;

  return (
    <div
      role="region"
      aria-label={t('discover.map.aria', { count: events.length })}
      className="relative overflow-hidden rounded-lg border border-line bg-surface-sunken shadow-card"
    >
      <div ref={container} className="h-[65dvh] min-h-[380px] w-full md:h-[600px]" />
      {events.length === 0 && (
        <div className="absolute inset-x-4 top-4 z-10 mx-auto flex max-w-sm flex-col items-center gap-3 rounded-lg border border-line bg-surface px-4 py-5 text-center shadow-card">
          <p role="status" className="text-md font-medium text-fg">
            {t('discover.map.empty')}
          </p>
          <Button size="sm" variant="secondary" onClick={onShowList}>
            {t('discover.map.showList')}
          </Button>
        </div>
      )}
      {hasMore && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={loadingMore}
            aria-busy={loadingMore}
            onClick={onLoadMore}
            className="shadow-card"
          >
            {loadingMore ? t('discover.loadingMore') : t('discover.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
