/**
 * Comment and reaction endpoints.
 *
 * Kept out of `api.ts` so each social feature owns its own transport file and
 * the shared client stays untouched. Response shapes come from
 * `@dnc/contracts`; this file owns paths and request bodies only.
 */
import type {
  CommentCreateRequestT,
  CommentResponseT,
  ReactionKindT,
  ReactionSummaryResponseT,
  ReactionTargetT,
} from '@dnc/contracts';

import { call } from './api';

export type CommentTargetType = 'post' | 'event';

export interface CommentPage {
  items: CommentResponseT[];
  nextCursor: string | null;
}

export interface ListCommentsParams {
  cursor?: string | null;
  /** Selects one reply branch; omitted means top-level comments. */
  parentId?: string;
  limit?: number;
  signal?: AbortSignal;
}

const collection = (type: CommentTargetType): string => (type === 'event' ? 'events' : 'posts');

export function listComments(
  type: CommentTargetType,
  targetId: string,
  params: ListCommentsParams = {},
): Promise<CommentPage> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.cursor !== undefined && params.cursor !== null) query.set('cursor', params.cursor);
  if (params.parentId !== undefined) query.set('parentId', params.parentId);
  return call<CommentPage>(
    `/api/v1/${collection(type)}/${targetId}/comments?${query.toString()}`,
    params.signal === undefined ? undefined : { signal: params.signal },
  );
}

export function createComment(
  type: CommentTargetType,
  targetId: string,
  body: Pick<CommentCreateRequestT, 'body' | 'parentId'>,
  signal?: AbortSignal,
): Promise<CommentResponseT> {
  return call<CommentResponseT>(`/api/v1/${collection(type)}/${targetId}/comments`, {
    method: 'POST',
    // `bodyLocale` is left out on purpose: the UI cannot know which language was typed.
    body: JSON.stringify({ body: body.body, mentionedUserIds: [], parentId: body.parentId }),
    ...(signal === undefined ? {} : { signal }),
  });
}

export function updateComment(id: string, body: string): Promise<CommentResponseT> {
  return call<CommentResponseT>(`/api/v1/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

export function deleteComment(id: string): Promise<void> {
  return call<void>(`/api/v1/comments/${id}`, { method: 'DELETE' });
}

export function setCommentPinned(id: string, pinned: boolean): Promise<CommentResponseT> {
  return call<CommentResponseT>(`/api/v1/comments/${id}/pin`, {
    method: pinned ? 'PUT' : 'DELETE',
  });
}

/* --------------------------------------------------------------- reactions */

const reactionCollection: Readonly<Record<ReactionTargetT, string>> = {
  post: 'posts',
  comment: 'comments',
  event: 'events',
};

export function setReaction(
  type: ReactionTargetT,
  id: string,
  kind: ReactionKindT = 'like',
): Promise<unknown> {
  return call<unknown>(`/api/v1/${reactionCollection[type]}/${id}/reactions`, {
    method: 'PUT',
    body: JSON.stringify({ kind }),
  });
}

export function removeReaction(type: ReactionTargetT, id: string): Promise<void> {
  return call<void>(`/api/v1/${reactionCollection[type]}/${id}/reactions`, { method: 'DELETE' });
}

export function getReactionSummary(
  type: ReactionTargetT,
  id: string,
  signal?: AbortSignal,
): Promise<ReactionSummaryResponseT> {
  return call<ReactionSummaryResponseT>(
    `/api/v1/${reactionCollection[type]}/${id}/reactions`,
    signal === undefined ? undefined : { signal },
  );
}
