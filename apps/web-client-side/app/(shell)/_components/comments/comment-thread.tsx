'use client';

import { useRef, useState } from 'react';
import type { CommentResponseT } from '@dnc/contracts';

import { Button, Card, Skeleton } from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import type { CommentTargetType } from '../../../_lib/comments-api';
import { ChatIcon, LockIcon } from './comment-icons';
import { CommentComposer } from './comment-composer';
import { CommentItem } from './comment-item';
import { useCommentThread, type Branch } from './use-comment-thread';

export interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
  /** The viewer hosts the event or wrote the post, so may pin. */
  isThreadOwner: boolean;
  /** Read-only target (a cancelled event): no composer, reply, edit, delete or pin. */
  closed?: boolean;
}

interface ReplyTarget {
  rootId: string;
  parentId: string;
  name: string;
}

function ThreadSkeleton() {
  const t = useTranslate();
  return (
    <div role="status" aria-label={t('comments.loading')} className="flex flex-col gap-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-2.5">
          <Skeleton shape="circle" className="size-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="w-1/3" />
            <Skeleton className="w-full" />
            <Skeleton className="w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Comments on an event or a post: composer, paged roots, lazy reply branches.
 *
 * One component serves both targets (`targetType`), so the event page and the
 * feed behave identically. Signed-out readers see everything; writing is gated
 * by the composer and the API, not by hiding the thread.
 */
export function CommentThread({
  targetType,
  targetId,
  isThreadOwner,
  closed = false,
}: CommentThreadProps) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();
  const thread = useCommentThread(targetType, targetId);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [live, setLive] = useState({ text: '', n: 0 });

  const announce = (text: string) => setLive((prior) => ({ text, n: prior.n + 1 }));

  const submitRoot = async (body: string, attempt: { recheck: boolean; since: number }) => {
    await thread.post(body, attempt);
    announce(t('comments.status.posted'));
  };

  const submitReply = async (body: string, attempt: { recheck: boolean; since: number }) => {
    if (replyTo === null) return;
    await thread.post(body, {
      ...attempt,
      parent: { rootId: replyTo.rootId, parentId: replyTo.parentId },
    });
    setReplyTo(null);
    announce(t('comments.status.posted'));
  };

  const startReply = (comment: CommentResponseT) => {
    const rootId = comment.depth === 0 ? comment.id : comment.parentId;
    if (rootId === null) return;
    const name = comment.author?.displayName ?? t('post.author.former');
    // Guests are sent through sign-in first; the reply box opens afterwards.
    requireAuth(() => setReplyTo({ rootId, parentId: comment.id, name }));
  };

  const edit = async (id: string, body: string) => {
    await thread.edit(id, body);
    announce(t('comments.status.saved'));
  };

  const remove = async (comment: CommentResponseT) => {
    await thread.remove(comment);
    if (replyTo !== null && (replyTo.parentId === comment.id || replyTo.rootId === comment.id)) {
      setReplyTo(null);
    }
    announce(t('comments.status.deleted'));
    // The row that held focus is gone; park focus on the thread heading.
    headingRef.current?.focus();
  };

  const renderItem = (comment: CommentResponseT) => (
    <CommentItem
      comment={comment}
      targetType={targetType}
      viewerId={user?.id ?? null}
      isThreadOwner={isThreadOwner}
      closed={closed}
      onReply={startReply}
      onEdit={edit}
      onDelete={remove}
      onPin={thread.pin}
    />
  );

  const renderBranch = (root: CommentResponseT, branch: Branch | undefined) => {
    const replyOpen = replyTo?.rootId === root.id;
    return (
      <div className="ml-10 mt-1 flex min-w-0 flex-col gap-3 sm:ml-11">
        {root.replyCount > 0 && (
          <button
            type="button"
            aria-expanded={branch?.open === true}
            onClick={() => thread.toggleBranch(root.id)}
            disabled={branch?.status === 'loading' && branch.items.length === 0}
            className="inline-flex min-h-11 items-center self-start rounded-md px-2 text-sm font-semibold text-accent-text hover:bg-accent-subtle"
          >
            {branch?.open === true
              ? t('comments.replies.hide')
              : root.replyCount === 1
                ? t('comments.replies.viewOne')
                : t('comments.replies.view', { count: root.replyCount })}
          </button>
        )}
        {branch?.open === true && (
          <>
            {branch.status === 'loading' && branch.items.length === 0 && <ThreadSkeleton />}
            {branch.items.length > 0 && (
              <ul className="flex list-none flex-col gap-3">
                {branch.items.map((reply) => (
                  <li key={reply.id} className="min-w-0">
                    {renderItem(reply)}
                  </li>
                ))}
              </ul>
            )}
            {branch.status === 'error' && (
              <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger-text">
                {t('comments.error.load.title')}
                <Button size="sm" variant="secondary" onClick={() => thread.toggleBranch(root.id)}>
                  {t('common.retry')}
                </Button>
              </p>
            )}
            {branch.nextCursor !== null && branch.status === 'ready' && (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => thread.loadMoreReplies(root.id)}
              >
                {t('comments.showMoreReplies')}
              </Button>
            )}
          </>
        )}
        {replyOpen && !closed && (
          <CommentComposer
            autoFocus
            replyingTo={replyTo.name}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={submitReply}
          />
        )}
      </div>
    );
  };

  const count = thread.hasMore ? `${thread.total}+` : thread.total;

  return (
    <Card as="section" padding="md" aria-labelledby={`comments-${targetId}`} className="flex flex-col gap-4">
      <h2
        id={`comments-${targetId}`}
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-2 text-sm font-bold text-fg outline-none"
      >
        <ChatIcon className="text-fg-muted" />
        {thread.status === 'ready' ? t('comments.title', { count }) : t('comments.heading')}
      </h2>
      <p key={live.n} role="status" aria-live="polite" className="sr-only">
        {live.text}
      </p>

      {closed ? (
        <p className="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-3 text-sm text-fg-muted">
          <LockIcon className="shrink-0" />
          <span className="min-w-0 break-words">{t('comments.closed.cancelled')}</span>
        </p>
      ) : (
        <CommentComposer inputRef={composerRef} onSubmit={submitRoot} />
      )}

      {thread.status === 'loading' && <ThreadSkeleton />}

      {thread.status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-sm font-semibold text-fg">{t('comments.error.load.title')}</p>
          <p className="text-sm text-fg-muted">{t('comments.error.load.body')}</p>
          <Button variant="secondary" size="sm" onClick={() => void thread.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {thread.status === 'ready' && thread.roots.length === 0 && (
        <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
          <p className="text-md font-semibold text-fg">{t('comments.empty.title')}</p>
          {!closed && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1"
              onClick={() => composerRef.current?.focus()}
            >
              {t('comments.empty.cta')}
            </Button>
          )}
        </div>
      )}

      {thread.status === 'ready' && thread.roots.length > 0 && (
        <ul className="flex list-none flex-col gap-4">
          {thread.roots.map((root) => (
            <li key={root.id} className="min-w-0">
              {renderItem(root)}
              {renderBranch(root, thread.branches[root.id])}
            </li>
          ))}
        </ul>
      )}

      {thread.status === 'ready' && thread.hasMore && (
        <div className="flex flex-col items-start gap-1">
          {thread.moreFailed && (
            <p role="alert" className="text-sm text-danger-text">
              {t('comments.error.load.title')}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={thread.loadingMore}
            onClick={() => void thread.loadMore()}
          >
            {thread.loadingMore ? t('common.loading') : t('comments.showMore')}
          </Button>
        </div>
      )}
    </Card>
  );
}
