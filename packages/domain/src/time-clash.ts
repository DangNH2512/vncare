import type { EventResponseT } from '@dnc/contracts';

/**
 * Schedule-clash detection and swipe-deck candidate selection.
 *
 * All comparisons run on epoch milliseconds, so results do not depend on the
 * host time zone.
 */

/**
 * Duration assumed for an event that has no usable end time. Two hours is a
 * planning heuristic, not data: callers surface `TimeClash.assumedEnd` so the
 * UI can say the overlap is approximate.
 */
export const DEFAULT_EVENT_DURATION_MINUTES = 120;

const MINUTE_MS = 60_000;

export interface ClashInput {
  id: string;
  /** ISO-8601 instant. */
  startsAt: string;
  /** ISO-8601 instant, or null when the organizer gave no end time. */
  endsAt: string | null;
}

export interface TimeClash {
  aId: string;
  bId: string;
  /** True when at least one side used the assumed default duration. */
  assumedEnd: boolean;
}

interface Span {
  id: string;
  start: number;
  end: number;
  assumed: boolean;
}

function toSpan(e: ClashInput): Span | null {
  const start = Date.parse(e.startsAt);
  if (Number.isNaN(start)) return null;
  const declared = e.endsAt === null ? Number.NaN : Date.parse(e.endsAt);
  const usable = !Number.isNaN(declared) && declared > start;
  return {
    id: e.id,
    start,
    end: usable ? declared : start + DEFAULT_EVENT_DURATION_MINUTES * MINUTE_MS,
    assumed: !usable,
  };
}

function compareSpans(x: Span, y: Span): number {
  if (x.start !== y.start) return x.start - y.start;
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

/**
 * End instant of an event in epoch milliseconds.
 *
 * Uses `endsAt` when it parses and is strictly after `startsAt`; otherwise
 * `startsAt` plus DEFAULT_EVENT_DURATION_MINUTES (120). Returns NaN when
 * `startsAt` itself is not a valid date.
 */
export function eventEndMs(e: ClashInput): number {
  return toSpan(e)?.end ?? Number.NaN;
}

function overlaps(x: Span, y: Span): boolean {
  // Strict inequalities: back-to-back events (one ends exactly when the next starts) do not clash.
  return x.start < y.end && y.start < x.end;
}

/**
 * Every overlapping pair within `items`, each pair reported once with `aId`
 * being the earlier event by (start, id). Entries with an unparseable
 * `startsAt` are ignored. Output order is deterministic.
 */
export function findTimeClashes(items: readonly ClashInput[]): TimeClash[] {
  const spans = items.map(toSpan).filter((s): s is Span => s !== null).sort(compareSpans);
  const clashes: TimeClash[] = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i] as Span;
      const b = spans[j] as Span;
      if (a.id === b.id) continue;
      if (overlaps(a, b)) clashes.push({ aId: a.id, bId: b.id, assumedEnd: a.assumed || b.assumed });
    }
  }
  return clashes;
}

/**
 * Overlaps between each of `items` and each of `fixed` (for example saved
 * events against events the viewer already joined). `aId` comes from `items`,
 * `bId` from `fixed`; pairs with the same id are skipped. Ordered by the item
 * then the fixed event, each by (start, id).
 */
export function findTimeClashesAgainst(
  items: readonly ClashInput[],
  fixed: readonly ClashInput[],
): TimeClash[] {
  const left = items.map(toSpan).filter((s): s is Span => s !== null).sort(compareSpans);
  const right = fixed.map(toSpan).filter((s): s is Span => s !== null).sort(compareSpans);
  const clashes: TimeClash[] = [];
  for (const a of left) {
    for (const b of right) {
      if (a.id === b.id) continue;
      if (overlaps(a, b)) clashes.push({ aId: a.id, bId: b.id, assumedEnd: a.assumed || b.assumed });
    }
  }
  return clashes;
}

/** The fields of an event the swipe deck needs to decide whether to show it. */
export interface DeckEvent {
  id: string;
  startsAt: string;
  /** Same union as `EventResponse.viewerRsvpStatus`, so a contract change breaks this type. */
  viewerRsvpStatus: EventResponseT['viewerRsvpStatus'];
  organizerHandle: string;
}

/**
 * Filters server-ordered events down to the cards worth showing in the swipe
 * deck, preserving input order.
 *
 * An event is dropped when it is already saved, snoozed (`skippedActiveIds`
 * holds only skips that have not expired, so an expired skip never excludes),
 * already RSVP'd, organized by the viewer, or has started (`startsAt <= now`)
 * or has an unparseable start. Full events are kept: the waitlist is a
 * valid outcome.
 */
export function selectSwipeCandidates<T>(
  events: readonly T[],
  pick: (e: T) => DeckEvent,
  ctx: {
    now: Date;
    viewerHandle: string | null;
    savedIds: ReadonlySet<string>;
    skippedActiveIds: ReadonlySet<string>;
  },
): T[] {
  const nowMs = ctx.now.getTime();
  return events.filter((event) => {
    const d = pick(event);
    if (ctx.savedIds.has(d.id) || ctx.skippedActiveIds.has(d.id)) return false;
    if (d.viewerRsvpStatus !== null) return false;
    if (ctx.viewerHandle !== null && d.organizerHandle === ctx.viewerHandle) return false;
    const start = Date.parse(d.startsAt);
    return !Number.isNaN(start) && start > nowMs;
  });
}
