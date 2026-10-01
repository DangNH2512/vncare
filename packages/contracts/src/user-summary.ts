import { z } from 'zod';

/**
 * Minimal identity of a member as any reader may see it next to their content.
 *
 * Declared field by field so a column added to an account never reaches a
 * stranger by accident: no email, no role, no status.
 */
export const UserSummary = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  trustLevel: z.number().int().min(0).max(5),
});
export type UserSummaryT = z.infer<typeof UserSummary>;
