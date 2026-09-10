import { describe, expect, it } from 'vitest';
import { computeTrustLevel, nextTrustRequirement, type TrustSignals } from '../src/trust.js';

const fresh: TrustSignals = {
  hasVerifiedContact: false,
  accountAgeDays: 0,
  attendedCount: 0,
  hostedCount: 0,
  noShowCount: 0,
  upheldReportsAgainst: 0,
};

// Pins the v0 placeholder ladder. Threshold changes must update these
// expectations explicitly (see the TODO in src/trust.ts).
describe('computeTrustLevel (v0 ladder)', () => {
  it('T0 for an unverified account', () => {
    expect(computeTrustLevel(fresh)).toBe(0);
  });

  it('T0 for any account with an upheld report, regardless of history', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        attendedCount: 50,
        hostedCount: 10,
        upheldReportsAgainst: 1,
      }),
    ).toBe(0);
  });

  it('T1 once contact is verified', () => {
    expect(computeTrustLevel({ ...fresh, hasVerifiedContact: true })).toBe(1);
  });

  it('T2 after first attendance on a week-old account', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 7,
        attendedCount: 1,
      }),
    ).toBe(2);
  });

  it('T3 at five attendances with a low no-show rate', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 30,
        attendedCount: 5,
      }),
    ).toBe(3);
  });

  it('T4 requires hosting at least once', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 60,
        attendedCount: 10,
        hostedCount: 1,
      }),
    ).toBe(4);
  });

  it('T5 at five hosted events with a near-zero no-show rate', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 120,
        attendedCount: 10,
        hostedCount: 5,
      }),
    ).toBe(5);
  });

  it('a high no-show rate blocks T3', () => {
    expect(
      computeTrustLevel({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 30,
        attendedCount: 5,
        noShowCount: 3,
      }),
    ).toBe(2);
  });
});

describe('nextTrustRequirement', () => {
  it('tells an unverified user to verify contact', () => {
    expect(nextTrustRequirement(fresh)).toEqual({
      nextLevel: 1,
      missingKeys: ['trust.requirement.verifyContact'],
    });
  });

  it('returns no requirements at T5', () => {
    expect(
      nextTrustRequirement({
        ...fresh,
        hasVerifiedContact: true,
        accountAgeDays: 120,
        attendedCount: 10,
        hostedCount: 5,
      }),
    ).toEqual({ nextLevel: null, missingKeys: [] });
  });

  it('every missing item is an i18n key', () => {
    const r = nextTrustRequirement({
      ...fresh,
      hasVerifiedContact: true,
      accountAgeDays: 2,
    });
    expect(r.missingKeys.length).toBeGreaterThan(0);
    for (const key of r.missingKeys) {
      expect(key).toMatch(/^trust\.requirement\./);
    }
  });

  /**
   * The stored level wins.
   *
   * `users.trust_level` is the single source of truth for the ladder. A screen
   * that recomputes it from the signals a client happens to hold will disagree
   * with the badge rendered beside it — which is exactly what happened on the
   * profile page before this override existed.
   */
  it('describes the gap from a supplied level rather than a recomputed one', () => {
    const signals: TrustSignals = {
      hasVerifiedContact: false,
      accountAgeDays: 0,
      attendedCount: 0,
      hostedCount: 0,
      noShowCount: 0,
      upheldReportsAgainst: 0,
    };

    // Recomputed, these signals are T0.
    expect(computeTrustLevel(signals)).toBe(0);
    expect(nextTrustRequirement(signals).nextLevel).toBe(1);

    // Told the account is already T1, it explains the step to T2 instead.
    const fromStored = nextTrustRequirement(signals, 1);
    expect(fromStored.nextLevel).toBe(2);
    expect(fromStored.missingKeys).toContain('trust.requirement.attendFirstEvent');
  });

  it('reports nothing left to do at the top of the ladder', () => {
    const requirement = nextTrustRequirement(
      {
        hasVerifiedContact: true,
        accountAgeDays: 400,
        attendedCount: 40,
        hostedCount: 9,
        noShowCount: 0,
        upheldReportsAgainst: 0,
      },
      5,
    );
    expect(requirement.nextLevel).toBeNull();
    expect(requirement.missingKeys).toEqual([]);
  });
});
