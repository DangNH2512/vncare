import { describe, expect, it } from 'vitest';
import {
  ADMIN_ROLES,
  ALL_ROLES,
  allowedRolesFor,
  isStaffRole,
  MODERATION_ROLES,
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

  it('never grants a permission to member, except the member-facing safety tools', () => {
    // Reporting and blocking are safety tools every account has (doc 05 §7.9,
    // §13.10). Any other key reaching member is a console permission leaking.
    const memberFacing: readonly PermissionKey[] = ['report.create', 'block.manage'];
    for (const rule of PERMISSION_MATRIX) {
      if (memberFacing.includes(rule.key)) continue;
      expect(rule.allowedRoles).not.toContain('member');
    }
  });

  it('keeps curator out of the moderation queue and the audit log (Đ40, Đ48)', () => {
    for (const key of ['moderation.queue.view', 'moderation.action.take', 'audit_log.view'] as const) {
      expect(allowedRolesFor(key)).toEqual(MODERATION_ROLES);
      expect(allowedRolesFor(key)).not.toContain('curator');
      expect(allowedRolesFor(key)).not.toContain('member');
    }
  });

  it('restricts restoring a taken-down event to admin and super_admin', () => {
    expect(allowedRolesFor('moderation.event.restore_taken_down')).toEqual(ADMIN_ROLES);
  });

  it('opens reporting and blocking to every role', () => {
    expect(allowedRolesFor('report.create')).toEqual(ALL_ROLES);
    expect(allowedRolesFor('block.manage')).toEqual(ALL_ROLES);
  });

  it('points every rule at a doc reference', () => {
    for (const rule of PERMISSION_MATRIX) {
      expect(rule.docRef.length).toBeGreaterThan(0);
    }
  });
});
