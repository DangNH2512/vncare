import {
  ADMIN_OVERVIEW_WINDOW_DAYS,
  type AdminOverviewResponseT,
  type AdminSystemHealthResponseT,
} from '@dnc/contracts';
import type { OverviewRows } from './admin.repository.js';
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

/** Maps the overview rows field by field; nothing outside the allow-list can reach the response. */
export function toAdminOverviewResponse(rows: OverviewRows): AdminOverviewResponseT {
  return {
    windowDays: ADMIN_OVERVIEW_WINDOW_DAYS,
    generatedAt: rows.kpis.generated_at.toISOString(),
    kpis: {
      totalUsers: rows.kpis.total_users,
      newUsers: rows.kpis.new_users,
      upcomingEvents: rows.kpis.upcoming_events,
      rsvps: rows.kpis.rsvps,
      posts: rows.kpis.posts,
    },
    latestMembers: rows.members.map((row) => ({
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      trustLevel: row.trust_level,
      createdAt: row.created_at.toISOString(),
    })),
    latestEvents: rows.events.map((row) => ({
      id: row.id,
      title: row.title,
      areaId: row.area_id,
      startsAt: row.starts_at.toISOString(),
      status: row.status,
      organizer: {
        handle: row.organizer_handle,
        displayName: row.organizer_display_name,
      },
    })),
  };
}
