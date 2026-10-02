'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommentResponseT } from '@dnc/contracts';

import { useAuth } from '../../../_components/auth-provider';
import { ApiError } from '../../../_lib/api';
import {
  createComment,
  deleteComment,
  listComments,
  setCommentPinned,
  updateComment,
  type CommentTargetType,
} from '../../../_lib/comments-api';

export const PAGE_SIZE = 20;
/** Tolerated gap between the browser clock and the API clock when matching a duplicate. */
const CLOCK_SKEW_MS = 5000;
const POST_TIMEOUT_MS = 15_000;
/** Pages walked when looking for a duplicate reply (oldest first, so it sits near the end). */
const DUPLICATE_REPLY_PAGES = 5;

export type ThreadStatus = 'loading' | 'ready' | 'error';

export interface Branch {
  items: CommentResponseT[];
  nextCursor: string | null;
  status: 'loading' | 'ready' | 'error';
  open: boolean;
}

export interface PostOptions {
  /** Present when replying: the visible top-level comment and the comment answered. */
  parent?: { rootId: string; parentId: string };
  /** The previous attempt may have reached the server; check before writing again. */
  recheck?: boolean;
  /** Epoch ms of the first attempt for this text; only comments created since then can be a duplicate. */
  since?: number;
}

/** Pinned first, then newest first: the order the API serves roots in. */
function sortRoots(list: CommentResponseT[]): CommentResponseT[] {
  return list.toSorted((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

function mergeById(existing: CommentResponseT[], incoming: CommentResponseT[]): CommentResponseT[] {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
}

/**
 * True when a failed write may nonetheless have been stored: the request never
 * got an answer (offline, abort, timeout) or a gateway gave up after forwarding
 * it (502/503/504).
 */
export function isUncertainFailure(cause: unknown): boolean {
  if (!(cause instanceof ApiError)) return true;
  return cause.status === 0 || cause.status === 502 || cause.status === 503 || cause.status === 504;
}

/**
 * State and actions of one comment thread.
 *
 * Roots page by cursor; each root owns a lazily loaded branch of replies. Every
 * write takes the server's response as the truth (no refetch of the whole
 * thread), and a 404 from any write reloads the thread because it means the
 * target changed under the member.
 */
export function useCommentThread(type: CommentTargetType, targetId: string) {
  const { user, loading: authLoading, whenActionSettled } = useAuth();
  const viewerId = user?.id;

  const [status, setStatus] = useState<ThreadStatus>('loading');
  /** The target answered 404: it was hidden or removed, so retrying cannot help. */
  const [missing, setMissing] = useState(false);
  const [roots, setRoots] = useState<CommentResponseT[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [branches, setBranches] = useState<Record<string, Branch>>({});

  /** Bumped on every reload so a slow response for an older request is dropped. */
  const generation = useRef(0);
  /**
   * Top-level comments created in this session, with when they were stored.
   * A page-one read that was already in flight when one was posted cannot
   * contain it, so the result is merged with these instead of replacing them.
   */
  const localRoots = useRef<{ comment: CommentResponseT; at: number }[]>([]);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    const startedAt = Date.now();
    setStatus('loading');
    setMissing(false);
    try {
      // After a sign-in that carried an action (like, reply), read once it has landed.
      await whenActionSettled();
      const page = await listComments(type, targetId, { limit: PAGE_SIZE });
      if (mine !== generation.current) return;
      // Only comments stored after this read began can be missing from it. Older
      // ones are already in the result, or were hidden or removed server-side
      // since, and must not come back.
      const unseen = localRoots.current
        .filter((entry) => entry.at >= startedAt)
        .map((entry) => entry.comment);
      localRoots.current = localRoots.current.filter((entry) => entry.at >= startedAt);
      setRoots(sortRoots(mergeById(page.items, unseen)));
      setNextCursor(page.nextCursor);
      setBranches({});
      setMoreFailed(false);
      setStatus('ready');
    } catch (cause) {
      if (mine !== generation.current) return;
      setMissing(cause instanceof ApiError && cause.status === 404);
      setStatus('error');
    }
  }, [type, targetId, whenActionSettled]);

  useEffect(() => {
    if (authLoading) return;
    // A different viewer starts from a clean slate.
    localRoots.current = [];
    void load();
    return () => {
      generation.current += 1;
    };
    // The viewer is a dependency on purpose: `viewerReaction` is per member.
  }, [authLoading, viewerId, load]);

  const loadMore = useCallback(async () => {
    if (nextCursor === null || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await listComments(type, targetId, { cursor: nextCursor, limit: PAGE_SIZE });
      if (mine !== generation.current) return;
      setRoots((current) => sortRoots(mergeById(current, page.items)));
      setNextCursor(page.nextCursor);
    } catch {
      if (mine === generation.current) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [type, targetId, nextCursor, loadingMore]);

  /* ------------------------------------------------------------- branches */

  const fetchBranch = useCallback(
    async (rootId: string, cursor: string | null) => {
      const mine = generation.current;
      setBranches((current) => {
        const prior = current[rootId];
        return {
          ...current,
          [rootId]: {
            items: cursor === null ? [] : (prior?.items ?? []),
            nextCursor: prior?.nextCursor ?? null,
            status: 'loading',
            open: true,
          },
        };
      });
      try {
        const page = await listComments(type, targetId, {
          parentId: rootId,
          limit: PAGE_SIZE,
          ...(cursor === null ? {} : { cursor }),
        });
        if (mine !== generation.current) return;
        setBranches((current) => {
          const prior = current[rootId];
          return {
            ...current,
            [rootId]: {
              items: cursor === null ? page.items : mergeById(prior?.items ?? [], page.items),
              nextCursor: page.nextCursor,
              status: 'ready',
              open: prior?.open ?? true,
            },
          };
        });
      } catch {
        if (mine !== generation.current) return;
        setBranches((current) => {
          const prior = current[rootId];
          return {
            ...current,
            [rootId]: {
              items: prior?.items ?? [],
              nextCursor: prior?.nextCursor ?? cursor,
              status: 'error',
              open: true,
            },
          };
        });
      }
    },
    [type, targetId],
  );

  const toggleBranch = useCallback(
    (rootId: string) => {
      const branch = branches[rootId];
      if (branch === undefined) {
        void fetchBranch(rootId, null);
        return;
      }
      if (branch.status === 'error') {
        void fetchBranch(rootId, branch.items.length === 0 ? null : branch.nextCursor);
        return;
      }
      setBranches((current) => ({ ...current, [rootId]: { ...branch, open: !branch.open } }));
    },
    [branches, fetchBranch],
  );

  const loadMoreReplies = useCallback(
    (rootId: string) => {
      const branch = branches[rootId];
      if (branch?.nextCursor == null || branch.status === 'loading') return;
      void fetchBranch(rootId, branch.nextCursor);
    },
    [branches, fetchBranch],
  );

  /* --------------------------------------------------------------- writes */

  /** Replaces one comment wherever it is shown, root or reply. */
  const patch = useCallback((next: CommentResponseT) => {
    setRoots((current) => current.map((item) => (item.id === next.id ? next : item)));
    setBranches((current) => {
      const updated: Record<string, Branch> = {};
      for (const [rootId, branch] of Object.entries(current)) {
        updated[rootId] = {
          ...branch,
          items: branch.items.map((item) => (item.id === next.id ? next : item)),
        };
      }
      return updated;
    });
  }, []);

  const insert = useCallback(
    (created: CommentResponseT) => {
      if (created.depth === 0 || created.parentId === null) {
        localRoots.current = [
          ...localRoots.current.filter((entry) => entry.comment.id !== created.id),
          { comment: created, at: Date.now() },
        ];
        setRoots((current) =>
          current.some((item) => item.id === created.id)
            ? current
            : sortRoots([created, ...current]),
        );
        return;
      }
      const rootId = created.parentId;
      const branch = branches[rootId];
      if (branch?.items.some((item) => item.id === created.id) === true) return;
      setRoots((current) =>
        current.map((item) =>
          item.id === rootId ? { ...item, replyCount: item.replyCount + 1 } : item,
        ),
      );
      if (branch !== undefined && branch.status === 'ready' && branch.nextCursor === null) {
        setBranches((current) => ({
          ...current,
          [rootId]: { ...branch, open: true, items: mergeById(branch.items, [created]) },
        }));
      } else {
        // Not every reply is loaded, so appending would misplace the new one.
        void fetchBranch(rootId, null);
      }
    },
    [branches, fetchBranch],
  );

  const findDuplicate = useCallback(
    async (
      body: string,
      parentRootId: string | undefined,
      since: number,
    ): Promise<CommentResponseT | null> => {
      if (viewerId === undefined) return null;
      // An identical comment posted before this attempt began is a different comment.
      const cutoff = since - CLOCK_SKEW_MS;
      const wanted = body.trim();
      const matches = (items: CommentResponseT[]) =>
        items.find(
          (item) =>
            item.userId === viewerId &&
            item.body === wanted &&
            Date.parse(item.createdAt) >= cutoff,
        ) ?? null;

      if (parentRootId === undefined) {
        const page = await listComments(type, targetId, { limit: PAGE_SIZE });
        return matches(page.items);
      }
      let cursor: string | null = null;
      for (let step = 0; step < DUPLICATE_REPLY_PAGES; step += 1) {
        const page = await listComments(type, targetId, {
          parentId: parentRootId,
          limit: 50,
          ...(cursor === null ? {} : { cursor }),
        });
        const found = matches(page.items);
        if (found !== null) return found;
        if (page.nextCursor === null) return null;
        cursor = page.nextCursor;
      }
      return null;
    },
    [type, targetId, viewerId],
  );

  const reloadOnStale = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 404) void load();
    },
    [load],
  );

  /** Posts a comment or reply. Throws on failure so the composer can keep the text. */
  const post = useCallback(
    async (body: string, options: PostOptions = {}): Promise<CommentResponseT> => {
      try {
        if (options.recheck === true) {
          const existing = await findDuplicate(
            body,
            options.parent?.rootId,
            options.since ?? Date.now(),
          );
          if (existing !== null) {
            insert(existing);
            return existing;
          }
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
        let created: CommentResponseT;
        try {
          created = await createComment(
            type,
            targetId,
            {
              body,
              ...(options.parent === undefined ? {} : { parentId: options.parent.parentId }),
            },
            controller.signal,
          );
        } finally {
          clearTimeout(timer);
        }
        insert(created);
        return created;
      } catch (cause) {
        reloadOnStale(cause);
        throw cause;
      }
    },
    [type, targetId, findDuplicate, insert, reloadOnStale],
  );

  const edit = useCallback(
    async (id: string, body: string) => {
      try {
        patch(await updateComment(id, body));
      } catch (cause) {
        reloadOnStale(cause);
        throw cause;
      }
    },
    [patch, reloadOnStale],
  );

  const remove = useCallback(
    async (comment: CommentResponseT) => {
      try {
        await deleteComment(comment.id);
      } catch (cause) {
        reloadOnStale(cause);
        throw cause;
      }
      if (comment.depth === 0) {
        localRoots.current = localRoots.current.filter((entry) => entry.comment.id !== comment.id);
        setRoots((current) => current.filter((item) => item.id !== comment.id));
        setBranches((current) => {
          const { [comment.id]: _gone, ...rest } = current;
          return rest;
        });
        return;
      }
      const rootId = comment.parentId;
      if (rootId === null) return;
      setRoots((current) =>
        current.map((item) =>
          item.id === rootId ? { ...item, replyCount: Math.max(0, item.replyCount - 1) } : item,
        ),
      );
      setBranches((current) => {
        const branch = current[rootId];
        if (branch === undefined) return current;
        return {
          ...current,
          [rootId]: { ...branch, items: branch.items.filter((item) => item.id !== comment.id) },
        };
      });
    },
    [reloadOnStale],
  );

  const pin = useCallback(
    async (comment: CommentResponseT, pinned: boolean) => {
      try {
        const updated = await setCommentPinned(comment.id, pinned);
        // One pin per thread: the server released the old one, so mirror that.
        setRoots((current) =>
          sortRoots(
            current.map((item) =>
              item.id === updated.id
                ? updated
                : pinned && item.isPinned
                  ? { ...item, isPinned: false }
                  : item,
            ),
          ),
        );
      } catch (cause) {
        reloadOnStale(cause);
        throw cause;
      }
    },
    [reloadOnStale],
  );

  const total =
    roots.length + roots.reduce((sum, item) => sum + item.replyCount, 0);

  return {
    status,
    missing,
    roots,
    hasMore: nextCursor !== null,
    loadingMore,
    moreFailed,
    branches,
    total,
    reload: load,
    loadMore,
    toggleBranch,
    loadMoreReplies,
    post,
    edit,
    remove,
    pin,
  };
}
