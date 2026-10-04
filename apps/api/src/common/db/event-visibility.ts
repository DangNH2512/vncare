import { notBlockedBetween } from './block-filter.js';

/**
 * Who may see an event — the one rule, shared by every surface that hangs off
 * an event (code review CR-2, CR-8).
 *
 * An event is visible when it is not deleted, and either `published` or
 * organized by the viewer, and there is no block between the viewer and the
 * organizer. `GET /events/:id` answers 404 otherwise, so its comment thread,
 * its reactions and its attendee list must answer 404 too: a suspended or
 * taken-down event whose thread still reads 200 has not really been taken down
 * (brief §9, AC-30).
 *
 * Arguments follow block-filter.ts: a bind placeholder for the viewer (bound
 * to null for a guest) and a table alias, both constants written in the
 * repository and checked here.
 */

const PARAM = /^\$[1-9]\d{0,2}$/;
const ALIAS = /^[a-z_][a-z0-9_]*$/;

function assertShape(viewerParam: string, alias: string): void {
  if (!PARAM.test(viewerParam)) {
    throw new Error(`event-visibility: viewer must be a bind placeholder, got "${viewerParam}"`);
  }
  if (!ALIAS.test(alias)) {
    throw new Error(`event-visibility: alias must be a bare identifier, got "${alias}"`);
  }
}

/** Predicate over an `events` row aliased `alias`. */
export function eventVisibleTo(viewerParam: string, alias: string): string {
  assertShape(viewerParam, alias);
  return `(${alias}.deleted_at IS NULL
           AND (${alias}.status = 'published' OR ${alias}.organizer_id = ${viewerParam}::uuid)
           AND ${notBlockedBetween(viewerParam, `${alias}.organizer_id`)})`;
}

/**
 * Predicate over a `posts` row aliased `alias` — the `GET /posts/:id` rule:
 * not deleted, and `visible` or written by the viewer, and no block between
 * the viewer and the author. A hidden or removed post is therefore readable
 * by its author only; staff read through the moderation module's own SQL.
 */
export function postVisibleTo(viewerParam: string, alias: string): string {
  assertShape(viewerParam, alias);
  return `(${alias}.deleted_at IS NULL
           AND (${alias}.status = 'visible' OR ${alias}.author_user_id = ${viewerParam}::uuid)
           AND ${notBlockedBetween(viewerParam, `${alias}.author_user_id`)})`;
}

/**
 * Predicate over a `comments` row aliased `alias`: the thread it sits in is
 * readable by the viewer — eventVisibleTo on an event (CR-2), postVisibleTo on
 * a post (FU-5). A comment under a hidden scam post must not stay readable by
 * id: it is often where the contact details are. Correlated subqueries rather
 * than joins, so the callers' column lists and row counts are untouched.
 */
export function commentThreadVisibleTo(viewerParam: string, alias: string): string {
  assertShape(viewerParam, alias);
  return `((${alias}.event_id IS NULL OR EXISTS (
              SELECT 1 FROM events te
               WHERE te.id = ${alias}.event_id AND ${eventVisibleTo(viewerParam, 'te')}))
           AND (${alias}.post_id IS NULL OR EXISTS (
              SELECT 1 FROM posts tp
               WHERE tp.id = ${alias}.post_id AND ${postVisibleTo(viewerParam, 'tp')})))`;
}

/**
 * The state in which an event's group room accepts messages: the event is
 * live and `published`. Deliberately not viewer-relative — a suspended or
 * taken-down event's room turns read-only for everyone, the organizer
 * included (FU-2, TR-6), and group chat is outside the block filter (brief §4).
 */
export function eventRoomOpen(alias: string): string {
  if (!ALIAS.test(alias)) {
    throw new Error(`event-visibility: alias must be a bare identifier, got "${alias}"`);
  }
  return `(${alias}.deleted_at IS NULL AND ${alias}.status = 'published')`;
}
