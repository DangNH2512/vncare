import type { CommentResponseT, CommentTargetT } from '@dnc/contracts';
import type { CommentRow } from './comment.repository.js';

/**
 * Collapses the two nullable target columns back into the pair the contract
 * exposes. `ck_comments_single_target` guarantees exactly one is set, so the
 * fallback branch is unreachable and exists only to keep the type total.
 */
export function toCommentResponse(row: CommentRow): CommentResponseT {
  const targetType: CommentTargetT = row.post_id ? 'post' : 'event';
  return {
    id: row.id,
    targetType,
    targetId: (row.post_id ?? row.event_id) as string,
    occurrenceId: row.occurrence_id,
    parentId: row.parent_id,
    depth: row.depth,
    userId: row.user_id,
    body: row.body,
    bodyLocale: row.body_locale,
    mentionedUserIds: row.mentioned_user_ids,
    status: row.status,
    isPinned: row.is_pinned,
    isEdited: row.is_edited,
    replyCount: row.reply_count,
    reactionCount: row.reaction_count,
    viewerReaction: row.viewer_reaction,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
