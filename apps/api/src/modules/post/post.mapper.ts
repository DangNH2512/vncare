import type { MediaResponseT, PostResponseT } from '@dnc/contracts';
import type { PostRow } from './post.repository.js';

/**
 * Maps a row onto the public response.
 *
 * Every field is named explicitly. Spreading the row would publish
 * `moderation_state`, `report_count` and `deleted_at` the moment a column is
 * added, and the mistake would be invisible in review.
 *
 * @param media - Gallery already resolved and signed by MediaService. Passed in
 *   rather than fetched here so the mapper stays a pure function and a page of
 *   posts resolves its media in one query instead of one per row.
 */
export function toPostResponse(
  row: PostRow,
  media: readonly MediaResponseT[] = [],
): PostResponseT {
  return {
    id: row.id,
    authorUserId: row.author_user_id,
    areaId: row.area_id,
    kind: row.kind,
    body: row.body,
    bodyLocale: row.body_locale,
    mediaIds: row.media_ids,
    media: [...media],
    location:
      row.location_lat === null || row.location_lng === null || row.location_label === null
        ? null
        : { lat: row.location_lat, lng: row.location_lng, label: row.location_label },
    relatedEventId: row.related_event_id,
    status: row.status,
    commentCount: row.comment_count,
    reactionCount: row.reaction_count,
    isEdited: row.is_edited,
    viewerReaction: row.viewer_reaction,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
