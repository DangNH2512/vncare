import { describe, expect, it } from 'vitest';
import {
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

  it('opens admin_console.access to every staff role', () => {
    expect(allowedRolesFor('admin_console.access')).toEqual(STAFF_ROLES);
  });

  it('throws on a key with no registered rule, rather than denying silently', () => {
    expect(() => allowedRolesFor('not.a.real.key' as PermissionKey)).toThrow();
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
