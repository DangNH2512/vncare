/**
 * The one SQL fragment every member-facing read uses to apply blocks.
 *
 * A row in `blocks` is one-directional as data (only the blocker can lift it)
 * but two-directional in effect (brief moderation-core §6, S5-DoD-8): when A
 * has blocked B, or B has blocked A, neither sees the other's events, posts,
 * comments or profile. Every surface asks the same question through this file
 * so the two directions can never drift apart between modules (task board D5).
 *
 * Both arguments are spliced into SQL, so both must be constants written in
 * the repository — a bind-parameter placeholder (`$2`) and a column reference
 * (`e.organizer_id`). They are validated against a closed shape and a bad one
 * throws at the call site; no request value can ever reach them.
 *
 * Moderation reads (console, report target resolution) deliberately do not
 * use this: blocking must never hide content from the safety channel (AC-7,
 * AC-18).
 */

/** A bind-parameter placeholder such as `$1`. */
const PARAM = /^\$[1-9]\d{0,2}$/;

/** `alias.column`, `column`, or a placeholder cast to uuid (`$2::uuid`). */
const OTHER = /^(?:[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?|\$[1-9]\d{0,2}::uuid)$/;

function assertShape(viewerParam: string, otherColumn: string): void {
  if (!PARAM.test(viewerParam)) {
    throw new Error(`block-filter: viewer must be a bind placeholder, got "${viewerParam}"`);
  }
  if (!OTHER.test(otherColumn)) {
    throw new Error(`block-filter: other side must be a column reference, got "${otherColumn}"`);
  }
}

/** True when a block exists between the two people, in either direction. */
function blockExists(viewer: string, other: string): string {
  return `EXISTS (SELECT 1 FROM blocks bl
                   WHERE (bl.blocker_user_id = ${viewer} AND bl.blocked_user_id = ${other})
                      OR (bl.blocker_user_id = ${other} AND bl.blocked_user_id = ${viewer}))`;
}

/**
 * Predicate that keeps a row only when the viewer and the person in
 * `otherColumn` have no block between them.
 *
 * An anonymous viewer (the parameter bound to null) passes everything: guests
 * have no block list, and their reads must stay exactly as they were.
 */
export function notBlockedBetween(viewerParam: string, otherColumn: string): string {
  assertShape(viewerParam, otherColumn);
  const viewer = `${viewerParam}::uuid`;
  return `(${viewer} IS NULL OR NOT ${blockExists(viewer, otherColumn)})`;
}

/**
 * The inverse, for the places that need the answer as a value rather than a
 * filter — the RSVP lock reads it as a column, chat as a single boolean.
 * False for an anonymous viewer.
 */
export function blockedBetween(viewerParam: string, otherColumn: string): string {
  assertShape(viewerParam, otherColumn);
  const viewer = `${viewerParam}::uuid`;
  return `(${viewer} IS NOT NULL AND ${blockExists(viewer, otherColumn)})`;
}
