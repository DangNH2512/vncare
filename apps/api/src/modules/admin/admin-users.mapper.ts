import type {
  AdminUserDetailResponseT,
  AdminUserListItemT,
  ExpatTypeT,
  ProfileVisibilityT,
} from '@dnc/contracts';
import type { AdminUserBaseRow, AdminUserDetailRows, AdminUserListRow } from './admin-users.repository.js';

/** Field-by-field mapping: a column added to the row never reaches the response by itself. */
export function toAdminUserListItem(row: AdminUserListRow, avatarUrl: string | null): AdminUserListItemT {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl,
    role: row.role,
    status: row.status,
    trustLevel: row.trust_level,
    emailMasked: row.email_masked,
    emailVerified: row.email_verified,
    phoneMasked: row.phone_masked,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at.toISOString(),
    lastActiveAt: row.last_active_at?.toISOString() ?? null,
    deleted: row.deleted,
  };
}

const iso = (value: Date | null): string | null => value?.toISOString() ?? null;

export function toAdminUserDetail(
  rows: AdminUserDetailRows,
  avatarUrl: string | null,
): AdminUserDetailResponseT {
  const b: AdminUserBaseRow = rows.base;
  return {
    id: b.id,
    profile: {
      handle: b.handle,
      displayName: b.display_name,
      headline: b.headline,
      bio: b.bio,
      nationalityCode: b.nationality_code,
      expatType: b.expat_type as ExpatTypeT | null,
      homeAreaId: b.home_area_id,
      inDaNangSince: b.in_da_nang_since,
      visibility: b.visibility as ProfileVisibilityT,
      avatarUrl,
      createdAt: b.profile_created_at.toISOString(),
      lastActiveAt: iso(b.last_active_at),
    },
    account: {
      role: b.role,
      status: b.status,
      suspendedUntil: iso(b.suspended_until),
      suspensionReason: b.suspension_reason,
      emailMasked: b.email_masked,
      emailVerified: b.email_verified,
      phoneMasked: b.phone_masked,
      phoneVerified: b.phone_verified,
      locale: b.locale,
      deletionRequestedAt: iso(b.deletion_requested_at),
      anonymizedAt: iso(b.anonymized_at),
      deletedAt: iso(b.deleted_at),
      legalHoldUntil: iso(b.legal_hold_until),
    },
    trust: {
      trustLevel: b.trust_level,
      trustLevelChangedAt: iso(b.trust_level_changed_at),
      signals: rows.signals.map((s) => ({
        type: s.type,
        status: s.status,
        weight: s.weight,
        verifiedAt: iso(s.verified_at),
        revokedAt: iso(s.revoked_at),
      })),
      eventsHostedCount: b.events_hosted_count,
      eventsAttendedCount: b.events_attended_count,
      noShowCount: b.no_show_count,
    },
    hostedEvents: {
      items: rows.hosted.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        startsAt: iso(e.starts_at),
      })),
      total: rows.hosted[0]?.total ?? 0,
    },
    rsvps: {
      items: rows.rsvps.map((r) => ({
        eventId: r.event_id,
        eventTitle: r.event_title,
        status: r.status,
        createdAt: r.created_at.toISOString(),
      })),
      total: rows.rsvps[0]?.total ?? 0,
    },
    posts: {
      items: rows.posts.map((p) => ({
        id: p.id,
        kind: p.kind,
        status: p.status,
        createdAt: p.created_at.toISOString(),
        excerpt: p.excerpt,
      })),
      total: rows.posts[0]?.total ?? 0,
    },
    sessions: {
      activeCount: rows.sessions[0]?.active_count ?? 0,
      recent: rows.sessions.map((s) => ({
        platform: s.platform,
        createdAt: s.created_at.toISOString(),
        expiresAt: s.expires_at.toISOString(),
        revokedAt: iso(s.revoked_at),
        revokedReason: s.revoked_reason,
      })),
    },
  };
}
