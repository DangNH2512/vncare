import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AuditEntityType, AuditSeverity } from '../src/audit.js';
import {
  ModerationActionType,
  ModerationActorType,
  ModerationNote,
  ModerationSeverity,
  TicketStatus,
} from '../src/moderation.js';
import { ReportCreateRequest, ReportReason, ReportTargetType } from '../src/safety.js';

const SQL_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/api/src/database/sql/0009_moderation_core.sql',
);

/**
 * Guards the moderation vocabulary shared by the Zod contracts and the
 * hand-written migration. Order is compared, not just membership: severity
 * relies on declaration order for GREATEST() and ORDER BY in the database, and
 * the console renders reasons in the order the enum lists them.
 */
describe('moderation vocabulary <-> 0009 SQL', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  const enumValues = (typeName: string): string[] => {
    const match = new RegExp(`CREATE TYPE ${typeName} AS ENUM \\(([^)]+)\\)`).exec(sql);
    expect(match, `CREATE TYPE ${typeName} present in SQL`).not.toBeNull();
    return (match as RegExpExecArray)[1]!
      .split(',')
      .map((value) => value.trim().replace(/'/g, ''));
  };

  it.each([
    ['report_target_type_enum', ReportTargetType.options],
    ['report_reason_enum', ReportReason.options],
    ['moderation_severity_enum', ModerationSeverity.options],
    ['report_status_enum', TicketStatus.options],
    ['moderation_actor_type_enum', ModerationActorType.options],
    ['moderation_action_type_enum', ModerationActionType.options],
    ['audit_entity_type_enum', AuditEntityType.options],
    ['audit_severity_enum', AuditSeverity.options],
  ] as const)('%s matches the contract, in order', (typeName, options) => {
    expect(enumValues(typeName)).toEqual([...options]);
  });

  it('severity is declared lowest first so the database can rank it', () => {
    expect(enumValues('moderation_severity_enum')).toEqual(['low', 'normal', 'high', 'critical']);
  });
});

/**
 * The CHECK constraints count code points (PostgreSQL `length()`); the schemas
 * must count the same unit, or an emoji-only note passes Zod and fails as a 500.
 */
describe('note and description length count code points', () => {
  const emoji = (n: number) => '😀'.repeat(n);

  it('rejects a note of 10 emoji and accepts 20', () => {
    expect(ModerationNote.safeParse(emoji(10)).success).toBe(false);
    expect(ModerationNote.safeParse(emoji(20)).success).toBe(true);
  });

  it('accepts a description of 2000 emoji and rejects 2001', () => {
    const base = { targetType: 'post', targetId: '0190a0f0-0000-7000-8000-000000000000', reason: 'spam' };
    expect(ReportCreateRequest.safeParse({ ...base, description: emoji(2000) }).success).toBe(true);
    expect(ReportCreateRequest.safeParse({ ...base, description: emoji(2001) }).success).toBe(false);
  });
});
