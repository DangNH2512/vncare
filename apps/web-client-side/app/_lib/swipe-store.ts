'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { eventEndMs } from '@dnc/domain';

import { useAuth } from '../_components/auth-provider';
import { removeSwipeKey, SWIPE_KEY_PREFIX } from './swipe-cleanup';

/**
 * Device-local store for the Discover "Swipe" mode.
 *
 * Saved and skipped events live only in this browser (`localStorage`), keyed per
 * owner so a signed-in user's list never mixes with the guest list. Nothing
 * here touches the API: saving is not signing up.
 */

const KEY_PREFIX = SWIPE_KEY_PREFIX;
const GUEST_KEY = 'guest';
const SCHEMA_VERSION = 1;
/** Hard cap on saved events; `addSaved` refuses beyond it. */
export const MAX_SAVED = 50;

export interface SavedItem {
  id: string;
  /** ISO timestamp of when the user saved the event. */
  savedAt: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  areaId: string;
}

export interface SkippedItem {
  id: string;
  /** ISO timestamp after which the event may be shown again. */
  until: string;
}

interface StoredData {
  version: 1;
  saved: SavedItem[];
  skipped: SkippedItem[];
  coachDismissed: boolean;
}

export interface SwipeSnapshot {
  saved: readonly SavedItem[];
  skipped: readonly SkippedItem[];
  coachDismissed: boolean;
  /** True when storage is unusable and data only lives in memory for this tab. */
  degraded: boolean;
}

const EMPTY_SNAPSHOT: SwipeSnapshot = Object.freeze({
  saved: Object.freeze([]) as readonly SavedItem[],
  skipped: Object.freeze([]) as readonly SkippedItem[],
  coachDismissed: false,
  degraded: false,
});

/* ----------------------------- storage layer ----------------------------- */

/** In-memory fallback used once the browser refuses reads or writes. */
const memory = new Map<string, string>();
let degraded = false;

function storage(): Storage | null {
  try {
    // Merely touching `localStorage` throws in some private modes.
    return window.localStorage;
  } catch {
    degraded = true;
    return null;
  }
}

function rawGet(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  const s = storage();
  if (s === null) return null;
  try {
    return s.getItem(key);
  } catch {
    degraded = true;
    return null;
  }
}

function rawSet(key: string, value: string): void {
  const s = storage();
  if (s !== null) {
    try {
      s.setItem(key, value);
      memory.delete(key);
      return;
    } catch {
      degraded = true;
    }
  }
  memory.set(key, value);
}

function rawRemove(key: string): void {
  memory.delete(key);
  const s = storage();
  if (s === null) return;
  try {
    s.removeItem(key);
  } catch {
    degraded = true;
  }
}

/* ------------------------------- validation ------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIso(v: unknown): v is string {
  return typeof v === 'string' && Number.isFinite(Date.parse(v));
}

function parseSaved(v: unknown): SavedItem | null {
  if (!isRecord(v)) return null;
  const { id, savedAt, title, startsAt, endsAt, areaId } = v;
  if (typeof id !== 'string' || id === '') return null;
  if (!isIso(savedAt) || typeof title !== 'string' || !isIso(startsAt)) return null;
  if (endsAt !== null && !isIso(endsAt)) return null;
  if (typeof areaId !== 'string') return null;
  return { id, savedAt, title, startsAt, endsAt, areaId };
}

function parseSkipped(v: unknown): SkippedItem | null {
  if (!isRecord(v)) return null;
  const { id, until } = v;
  if (typeof id !== 'string' || id === '' || !isIso(until)) return null;
  return { id, until };
}

function emptyData(): StoredData {
  return { version: SCHEMA_VERSION, saved: [], skipped: [], coachDismissed: false };
}

/** Parses defensively: anything unexpected yields an empty list, never a throw. */
function parseData(raw: string | null): StoredData {
  if (raw === null) return emptyData();
  try {
    const json: unknown = JSON.parse(raw);
    if (!isRecord(json) || json.version !== SCHEMA_VERSION) return emptyData();
    const seenSaved = new Set<string>();
    const saved: SavedItem[] = [];
    if (Array.isArray(json.saved)) {
      for (const entry of json.saved) {
        const item = parseSaved(entry);
        if (item !== null && !seenSaved.has(item.id) && saved.length < MAX_SAVED) {
          seenSaved.add(item.id);
          saved.push(item);
        }
      }
    }
    const seenSkipped = new Set<string>();
    const skipped: SkippedItem[] = [];
    if (Array.isArray(json.skipped)) {
      for (const entry of json.skipped) {
        const item = parseSkipped(entry);
        if (item !== null && !seenSkipped.has(item.id)) {
          seenSkipped.add(item.id);
          skipped.push(item);
        }
      }
    }
    return { version: SCHEMA_VERSION, saved, skipped, coachDismissed: json.coachDismissed === true };
  } catch {
    return emptyData();
  }
}

/** Drops saved events that already ended and skips whose hide window passed. */
function prune(data: StoredData, nowMs: number): { data: StoredData; changed: boolean } {
  const saved = data.saved.filter((s) => eventEndMs(s) > nowMs);
  const skipped = data.skipped.filter((s) => Date.parse(s.until) > nowMs);
  const changed = saved.length !== data.saved.length || skipped.length !== data.skipped.length;
  return { data: changed ? { ...data, saved, skipped } : data, changed };
}

function read(ownerKey: string): StoredData {
  const key = KEY_PREFIX + ownerKey;
  const { data, changed } = prune(parseData(rawGet(key)), Date.now());
  if (changed) rawSet(key, JSON.stringify(data));
  return data;
}

function write(ownerKey: string, data: StoredData): void {
  rawSet(KEY_PREFIX + ownerKey, JSON.stringify(data));
}

/* ---------------------------- external store ----------------------------- */

const listeners = new Set<() => void>();
/** Stable snapshots per owner so `useSyncExternalStore` sees identical references. */
const cache = new Map<string, SwipeSnapshot>();

function emit(): void {
  for (const l of listeners) l();
}

function invalidate(ownerKey?: string): void {
  if (ownerKey === undefined) cache.clear();
  else cache.delete(ownerKey);
  emit();
}

function snapshotFor(ownerKey: string): SwipeSnapshot {
  const hit = cache.get(ownerKey);
  if (hit !== undefined) return hit;
  const data = read(ownerKey);
  const snap: SwipeSnapshot = {
    saved: data.saved,
    skipped: data.skipped,
    coachDismissed: data.coachDismissed,
    degraded,
  };
  cache.set(ownerKey, snap);
  return snap;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent): void => {
    // `key === null` means the whole storage was cleared.
    if (e.key === null || e.key.startsWith(KEY_PREFIX)) invalidate();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function mutate(ownerKey: string, fn: (data: StoredData) => StoredData | null): boolean {
  const current = read(ownerKey);
  const next = fn(current);
  if (next === null) return false;
  write(ownerKey, next);
  invalidate(ownerKey);
  return true;
}

/* -------------------------------- merging -------------------------------- */

/** Moves the guest list into the signed-in user's list, then removes the guest key. */
function mergeGuestInto(userId: string): void {
  const guestKey = KEY_PREFIX + GUEST_KEY;
  if (rawGet(guestKey) === null) return;
  const guest = read(GUEST_KEY);
  const mine = read(userId);

  const byId = new Map<string, SavedItem>();
  for (const item of [...mine.saved, ...guest.saved]) {
    const prev = byId.get(item.id);
    if (prev === undefined || Date.parse(item.savedAt) < Date.parse(prev.savedAt)) {
      byId.set(item.id, item);
    }
  }
  const saved = [...byId.values()]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, MAX_SAVED);

  const skip = new Map<string, SkippedItem>();
  for (const item of [...mine.skipped, ...guest.skipped]) {
    const prev = skip.get(item.id);
    if (prev === undefined || Date.parse(item.until) > Date.parse(prev.until)) {
      skip.set(item.id, item);
    }
  }

  write(userId, {
    version: SCHEMA_VERSION,
    saved,
    skipped: [...skip.values()],
    coachDismissed: mine.coachDismissed || guest.coachDismissed,
  });
  rawRemove(guestKey);
  invalidate();
}

/** Removes a user's swipe data on deliberate sign-out. The guest list is untouched. */
export function clearSwipeData(userId: string): void {
  rawRemove(KEY_PREFIX + userId);
  removeSwipeKey(userId);
  invalidate(userId);
}

/* --------------------------------- hook ---------------------------------- */

export interface SwipeStore extends SwipeSnapshot {
  /** Returns `'full'` (and writes nothing) once {@link MAX_SAVED} is reached. */
  addSaved: (item: Omit<SavedItem, 'savedAt'>) => 'ok' | 'full';
  removeSaved: (id: string) => void;
  addSkipped: (item: SkippedItem) => void;
  removeSkipped: (id: string) => void;
  dismissCoach: () => void;
}

/**
 * Reactive view of one owner's swipe data.
 *
 * @param ownerKey `'guest'` or the signed-in user's id.
 */
export function useSwipeStore(ownerKey: string): SwipeStore {
  const { loading } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => snapshotFor(ownerKey),
    () => EMPTY_SNAPSHOT,
  );

  // Merge once per owner change, and only after the session has settled so a
  // slow refresh is never mistaken for "still a guest".
  const mergedFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || ownerKey === GUEST_KEY || mergedFor.current === ownerKey) return;
    mergedFor.current = ownerKey;
    mergeGuestInto(ownerKey);
  }, [loading, ownerKey]);

  const addSaved = useCallback(
    (item: Omit<SavedItem, 'savedAt'>): 'ok' | 'full' => {
      let result: 'ok' | 'full' = 'ok';
      mutate(ownerKey, (data) => {
        if (data.saved.some((s) => s.id === item.id)) return null;
        if (data.saved.length >= MAX_SAVED) {
          result = 'full';
          return null;
        }
        const entry: SavedItem = {
          id: item.id,
          savedAt: new Date().toISOString(),
          title: item.title,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          areaId: item.areaId,
        };
        return { ...data, saved: [...data.saved, entry] };
      });
      return result;
    },
    [ownerKey],
  );

  const removeSaved = useCallback(
    (id: string) => {
      mutate(ownerKey, (data) =>
        data.saved.some((s) => s.id === id)
          ? { ...data, saved: data.saved.filter((s) => s.id !== id) }
          : null,
      );
    },
    [ownerKey],
  );

  const addSkipped = useCallback(
    (item: SkippedItem) => {
      mutate(ownerKey, (data) => ({
        ...data,
        skipped: [...data.skipped.filter((s) => s.id !== item.id), { id: item.id, until: item.until }],
      }));
    },
    [ownerKey],
  );

  const removeSkipped = useCallback(
    (id: string) => {
      mutate(ownerKey, (data) =>
        data.skipped.some((s) => s.id === id)
          ? { ...data, skipped: data.skipped.filter((s) => s.id !== id) }
          : null,
      );
    },
    [ownerKey],
  );

  const dismissCoach = useCallback(() => {
    mutate(ownerKey, (data) => (data.coachDismissed ? null : { ...data, coachDismissed: true }));
  }, [ownerKey]);

  return useMemo(
    () => ({ ...snapshot, addSaved, removeSaved, addSkipped, removeSkipped, dismissCoach }),
    [snapshot, addSaved, removeSaved, addSkipped, removeSkipped, dismissCoach],
  );
}
