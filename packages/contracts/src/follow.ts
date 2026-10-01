import { z } from 'zod';
import { UserSummary } from './user-summary';

/** Polymorphic follow target; API v1 only accepts `user`. */
export const FollowTargetType = z.enum(['user', 'event', 'venue', 'category', 'area']);
export type FollowTargetTypeT = z.infer<typeof FollowTargetType>;

export const FollowResponse = z.object({
  userId: z.uuid(),
  following: z.literal(true),
  notify: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type FollowResponseT = z.infer<typeof FollowResponse>;

export const FollowingItem = z.object({
  user: UserSummary,
  followedAt: z.iso.datetime(),
});
export type FollowingItemT = z.infer<typeof FollowingItem>;

export const ListFollowingQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListFollowingQueryT = z.infer<typeof ListFollowingQuery>;

export const SuggestionQuery = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});
export type SuggestionQueryT = z.infer<typeof SuggestionQuery>;

export const SuggestionsResponse = z.object({
  items: z.array(UserSummary),
});
export type SuggestionsResponseT = z.infer<typeof SuggestionsResponse>;
