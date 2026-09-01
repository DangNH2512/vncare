import type { RsvpStatusT } from '@dnc/contracts';
import { SEAT_OCCUPYING } from '@dnc/contracts';

export interface RsvpDecisionInput {
  /** Seats currently occupied (counted with SEAT_OCCUPYING semantics, under row lock). */
  seatsTaken: number;
  capacity: number;
  viewerTrustLevel: number;
  /** Minimum trust level the event requires; 0 means no requirement. */
  requiredTrustLevel: number;
  viewerIsSuspended: boolean;
  /** The viewer's currently active RSVP status on this occurrence, or null if none. */
  existingActiveStatus: RsvpStatusT | null;
  /** Whether the occurrence still accepts registrations. Computed by the caller; domain code never reads the clock. */
  occurrenceOpen: boolean;
}

export type RsvpDecision =
  | { kind: 'confirm' }
  | { kind: 'waitlist' }
  | {
      kind: 'reject';
      reason:
        | 'suspended'
        | 'trust_too_low'
        | 'already_active'
        | 'occurrence_closed';
      /** i18n key for the client-facing message; present in both en.json and vi.json. */
      messageKey: string;
    };

/**
 * Decides the RSVP outcome for a viewer against one occurrence.
 *
 * Pure decision logic shared by api, web and mobile — this function never
 * opens a transaction. Row locking and the `assert_capacity` trigger live in
 * the API repository layer; the database remains the final guard (ADR-0000).
 */
export function decideRsvpOutcome(input: RsvpDecisionInput): RsvpDecision {
  if (input.viewerIsSuspended) {
    return { kind: 'reject', reason: 'suspended', messageKey: 'rsvp.error.suspended' };
  }
  if (!input.occurrenceOpen) {
    return {
      kind: 'reject',
      reason: 'occurrence_closed',
      messageKey: 'rsvp.error.occurrenceClosed',
    };
  }
  if (input.existingActiveStatus !== null) {
    return {
      kind: 'reject',
      reason: 'already_active',
      messageKey: 'rsvp.error.alreadyRsvped',
    };
  }
  if (input.viewerTrustLevel < input.requiredTrustLevel) {
    return {
      kind: 'reject',
      reason: 'trust_too_low',
      messageKey: 'rsvp.error.trustTooLow',
    };
  }
  if (input.seatsTaken < input.capacity) {
    return { kind: 'confirm' };
  }
  return { kind: 'waitlist' };
}

/** Whether a status occupies a seat; shared by seat counters and the overbooking canary. */
export function occupiesSeat(status: RsvpStatusT): boolean {
  return SEAT_OCCUPYING.includes(status);
}
