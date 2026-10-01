import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_PLATFORM_ROLES,
  allowedRolesFor,
  isStaffRole,
  PERMISSION_MATRIX,
  STAFF_ROLES,
  SYSTEM_HEALTH_ROLES,
  type PermissionKey,
} from '../src/permission-matrix.js';

describe('isStaffRole', () => {
  it('admits every declared staff role', () => {
    for (const role of STAFF_ROLES) {
      expect(isStaffRole(role)).toBe(true);
    }
  });

  it('rejects member', () => {
    expect(isStaffRole('member')).toBe(false);
  });
});

describe('allowedRolesFor', () => {
  it('restricts system.health.view to admin and super_admin', () => {
    expect(allowedRolesFor('system.health.view')).toEqual(SYSTEM_HEALTH_ROLES);
  });

  it('restricts analytics.platform.view to admin and super_admin', () => {
    const roles = allowedRolesFor('analytics.platform.view');
    expect(roles).toEqual(ANALYTICS_PLATFORM_ROLES);
    expect([...roles]).toEqual(['admin', 'super_admin']);
    for (const denied of ['member', 'curator', 'moderator'] as const) {
      expect(roles).not.toContain(denied);
    }
  });

  it('opens admin_console.access to every staff role', () => {
    expect(allowedRolesFor('admin_console.access')).toEqual(STAFF_ROLES);
  });

  it('throws on a key with no registered rule, rather than denying silently', () => {
    expect(() => allowedRolesFor('not.a.real.key' as PermissionKey)).toThrow();
  });
});

describe('admin console permission table', () => {
  const ROLES = ['member', 'curator', 'moderator', 'admin', 'super_admin'] as const;
  const expected: Record<string, readonly string[]> = {
    'user.directory.view': ['admin', 'super_admin'],
    'event.directory.view': ['moderator', 'admin', 'super_admin'],
    'content.hide': ['moderator', 'admin', 'super_admin'],
    'event.takedown': ['admin', 'super_admin'],
    'user.suspend': ['admin', 'super_admin'],
    'user.role.assign': ['super_admin'],
    'audit_log.view': ['moderator', 'admin', 'super_admin'],
    'moderation.queue.view': ['moderator', 'admin', 'super_admin'],
    'moderation.decide': ['moderator', 'admin', 'super_admin'],
  };

  for (const [key, allowed] of Object.entries(expected)) {
    it(`grants ${key} to exactly ${allowed.join(', ')}`, () => {
      const roles = allowedRolesFor(key as PermissionKey);
      for (const role of ROLES) {
        expect(roles.includes(role), `${key} / ${role}`).toBe(allowed.includes(role));
      }
    });
  }

  it('has no role-based rule for report.create', () => {
    expect(() => allowedRolesFor('report.create' as PermissionKey)).toThrow();
  });
});

describe('PERMISSION_MATRIX', () => {
  it('has one entry per key, with no duplicates', () => {
    const keys = PERMISSION_MATRIX.map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never grants a permission to member', () => {
    for (const rule of PERMISSION_MATRIX) {
      expect(rule.allowedRoles).not.toContain('member');
    }
  });

  it('points every rule at a doc reference', () => {
    for (const rule of PERMISSION_MATRIX) {
      expect(rule.docRef.length).toBeGreaterThan(0);
    }
  });
});
