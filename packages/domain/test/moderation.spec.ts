import { describe, expect, it } from 'vitest';
import type { ModerationSeverityT, UserRoleT } from '@dnc/contracts';
import {
  auditLogScope,
  canModerateOwner,
  canRestoreEvent,
  canSeeOtherModerators,
  canSuspendRole,
  maxSeverity,
  maxSuspensionDays,
  REPORT_REASON_SEVERITY,
  reportDailyLimit,
  severityPriority,
  slaDueAt,
  slaState,
} from '../src/moderation.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const T0 = new Date('2026-09-25T01:00:00.000Z');

describe('REPORT_REASON_SEVERITY', () => {
  it('covers all twelve reasons with the brief §5 initial severity', () => {
    expect(REPORT_REASON_SEVERITY).toEqual({
      danger: 'critical',
      harassment: 'critical',
      sexual: 'critical',
      hate: 'high',
      scam: 'critical',
      ghost_event: 'high',
      impersonation: 'high',
      spam: 'normal',
      privacy: 'critical',
      illegal: 'critical',
      unsafe_setup: 'high',
      other: 'low',
    });
  });
});

describe('slaDueAt (AC-23)', () => {
  it.each([
    ['critical', 2],
    ['high', 12],
    ['normal', 48],
    ['low', 72],
  ] as const)('%s is due %i hours after the first report', (severity, hours) => {
    expect(slaDueAt(severity, T0).getTime() - T0.getTime()).toBe(hours * HOUR);
  });
});

describe('slaState (AC-23)', () => {
  const at = (severity: ModerationSeverityT, remainingMs: number) =>
    slaState(severity, new Date(T0.getTime() + remainingMs), T0);

  it('P0: 31 minutes left is normal, 30 or 29 is due soon', () => {
    expect(at('critical', 31 * MINUTE)).toBe('normal');
    expect(at('critical', 30 * MINUTE)).toBe('due_soon');
    expect(at('critical', 29 * MINUTE)).toBe('due_soon');
  });

  it.each([
    ['high', 3 * HOUR],
    ['normal', 12 * HOUR],
    ['low', 18 * HOUR],
  ] as const)('%s turns due soon at exactly 25%% of the SLA left', (severity, threshold) => {
    expect(at(severity, threshold + MINUTE)).toBe('normal');
    expect(at(severity, threshold)).toBe('due_soon');
  });

  it('is overdue at and past the deadline', () => {
    expect(at('critical', 0)).toBe('overdue');
    expect(at('low', -5 * HOUR)).toBe('overdue');
  });
});

describe('severity helpers', () => {
  it('maxSeverity only ever raises', () => {
    expect(maxSeverity('normal', 'critical')).toBe('critical');
    expect(maxSeverity('critical', 'low')).toBe('critical');
    expect(maxSeverity('high', 'high')).toBe('high');
  });

  it('maps severity to the P0..P3 label', () => {
    expect(severityPriority('critical')).toBe(0);
    expect(severityPriority('high')).toBe(1);
    expect(severityPriority('normal')).toBe(2);
    expect(severityPriority('low')).toBe(3);
  });
});

describe('reportDailyLimit (AC-9)', () => {
  it.each([
    [0, 5],
    [1, 5],
    [2, 10],
    [3, 20],
    [4, 20],
    [5, 20],
  ])('T%i may file %i reports per 24 hours', (trust, limit) => {
    expect(reportDailyLimit(trust)).toBe(limit);
  });
});

describe('who may act on whom', () => {
  const roles: readonly UserRoleT[] = ['member', 'curator', 'moderator', 'admin', 'super_admin'];

  it('canModerateOwner follows the one-rank-above rule', () => {
    const allowed = (actor: UserRoleT) => roles.filter((owner) => canModerateOwner(actor, owner));
    expect(allowed('member')).toEqual([]);
    expect(allowed('curator')).toEqual([]);
    expect(allowed('moderator')).toEqual(['member', 'curator']);
    expect(allowed('admin')).toEqual(['member', 'curator', 'moderator']);
    expect(allowed('super_admin')).toEqual(roles);
  });

  it('canSuspendRole matches AC-35', () => {
    const allowed = (actor: UserRoleT) => roles.filter((target) => canSuspendRole(actor, target));
    expect(allowed('member')).toEqual([]);
    expect(allowed('curator')).toEqual([]);
    expect(allowed('moderator')).toEqual(['member']);
    expect(allowed('admin')).toEqual(['member', 'curator', 'moderator']);
    expect(allowed('super_admin')).toEqual(roles);
  });

  it('caps a moderator at 30 days and an admin at 365', () => {
    expect(maxSuspensionDays('member')).toBe(0);
    expect(maxSuspensionDays('curator')).toBe(0);
    expect(maxSuspensionDays('moderator')).toBe(30);
    expect(maxSuspensionDays('admin')).toBe(365);
    expect(maxSuspensionDays('super_admin')).toBe(365);
  });

  it('canRestoreEvent matches AC-32', () => {
    expect(canRestoreEvent('moderator', 'suspended')).toBe(true);
    expect(canRestoreEvent('moderator', 'taken_down')).toBe(false);
    expect(canRestoreEvent('admin', 'taken_down')).toBe(true);
    expect(canRestoreEvent('super_admin', 'taken_down')).toBe(true);
    expect(canRestoreEvent('curator', 'suspended')).toBe(false);
    expect(canRestoreEvent('admin', 'published')).toBe(false);
  });

  it('only admin and above see other moderators (AC-41)', () => {
    expect(roles.filter(canSeeOtherModerators)).toEqual(['admin', 'super_admin']);
  });

  it('scopes the audit log by role (AC-44)', () => {
    expect(auditLogScope('member')).toBeNull();
    expect(auditLogScope('curator')).toBeNull();
    expect(auditLogScope('moderator')).toBe('own');
    expect(auditLogScope('admin')).toBe('all_except_super_admin');
    expect(auditLogScope('super_admin')).toBe('all');
  });
});
