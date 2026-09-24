import type { AdminSystemHealthResponseT } from '@dnc/contracts';
import type { Readiness } from '../health/index.js';

/** Process-level facts folded into the response alongside the readiness checks. */
export interface AdminProcessInfo {
  environment: string;
  uptimeSeconds: number;
  checkedAt: string;
}

/**
 * Combines the shared readiness checks with process-level info for the
 * console response.
 *
 * `readiness.checks` is passed through verbatim: the admin console must
 * never render a fact about a dependency that disagrees with what the
 * public readiness probe reports for the same instant.
 */
export function toAdminSystemHealthResponse(
  readiness: Readiness,
  info: AdminProcessInfo,
): AdminSystemHealthResponseT {
  return {
    status: readiness.status,
    checks: readiness.checks,
    environment: info.environment,
    uptimeSeconds: info.uptimeSeconds,
    checkedAt: info.checkedAt,
  };
}
