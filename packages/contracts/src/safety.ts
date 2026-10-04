import { z } from 'zod';
import { CursorQuery } from './content';

/** One entry of the caller's own block list. Visible to nobody else. */
export const BlockedUserResponse = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  blockedAt: z.iso.datetime(),
});
export type BlockedUserResponseT = z.infer<typeof BlockedUserResponse>;

export const ListBlockQuery = CursorQuery;
export type ListBlockQueryT = z.infer<typeof ListBlockQuery>;
