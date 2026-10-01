import { describe, expect, it } from 'vitest';
import {
  AdminAuditItem,
  AuditDiff,
  AdminAuditListQuery,
  AuditAction,
} from '../src/admin-audit';
import {
  AdminEventActionResult,
  AdminUserActionResult,
  ChangeRoleBody,
  ReasonedActionBody,
} from '../src/admin-actions';
import { SEAT_OCCUPYING } from '../src/rsvp';
import {
  AdminEventDetailResponse,
  AdminEventListItem,
  AdminEventListQuery,
  seatsTakenFromStats,
} from '../src/admin-events';
import {
  AdminUserDetailResponse,
  AdminUserListItem,
  AdminUserListQuery,
} from '../src/admin-users';

const id = '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f';
const now = '2026-10-01T00:00:00.000Z';
const chars = (n: number) => 'x'.repeat(n);

function walkKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => walkKeys(v, keys));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      walkKeys(v, keys);
    }
  return keys;
}

describe('ReasonedActionBody', () => {
  it.each([
    [19, false],
    [20, true],
    [255, true],
    [256, false],
  ])('reason of %i chars -> %s', (len, ok) => {
    expect(ReasonedActionBody.safeParse({ reason: chars(len), confirm: true }).success).toBe(ok);
  });

  it('does not count surrounding whitespace', () => {
    expect(ReasonedActionBody.safeParse({ reason: `  ${chars(19)}  `, confirm: true }).success).toBe(false);
  });

  it('rejects confirm false, missing confirm and unknown keys', () => {
    expect(ReasonedActionBody.safeParse({ reason: chars(20), confirm: false }).success).toBe(false);
    expect(ReasonedActionBody.safeParse({ reason: chars(20) }).success).toBe(false);
    expect(ReasonedActionBody.safeParse({ reason: chars(20), confirm: true, extra: 1 }).success).toBe(false);
  });
});

describe('ChangeRoleBody', () => {
  it('accepts the four grantable roles and refuses super_admin', () => {
    for (const role of ['member', 'curator', 'moderator', 'admin'])
      expect(ChangeRoleBody.safeParse({ role, reason: chars(20), confirm: true }).success).toBe(true);
    expect(ChangeRoleBody.safeParse({ role: 'super_admin', reason: chars(20), confirm: true }).success).toBe(false);
  });

  it('applies the same reason and confirm rules', () => {
    expect(ChangeRoleBody.safeParse({ role: 'admin', reason: chars(19), confirm: true }).success).toBe(false);
    expect(ChangeRoleBody.safeParse({ role: 'admin', reason: chars(20), confirm: false }).success).toBe(false);
  });
});

describe('action results', () => {
  it('parse valid and reject unknown status', () => {
    expect(AdminUserActionResult.safeParse({ id, status: 'suspended', role: 'member' }).success).toBe(true);
    expect(AdminEventActionResult.safeParse({ id, status: 'taken_down' }).success).toBe(true);
    expect(AdminEventActionResult.safeParse({ id, status: 'archived' }).success).toBe(false);
  });
});

describe('AdminUserListQuery', () => {
  it('applies defaults and parses CSV arrays', () => {
    const q = AdminUserListQuery.parse({ role: 'moderator,admin', includeDeleted: 'true' });
    expect(q).toMatchObject({
      role: ['moderator', 'admin'],
      includeDeleted: true,
      sort: 'createdAt',
      dir: 'desc',
      limit: 25,
    });
  });

  it.each([
    [{ trustMin: '7' }],
    [{ limit: '500' }],
    [{ status: 'archived' }],
    [{ q: 'a' }],
    [{ trustMin: '4', trustMax: '2' }],
    [{ joinedFrom: now, joinedTo: now }],
    [{ includeDeleted: 'yes' }],
    [{ unknown: '1' }],
    [{ sort: 'email' }],
  ])('rejects %j', (query) => {
    expect(AdminUserListQuery.safeParse(query).success).toBe(false);
  });
});

describe('hosted event start', () => {
  it('allows a null startsAt for an event with no live occurrence', () => {
    const item = { id, title: 'Run', status: 'published', startsAt: null };
    expect(AdminUserDetailResponse.safeParse({ ...detail, hostedEvents: { items: [item], total: 1 } }).success).toBe(true);
    expect(
      AdminUserDetailResponse.safeParse({ ...detail, hostedEvents: { items: [{ ...item, startsAt: 'x' }], total: 1 } }).success,
    ).toBe(false);
  });
});

describe('date filters and host handle', () => {
  it.each(['0000-01-01T00:00:00.000Z', '1969-12-31T23:59:59.000Z', '2201-01-01T00:00:00.000Z'])(
    'rejects %s in every date filter',
    (value) => {
      expect(AdminUserListQuery.safeParse({ joinedFrom: value }).success).toBe(false);
      expect(AdminEventListQuery.safeParse({ startsTo: value }).success).toBe(false);
      expect(AdminEventListQuery.safeParse({ createdFrom: value }).success).toBe(false);
      expect(AdminAuditListQuery.safeParse({ from: value }).success).toBe(false);
    },
  );

  it('accepts an instant inside the supported years', () => {
    expect(AdminUserListQuery.safeParse({ joinedFrom: '2026-01-01T00:00:00.000Z' }).success).toBe(true);
    expect(AdminAuditListQuery.safeParse({ to: '1970-01-01T00:00:00.000Z' }).success).toBe(true);
  });

  it('restricts hostHandle to the handle charset', () => {
    for (const hostHandle of ['\u0000', 'a b', 'x'.repeat(25), '']) {
      expect(AdminEventListQuery.safeParse({ hostHandle }).success).toBe(false);
    }
    expect(AdminEventListQuery.safeParse({ hostHandle: 'Anna_01' }).success).toBe(true);
  });
});

describe('AuditDiff key families', () => {
  it.each([
    'emailVerified', 'contact_email', 'phoneVerifiedAt', 'newPassword', 'passwordResetAt',
    'accessToken', 'refresh_token', 'otp', 'otpCode', 'ipAddress', 'clientIp', 'client_ip',
    'ip_address', 'ipaddress', 'IP',
  ])('blocks %s', (key) => {
    expect(AuditDiff.safeParse({ [key]: 'x' }).success).toBe(false);
  });

  it.each(['description', 'ship', 'relationship', 'status', 'role', 'reason', 'title', 'tripId', 'shipping'])(
    'keeps %s legal',
    (key) => {
      expect(AuditDiff.safeParse({ [key]: 'x' }).success).toBe(true);
    },
  );
});

describe('search text', () => {
  it.each(['\u0000ab', 'a\u0000b', 'ab\u0007', 'a\nb', 'ab\u007f'])('rejects %j in q', (q) => {
    expect(AdminUserListQuery.safeParse({ q }).success).toBe(false);
    expect(AdminEventListQuery.safeParse({ q }).success).toBe(false);
  });

  it('keeps accepting ordinary and non-ASCII text', () => {
    expect(AdminUserListQuery.safeParse({ q: 'Müller 42' }).success).toBe(true);
    expect(AdminEventListQuery.safeParse({ q: 'Yoga ở Mỹ Khê' }).success).toBe(true);
  });
});

describe('AdminEventListQuery', () => {
  it('defaults timing to all and rejects an inverted range', () => {
    expect(AdminEventListQuery.parse({}).timing).toBe('all');
    expect(
      AdminEventListQuery.safeParse({ startsFrom: '2026-10-02T00:00:00.000Z', startsTo: now }).success,
    ).toBe(false);
    expect(AdminEventListQuery.safeParse({ timing: 'soon' }).success).toBe(false);
  });
});

describe('AdminAuditListQuery and AuditAction', () => {
  it('accepts the six actions and rejects malformed ones', () => {
    for (const a of [
      'user.suspended',
      'user.unsuspended',
      'user.role_changed',
      'event.suspended',
      'event.restored',
      'event.taken_down',
    ])
      expect(AuditAction.safeParse(a).success).toBe(true);
    for (const a of ['User.suspended', 'suspended', 'user.', 'user-x.y'])
      expect(AuditAction.safeParse(a).success).toBe(false);
  });

  it('parses CSV filters and rejects an unknown severity', () => {
    expect(AdminAuditListQuery.parse({ severity: 'warning,critical' }).severity).toEqual(['warning', 'critical']);
    expect(AdminAuditListQuery.safeParse({ severity: 'fatal' }).success).toBe(false);
  });
});

describe('AdminAuditItem', () => {
  it('drops ip and userAgent', () => {
    const parsed = AdminAuditItem.parse({
      id,
      createdAt: now,
      actor: { id, handle: 'root', role: 'admin' },
      action: 'user.suspended',
      entityType: 'user',
      entityId: id,
      severity: 'warning',
      reason: chars(20),
      before: { status: 'active' },
      after: { status: 'suspended' },
      ip: '1.2.3.4',
      userAgent: 'curl',
    });
    expect(walkKeys(parsed)).not.toContain('ip');
    expect(walkKeys(parsed)).not.toContain('userAgent');
  });
});

const listItem = {
  id,
  handle: 'anna',
  displayName: 'Anna',
  avatarUrl: null,
  role: 'member',
  status: 'active',
  trustLevel: 1,
  emailMasked: 'a***@gmail.com',
  emailVerified: true,
  phoneMasked: null,
  phoneVerified: false,
  createdAt: now,
  lastActiveAt: null,
  deleted: false,
};

describe('AdminUserListItem', () => {
  it('accepts a masked row and refuses a raw email', () => {
    expect(AdminUserListItem.safeParse(listItem).success).toBe(true);
    expect(AdminUserListItem.safeParse({ ...listItem, emailMasked: 'anna@gmail.com' }).success).toBe(false);
  });

  it('accepts a null masked email and refuses a raw one', () => {
    expect(AdminUserListItem.safeParse({ ...listItem, emailMasked: null }).success).toBe(true);
    expect(AdminUserListItem.safeParse({ ...listItem, emailMasked: 'a@b.com' }).success).toBe(false);
  });

  it('strips email and phone', () => {
    const parsed = AdminUserListItem.parse({ ...listItem, email: 'anna@gmail.com', phone: '+84901234567' });
    expect(parsed).not.toHaveProperty('email');
    expect(parsed).not.toHaveProperty('phone');
  });
});

const detail = {
  id,
  profile: {
    handle: 'anna',
    displayName: 'Anna',
    headline: null,
    bio: null,
    nationalityCode: 'DE',
    expatType: null,
    homeAreaId: null,
    inDaNangSince: null,
    visibility: 'public',
    avatarUrl: null,
    createdAt: now,
    lastActiveAt: now,
  },
  account: {
    role: 'member',
    status: 'active',
    suspendedUntil: null,
    suspensionReason: null,
    emailMasked: 'a***@gmail.com',
    emailVerified: true,
    phoneMasked: '*** *** 678',
    phoneVerified: true,
    locale: 'en',
    deletionRequestedAt: null,
    anonymizedAt: null,
    deletedAt: null,
    legalHoldUntil: null,
  },
  trust: {
    trustLevel: 2,
    trustLevelChangedAt: now,
    signals: [{ type: 'email_verified', status: 'active', weight: 1, verifiedAt: now, revokedAt: null }],
    eventsHostedCount: 1,
    eventsAttendedCount: 2,
    noShowCount: 0,
  },
  hostedEvents: { items: [{ id, title: 'Run', status: 'published', startsAt: now }], total: 1 },
  rsvps: { items: [{ eventId: id, eventTitle: 'Run', status: 'confirmed', createdAt: now }], total: 1 },
  posts: { items: [{ id, kind: 'notice', status: 'visible', createdAt: now, excerpt: 'hi' }], total: 1 },
  sessions: {
    activeCount: 1,
    recent: [{ platform: 'web', createdAt: now, expiresAt: now, revokedAt: null, revokedReason: null }],
  },
};

describe('AdminUserDetailResponse', () => {
  it('parses a valid detail and rejects a missing block', () => {
    expect(AdminUserDetailResponse.safeParse(detail).success).toBe(true);
    const { sessions: _omit, ...rest } = detail;
    expect(AdminUserDetailResponse.safeParse(rest).success).toBe(false);
  });

  it('drops email, phone, birthYear, gender and ip anywhere in the tree', () => {
    const parsed = AdminUserDetailResponse.parse({
      ...detail,
      email: 'anna@gmail.com',
      profile: { ...detail.profile, birthYear: 1990, gender: 'f' },
      account: { ...detail.account, email: 'anna@gmail.com', phone: '+84901234567' },
      trust: {
        ...detail.trust,
        signals: [{ ...detail.trust.signals[0], metadata: { a: 1 }, evidenceId: id, issuedBy: id }],
      },
      sessions: {
        ...detail.sessions,
        recent: [{ ...detail.sessions.recent[0], ip: '1.2.3.4', userAgent: 'x', deviceId: 'd', tokenHash: 'h' }],
      },
    });
    const keys = walkKeys(parsed);
    for (const banned of [
      'email', 'phone', 'birthYear', 'gender', 'ip', 'userAgent', 'deviceId', 'tokenHash', 'metadata', 'evidenceId', 'issuedBy',
    ])
      expect(keys).not.toContain(banned);
  });

  it('caps bio at 500 characters', () => {
    const bad = { ...detail, profile: { ...detail.profile, bio: chars(501) } };
    expect(AdminUserDetailResponse.safeParse(bad).success).toBe(false);
  });
});

const stats = { confirmed: 6, held: 1, waitlisted: 3, cancelled: 4, attended: 0, noShow: 0, waitlistWaiting: 3, seatsTaken: 7 };
const eventDetail = {
  id,
  slug: 'run',
  title: 'Run',
  description: null,
  areaId: id,
  lat: 16.06,
  lng: 108.24,
  status: 'draft',
  isFeatured: false,
  requiredTrustLevel: 0,
  createdAt: now,
  updatedAt: now,
  host: { id, handle: 'h', displayName: 'H', trustLevel: 2, role: 'member', status: 'active' },
  occurrences: [{ id, startsAt: now, endsAt: null, capacity: 20, stats }],
  commentCount: 0,
};

describe('admin events', () => {
  it('detail drops host email and phone', () => {
    const parsed = AdminEventDetailResponse.parse({
      ...eventDetail,
      host: { ...eventDetail.host, email: 'h@x.co', phone: '+84901234567' },
    });
    const keys = walkKeys(parsed);
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('phone');
  });

  it('draft list row may carry null schedule fields', () => {
    expect(
      AdminEventListItem.safeParse({
        id,
        title: 'T',
        status: 'draft',
        areaId: null,
        startsAt: null,
        endsAt: null,
        capacity: null,
        seatsTaken: null,
        waitlistWaiting: null,
        organizer: { id, handle: 'h', displayName: 'H' },
        createdAt: now,
      }).success,
    ).toBe(true);
  });

  it('seatsTakenFromStats follows SEAT_OCCUPYING (6/1/3/2 -> 7)', () => {
    expect(seatsTakenFromStats({ confirmed: 6, held: 1, attended: 0, noShow: 0 })).toBe(7);
    expect(seatsTakenFromStats({ confirmed: 2, held: 1, attended: 3, noShow: 1 })).toBe(7);
  });
});

describe('review fixes', () => {
  it('AuditSeverity accepts info', () => {
    expect(AdminAuditListQuery.parse({ severity: 'info,notice' }).severity).toEqual(['info', 'notice']);
  });

  it('phoneMasked must be masked, raw numbers are refused', () => {
    expect(AdminUserListItem.safeParse({ ...listItem, phoneMasked: '*** *** 678' }).success).toBe(true);
    expect(AdminUserListItem.safeParse({ ...listItem, phoneMasked: '+84901234567' }).success).toBe(false);
    const raw = { ...detail, account: { ...detail.account, phoneMasked: '+84901234567' } };
    expect(AdminUserDetailResponse.safeParse(raw).success).toBe(false);
  });

  it('AuditDiff refuses forbidden keys at any depth', () => {
    expect(AuditDiff.safeParse({ status: 'active' }).success).toBe(true);
    expect(AuditDiff.safeParse(null).success).toBe(true);
    const keys = [
      'email', 'phone', 'ip', 'userAgent', 'birthYear', 'gender', 'tokenHash',
      'password_hash', 'passwordHash', 'user_agent', 'Email', 'phoneNumber', 'phone_number',
      'device-id', 'deviceId', 'evidence_id', 'birth_year', 'token_hash', 'IP',
    ];
    for (const k of keys) {
      expect(AuditDiff.safeParse({ [k]: 'x' }).success).toBe(false);
      expect(AuditDiff.safeParse({ a: { b: [{ [k]: 'x' }] } }).success).toBe(false);
    }
  });

  it('AdminAuditItem entityType is an enum', () => {
    const row = {
      id, createdAt: now, actor: { id, handle: 'r', role: 'admin' }, action: 'user.suspended',
      entityType: 'user', entityId: id, severity: 'info', reason: null, before: null, after: null,
    };
    expect(AdminAuditItem.safeParse(row).success).toBe(true);
    expect(AdminAuditItem.safeParse({ ...row, entityType: 'planet' }).success).toBe(false);
    expect(AdminAuditItem.safeParse({ ...row, after: { email: 'a@b.co' } }).success).toBe(false);
  });

  it('date ranges compare instants, not strings', () => {
    const a = '2026-10-01T00:00:00Z';
    const b = '2026-10-01T00:00:00.500Z';
    expect(AdminUserListQuery.safeParse({ joinedFrom: a, joinedTo: b }).success).toBe(true);
    expect(AdminUserListQuery.safeParse({ joinedFrom: b, joinedTo: a }).success).toBe(false);
    expect(AdminEventListQuery.safeParse({ startsFrom: a, startsTo: b }).success).toBe(true);
    expect(AdminEventListQuery.safeParse({ createdFrom: b, createdTo: a }).success).toBe(false);
    expect(AdminAuditListQuery.safeParse({ from: a, to: b }).success).toBe(true);
    expect(AdminAuditListQuery.safeParse({ from: b, to: a }).success).toBe(false);
  });

  it('ChangeRoleBody rejects unknown keys and trims reason', () => {
    const ok = { role: 'admin', reason: `  ${chars(20)}  `, confirm: true };
    expect(ChangeRoleBody.parse(ok).reason).toBe(chars(20));
    expect(ChangeRoleBody.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });

  it('AdminAuditListQuery rejects inverted range and unknown params', () => {
    expect(AdminAuditListQuery.safeParse({ from: '2026-10-02T00:00:00.000Z', to: now }).success).toBe(false);
    expect(AdminAuditListQuery.safeParse({ nope: '1' }).success).toBe(false);
  });

  it('AdminEventListQuery rejects unknown params and archived status', () => {
    expect(AdminEventListQuery.safeParse({ nope: '1' }).success).toBe(false);
    expect(AdminEventListQuery.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('empty CSV is rejected', () => {
    expect(AdminUserListQuery.safeParse({ role: '' }).success).toBe(false);
  });

  it('seatsTakenFromStats covers exactly SEAT_OCCUPYING', () => {
    const map: Record<string, number> = { confirmed: 1, held: 10, attended: 100, no_show: 1000 };
    expect([...SEAT_OCCUPYING].every((s) => s in map)).toBe(true);
    const expected = SEAT_OCCUPYING.reduce((n, s) => n + (map[s] ?? 0), 0);
    expect(seatsTakenFromStats({ confirmed: 1, held: 10, attended: 100, noShow: 1000 })).toBe(expected);
  });
});
