/**
 * Trust ladder T0-T5, computed in one place for api, web and mobile.
 *
 * TODO(BA): the thresholds below are a v0 placeholder ladder. Final thresholds
 * must be confirmed against docs/analysis/05-trust-safety-va-kiem-duyet.md
 * before S1. Unit tests pin the v0 behavior so any threshold change is an
 * explicit, reviewed edit.
 */

export interface TrustSignals {
  hasVerifiedContact: boolean;
  accountAgeDays: number;
  attendedCount: number;
  hostedCount: number;
  noShowCount: number;
  upheldReportsAgainst: number;
}

/** Returns the trust level (0-5) derived from accumulated signals. */
export function computeTrustLevel(s: TrustSignals): number {
  if (s.upheldReportsAgainst > 0) return 0;
  const attendedOrHosted = s.attendedCount + s.hostedCount;
  const noShowRate =
    attendedOrHosted + s.noShowCount === 0
      ? 0
      : s.noShowCount / (attendedOrHosted + s.noShowCount);

  if (!s.hasVerifiedContact) return 0;
  if (s.hostedCount >= 5 && noShowRate < 0.1) return 5;
  if (s.attendedCount >= 10 && s.hostedCount >= 1 && noShowRate < 0.2) return 4;
  if (s.attendedCount >= 5 && noShowRate < 0.2) return 3;
  if (s.attendedCount >= 1 && s.accountAgeDays >= 7) return 2;
  return 1;
}

export interface TrustRequirement {
  /** The next attainable level, or null when already at the top. */
  nextLevel: number | null;
  /** i18n keys describing the missing conditions, in display priority order. */
  missingKeys: string[];
}

/** Lists what the user still needs to reach the next trust level. */
export function nextTrustRequirement(s: TrustSignals): TrustRequirement {
  const current = computeTrustLevel(s);
  if (current >= 5) return { nextLevel: null, missingKeys: [] };

  const missing: string[] = [];
  switch (current) {
    case 0:
      if (s.upheldReportsAgainst > 0) missing.push('trust.requirement.resolveReports');
      if (!s.hasVerifiedContact) missing.push('trust.requirement.verifyContact');
      break;
    case 1:
      if (s.attendedCount < 1) missing.push('trust.requirement.attendFirstEvent');
      if (s.accountAgeDays < 7) missing.push('trust.requirement.accountAge7d');
      break;
    case 2:
      if (s.attendedCount < 5) missing.push('trust.requirement.attend5Events');
      break;
    case 3:
      if (s.attendedCount < 10) missing.push('trust.requirement.attend10Events');
      if (s.hostedCount < 1) missing.push('trust.requirement.hostFirstEvent');
      break;
    case 4:
      if (s.hostedCount < 5) missing.push('trust.requirement.host5Events');
      break;
  }
  return { nextLevel: current + 1, missingKeys: missing };
}
