import { z } from 'zod';
import { UserRole, UserStatus } from './auth';
import { EventStatus } from './event';

export const ADMIN_REASON_MIN = 20;
export const ADMIN_REASON_MAX = 255;

/**
 * Body of every destructive admin action. `reason` is trimmed first, so 20
 * spaces never count as a reason. `confirm` must be literally `true`.
 */
export const ReasonedActionBody = z.strictObject({
  reason: z.string().trim().min(ADMIN_REASON_MIN).max(ADMIN_REASON_MAX),
  confirm: z.literal(true),
});
export type ReasonedActionBodyT = z.infer<typeof ReasonedActionBody>;

/** Roles an admin may assign; `super_admin` is never grantable through the API. */
export const AssignableRole = z.enum(['member', 'curator', 'moderator', 'admin']);
export type AssignableRoleT = z.infer<typeof AssignableRole>;

export const ChangeRoleBody = z.strictObject({
  role: AssignableRole,
  reason: ReasonedActionBody.shape.reason,
  confirm: ReasonedActionBody.shape.confirm,
});
export type ChangeRoleBodyT = z.infer<typeof ChangeRoleBody>;

/** Result of suspend / unsuspend. */
export const AdminUserActionResult = z.object({
  id: z.uuid(),
  status: UserStatus,
  role: UserRole,
  /**
   * Present, and `true`, only when the deny-list mark could not be written
   * (Redis down): the target's old access token then lives until it expires,
   * at most 15 minutes. Omitted otherwise, never sent as `false`.
   */
  sessionCutDeferred: z.boolean().optional(),
});
export type AdminUserActionResultT = z.infer<typeof AdminUserActionResult>;

/** Result of a role change. */
export const AdminRoleActionResult = z.object({
  id: z.uuid(),
  role: UserRole,
  /**
   * Present, and `true`, only when the deny-list mark could not be written
   * (Redis down): the target's old access token then lives until it expires,
   * at most 15 minutes. Omitted otherwise, never sent as `false`.
   */
  sessionCutDeferred: z.boolean().optional(),
});
export type AdminRoleActionResultT = z.infer<typeof AdminRoleActionResult>;

/** Result of event suspend / restore / takedown. */
export const AdminEventActionResult = z.object({
  id: z.uuid(),
  status: EventStatus,
});
export type AdminEventActionResultT = z.infer<typeof AdminEventActionResult>;
