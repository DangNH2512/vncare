import { z } from 'zod';
import { BodyLocale, ContentStatus, CursorQuery } from './content';
import { MediaResponse } from './media';
import { ReactionKind } from './reaction';

/**
 * What the author wants from the community. The feed groups by this, and a
 * `looking_for` post older than its usefulness window is archived on a
 * different schedule than a `notice`.
 */
export const PostKind = z.enum(['question', 'recommendation', 'notice', 'looking_for']);
export type PostKindT = z.infer<typeof PostKind>;

/**
 * A community post has no start time, no capacity and no RSVP. That is the
 * whole line between a post and an event, and it is enforced by shape rather
 * than by convention.
 */
export const PostCreateRequest = z.object({
  kind: PostKind.default('question'),
  body: z.string().trim().min(1).max(5000),
  /** Null means city-wide rather than scoped to one Da Nang area. */
  areaId: z.uuid().nullable().optional(),
  bodyLocale: BodyLocale.optional(),
  /**
   * Ids of media already uploaded via presigned URL; the API never proxies
   * bytes. Deliberately uncapped — the request body size limit is the only
   * bound, and it sits far past any real gallery.
   */
  mediaIds: z.array(z.uuid()).default([]),
  relatedEventId: z.uuid().optional(),
  /**
   * Place attached to the post. Coordinates and label travel together: a point
   * with no name renders as an anonymous pin, and a name with no point cannot
   * be put on a map.
   */
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      label: z.string().trim().min(1).max(200),
    })
    .optional(),
});
export type PostCreateRequestT = z.infer<typeof PostCreateRequest>;

/**
 * Editable surface of a post. `relatedEventId` is deliberately absent:
 * re-pointing a post at a different event after it has collected comments
 * changes what those comments were replying to.
 */
export const PostUpdateRequest = PostCreateRequest.pick({
  kind: true,
  body: true,
  areaId: true,
  mediaIds: true,
  location: true,
}).partial();
export type PostUpdateRequestT = z.infer<typeof PostUpdateRequest>;

/**
 * Public shape of a post.
 *
 * `moderationState` and `reportCount` are absent by design — they would tell a
 * reporter whether their report landed, and tell a spammer when to switch
 * accounts.
 */
export const PostResponse = z.object({
  id: z.uuid(),
  authorUserId: z.uuid(),
  areaId: z.uuid().nullable(),
  kind: PostKind,
  body: z.string(),
  bodyLocale: BodyLocale.nullable(),
  /** Every attached id, in the author's order — the full length of the gallery. */
  mediaIds: z.array(z.uuid()),
  /**
   * Resolved gallery with signed URLs, in the author's order.
   *
   * A list response resolves only the first MAX_GALLERY_PREVIEW items, so this
   * can be shorter than `mediaIds`; compare the two lengths to know whether
   * more exist. Reading one post resolves all of them.
   */
  media: z.array(MediaResponse),
  location: z
    .object({ lat: z.number(), lng: z.number(), label: z.string() })
    .nullable(),
  relatedEventId: z.uuid().nullable(),
  status: ContentStatus,
  commentCount: z.number().int().nonnegative(),
  reactionCount: z.number().int().nonnegative(),
  isEdited: z.boolean(),
  /** The caller's own reaction on this post, or null. */
  viewerReaction: ReactionKind.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PostResponseT = z.infer<typeof PostResponse>;

export const ListPostQuery = CursorQuery.extend({
  areaId: z.uuid().optional(),
  kind: PostKind.optional(),
  authorUserId: z.uuid().optional(),
});
export type ListPostQueryT = z.infer<typeof ListPostQuery>;
