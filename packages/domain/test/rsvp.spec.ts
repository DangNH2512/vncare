import { describe, expect, it } from 'vitest';
import { decideRsvpOutcome, occupiesSeat, type RsvpDecisionInput } from '../src/rsvp.js';

const base: RsvpDecisionInput = {
  seatsTaken: 0,
  capacity: 20,
  viewerTrustLevel: 2,
  requiredTrustLevel: 0,
  viewerIsSuspended: false,
  existingActiveStatus: null,
  occurrenceOpen: true,
};

describe('decideRsvpOutcome', () => {
  it('confirms when a seat is free', () => {
    expect(decideRsvpOutcome({ ...base, seatsTaken: 19 })).toEqual({ kind: 'confirm' });
  });

  it('waitlists when the occurrence is full', () => {
    expect(decideRsvpOutcome({ ...base, seatsTaken: 20 })).toEqual({ kind: 'waitlist' });
  });

  it('waitlists when seatsTaken exceeds capacity (defensive)', () => {
    expect(decideRsvpOutcome({ ...base, seatsTaken: 21 })).toEqual({ kind: 'waitlist' });
  });

  it('rejects a suspended viewer before any other check', () => {
    const decision = decideRsvpOutcome({
      ...base,
      viewerIsSuspended: true,
      occurrenceOpen: false,
    });
    expect(decision).toMatchObject({ kind: 'reject', reason: 'suspended' });
  });

  it('rejects when the occurrence is closed', () => {
    expect(decideRsvpOutcome({ ...base, occurrenceOpen: false })).toMatchObject({
      kind: 'reject',
      reason: 'occurrence_closed',
    });
  });

  it('rejects a duplicate active RSVP regardless of free seats', () => {
    expect(
      decideRsvpOutcome({ ...base, existingActiveStatus: 'waitlisted' }),
    ).toMatchObject({ kind: 'reject', reason: 'already_active' });
  });

  it('rejects when trust is below the event requirement', () => {
    expect(
      decideRsvpOutcome({ ...base, viewerTrustLevel: 1, requiredTrustLevel: 2 }),
    ).toMatchObject({ kind: 'reject', reason: 'trust_too_low' });
  });

  it('every reject carries an i18n message key', () => {
    const rejects = [
      decideRsvpOutcome({ ...base, viewerIsSuspended: true }),
      decideRsvpOutcome({ ...base, occurrenceOpen: false }),
      decideRsvpOutcome({ ...base, existingActiveStatus: 'confirmed' }),
      decideRsvpOutcome({ ...base, viewerTrustLevel: 0, requiredTrustLevel: 3 }),
    ];
    for (const d of rejects) {
      expect(d.kind).toBe('reject');
      if (d.kind === 'reject') expect(d.messageKey).toMatch(/^rsvp\.error\./);
    }
  });
});

describe('occupiesSeat', () => {
  it('matches the seat-occupying semantics of the vocabulary', () => {
    expect(occupiesSeat('confirmed')).toBe(true);
    expect(occupiesSeat('held')).toBe(true);
    expect(occupiesSeat('attended')).toBe(true);
    expect(occupiesSeat('no_show')).toBe(true);
    expect(occupiesSeat('waitlisted')).toBe(false);
    expect(occupiesSeat('cancelled')).toBe(false);
  });
});
