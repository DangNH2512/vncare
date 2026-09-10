import { z } from 'zod';
import { BodyLocale, ContentStatus, CursorQuery } from './content';
import { ReactionKind } from './reaction';

/** Commentable surfaces. The target itself comes from the route, never from the body. */
export const CommentTarget = z.enum(['post', 'event']);
export type CommentTargetT = z.infer<typeof CommentTarget>;

/**
 * Threads are two levels deep. `parentId` pointing at a reply is accepted and
 * flattened onto level 1 rather than rejected: the client should not have to
 * track which of two visually identical rows is a root.
 */
export const CommentCreateRequest = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.uuid().optional(),
  /** Narrows an event comment to one occurrence ("is this week's session still on?"). */
  occurrenceId: z.uuid().optional(),
  bodyLocale: BodyLocale.optional(),
  mentionedUserIds: z.array(z.uuid()).max(10).default([]),
});
export type CommentCreateRequestT = z.infer<typeof CommentCreateRequest>;

/** Editing never moves a comment between threads, so only the text is editable. */
export const CommentUpdateRequest = CommentCreateRequest.pick({
  body: true,
  mentionedUserIds: true,
}).partial();
export type CommentUpdateRequestT = z.infer<typeof CommentUpdateRequest>;

export const CommentResponse = z.object({
  id: z.uuid(),
  targetType: CommentTarget,
  targetId: z.uuid(),
  occurrenceId: z.uuid().nullable(),
  parentId: z.uuid().nullable(),
  depth: z.number().int().min(0).max(1),
  userId: z.uuid(),
  body: z.string(),
  bodyLocale: BodyLocale.nullable(),
  mentionedUserIds: z.array(z.uuid()),
  status: ContentStatus,
  isPinned: z.boolean(),
  isEdited: z.boolean(),
  replyCount: z.number().int().nonnegative(),
  reactionCount: z.number().int().nonnegative(),
  viewerReaction: ReactionKind.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type CommentResponseT = z.infer<typeof CommentResponse>;

/**
 * `parentId` selects one branch; omitting it returns roots only, pinned first.
 * Fetching an entire thread flat is not offered — it is the query that makes a
 * popular event page slow.
 */
export const ListCommentQuery = CursorQuery.extend({
  parentId: z.uuid().optional(),
});
export type ListCommentQueryT = z.infer<typeof ListCommentQuery>;
