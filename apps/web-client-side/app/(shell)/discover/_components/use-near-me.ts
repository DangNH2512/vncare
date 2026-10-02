'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type NearMeStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

/** Three decimals is roughly 110 m: enough for "within 2 km", too coarse to locate a home. */
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Browser geolocation for the "Near me" filter.
 *
 * Coordinates live only in this hook's state: they are rounded before they are
 * stored and never reach the URL, storage or logs.
 */
export function useNearMe() {
  const [status, setStatus] = useState<NearMeStatus>('idle');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Asks for the position. Resolves with the rounded coordinates, or null on any failure. */
  const request = useCallback((): Promise<Coordinates | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      return Promise.resolve(null);
    }
    setStatus('locating');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const rounded = {
            lat: round3(position.coords.latitude),
            lng: round3(position.coords.longitude),
          };
          if (alive.current) {
            setCoords(rounded);
            setStatus('ready');
          }
          resolve(rounded);
        },
        (failure) => {
          if (alive.current) {
            setCoords(null);
            setStatus(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable');
          }
          resolve(null);
        },
        { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false },
      );
    });
  }, []);

  const reset = useCallback(() => {
    setCoords(null);
    setStatus('idle');
  }, []);

  return { status, coords, request, reset };
}

/** True only when the browser has already been granted location access (no prompt can appear). */
export async function isLocationGranted(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted';
  } catch {
    return false;
  }
}
