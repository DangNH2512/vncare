import { z } from 'zod';
import { UserRole } from './auth';
import { CursorQuery } from './content';
import { ModerationActorType, UserRef } from './moderation';

/** `group.action`. Grows as non-moderation staff actions start writing here. */
export const AuditAction = z.enum([
  'moderation.content_hidden',
  'moderation.content_restored',
  'moderation.event_suspended',
  'moderation.event_taken_down',
  'moderation.event_restored',
  'moderation.user_suspended',
  'moderation.user_unsuspended',
  'moderation.report_dismissed',
  'moderation.severity_changed',
]);
export type AuditActionT = z.infer<typeof AuditAction>;

export const AuditEntityType = z.enum(['post', 'comment', 'event', 'user', 'moderation_ticket']);
export type AuditEntityTypeT = z.infer<typeof AuditEntityType>;

export const AuditSeverity = z.enum(['info', 'notice', 'warning', 'critical']);
export type AuditSeverityT = z.infer<typeof AuditSeverity>;

/**
 * Filters. The caller's role narrows the result further server-side:
 * moderator → own entries only; admin → all but super_admin actors; super_admin → all.
 */
export const AuditLogQuery = CursorQuery.extend({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  action: AuditAction.optional(),
  actorUserId: z.uuid().optional(),
  entityType: AuditEntityType.optional(),
});
export type AuditLogQueryT = z.infer<typeof AuditLogQuery>;

export const AuditLogResponse = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  actorType: ModerationActorType,
  /** Null for the system. */
  actor: UserRef.nullable(),
  actorRole: UserRole.nullable(),
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: z.uuid(),
  /** Changed fields only; never email, phone or content bodies. */
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  reasonCode: z.string().nullable(),
  note: z.string().nullable(),
  severity: AuditSeverity,
  requestId: z.string().nullable(),
});
export type AuditLogResponseT = z.infer<typeof AuditLogResponse>;
