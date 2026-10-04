'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { MAX_GALLERY_PREVIEW, type PostKindT, type PostResponseT } from '@dnc/contracts';
import type { MessageKey } from '@dnc/i18n';

import { Avatar, Badge, Card, TrustBadge, type TrustLevel } from '../../_components/ui';
import { useAuth } from '../../_components/auth-provider';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { areaName, findAreaById } from '../../_lib/areas';
import { timeAgo } from '../../_lib/datetime';
import { cn } from '../../_lib/cn';
import { ChatIcon } from './comments/comment-icons';
import { CommentThread } from './comments/comment-thread';
import { ReactionButton } from './comments/reaction-button';
import { MediaCarousel } from './media-carousel';
import { SafetyMenu } from './safety/safety-menu';

const KIND_LABEL: Readonly<Record<PostKindT, MessageKey>> = {
  question: 'post.kind.question',
  recommendation: 'post.kind.recommendation',
  looking_for: 'post.kind.lookingFor',
  notice: 'post.kind.notice',
};

/** Each type gets its own tone so the feed is scannable without reading bodies. */
const KIND_TONE = {
  question: 'accent',
  recommendation: 'success',
  looking_for: 'sun',
  notice: 'neutral',
} as const;

export interface CommunityPostProps {
  post: PostResponseT;
  /** After the viewer blocked this post's author; the feed drops their posts. */
  onAuthorBlocked?: (authorUserId: string) => void;
}

/**
 * A community post in the feed.
 *
 * Deliberately quieter than EventPost: a post has no cover, no capacity bar and
 * no RSVP, because it has no time and no seats. Making the two look alike would
 * suggest you can join a question.
 */
export function CommunityPost({ post, onAuthorBlocked }: CommunityPostProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const threadId = useId();
  const [threadOpen, setThreadOpen] = useState(false);
  /** Set on the first open: the thread is then kept (hidden when closed) so a draft survives. */
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [gone, setGone] = useState(false);
  /** Exact total reported by the thread once loaded; overrides the feed's snapshot. */
  const [threadCount, setThreadCount] = useState<number | null>(null);

  // One epoch per change between members (or member to guest): the Like button and
  // the thread remount, so nothing one account did or typed reaches the next.
  // Guest -> member keeps them, because that is the sign-in-then-act flow.
  const viewerId = user?.id ?? null;
  const epoch = useRef({ viewer: viewerId, n: 0, staleFor: null as PostResponseT | null });
  if (epoch.current.viewer !== viewerId) {
    if (epoch.current.viewer !== null) {
      epoch.current.n += 1;
      // `post` was read for the previous account; its `viewerReaction` is not this one's.
      epoch.current.staleFor = post;
    }
    epoch.current.viewer = viewerId;
  }
  const reactionIsStale = epoch.current.staleFor === post;
  const isOwn = user !== null && user.id === post.authorUserId;

  const area = post.areaId === null ? undefined : findAreaById(post.areaId);
  const author = post.author;
  const name = author?.displayName ?? t('post.author.former');
  const commentCount = threadCount ?? post.commentCount;
  const commentsLabel =
    commentCount === 1
      ? t('post.card.commentsOne')
      : t('post.card.comments', { count: commentCount });

  if (gone) {
    return (
      <Card padding="md">
        <p role="status" className="text-sm text-fg-muted">
          {t('post.unavailable')}
        </p>
      </Card>
    );
  }

  return (
    <Card as="article" padding="md" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* Avatar and name share one link so the tap target is the whole identity. */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {author === null ? (
            <Avatar name={name} size="md" />
          ) : (
            <Link
              href={`/u/${author.handle}`}
              aria-label={name}
              tabIndex={-1}
              className="shrink-0"
            >
              <Avatar name={name} size="md" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {author === null ? (
                <span className="block truncate text-sm font-semibold text-fg">{name}</span>
              ) : (
                <Link href={`/u/${author.handle}`} className="min-w-0 hover:underline">
                  <span className="block truncate text-sm font-semibold text-fg">{name}</span>
                </Link>
              )}
              {author !== null && (
                <TrustBadge level={author.trustLevel as TrustLevel} variant="compact" />
              )}
            </div>
          <p className="truncate text-xs text-fg-muted">
            {author !== null && <>@{author.handle} · </>}
            {timeAgo(post.createdAt, locale)}
            {post.isEdited ? ` · ${t('post.card.edited')}` : ''}
          </p>
          </div>
        </div>
        <Badge tone={KIND_TONE[post.kind]}>{t(KIND_LABEL[post.kind])}</Badge>
        {/* Report/Block on everyone's posts but your own (AC-2). */}
        {!isOwn && (
          <SafetyMenu
            target={{ type: 'post', id: post.id }}
            owner={{ userId: post.authorUserId }}
            blockLabel="safety.block.actionAuthor"
            {...(onAuthorBlocked === undefined
              ? {}
              : { onBlocked: () => onAuthorBlocked(post.authorUserId) })}
          />
        )}
      </div>

      {/* Only the author is ever served a hidden post; the label tells them
          why nobody else can see it. */}
      {post.status === 'hidden' && (
        <Badge tone="danger" className="self-start">
          {t('safety.label.contentHidden')}
        </Badge>
      )}

      {/* User-written text: `whitespace-pre-wrap` keeps the author's line breaks,
          `break-words` stops a pasted URL from widening the whole feed column. */}
      <p className="whitespace-pre-wrap break-words text-md text-fg">{post.body}</p>

      {post.media.length > 0 && (
        <MediaCarousel
          items={post.media.map((item) => ({
            id: item.id,
            kind: item.kind,
            url: item.url,
            width: item.width,
            height: item.height,
          }))}
          label={t('post.card.gallery', { count: post.mediaIds.length })}
          previousLabel={t('post.media.previous')}
          nextLabel={t('post.media.next')}
          previewLimit={MAX_GALLERY_PREVIEW}
          moreLabel={(hidden) => t('post.card.showMore', { count: hidden })}
          className="-mx-1"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
        <span>📍 {area === undefined ? t('post.card.cityWide') : areaName(area, locale)}</span>
        {post.location !== null && (
          // The attached place is separate from the area: an area is a filter,
          // a pinned place is where the author means.
          <span className="min-w-0 truncate font-medium text-accent-text">
            {post.location.label}
          </span>
        )}
      </div>

      <div className="-mx-2 flex items-center gap-1">
        <ReactionButton
          key={`like-${epoch.current.n}`}
          targetType="post"
          targetId={post.id}
          count={post.reactionCount}
          reacted={reactionIsStale ? false : post.viewerReaction !== null}
        />
        <button
          type="button"
          aria-expanded={threadOpen}
          aria-controls={threadId}
          aria-label={commentsLabel}
          title={commentsLabel}
          onClick={() => {
            setThreadLoaded(true);
            setThreadOpen((open) => !open);
          }}
          className={cn(
            'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm',
            'font-semibold transition-colors hover:bg-surface-sunken active:scale-[0.98]',
            threadOpen ? 'text-accent-text' : 'text-fg-muted',
          )}
        >
          <ChatIcon />
          <span aria-hidden>{commentCount}</span>
        </button>
      </div>

      {threadLoaded && (
        // Mounted on first open, so a feed of posts costs no comment requests.
        // Hidden rather than unmounted: closing must not throw away a half-typed comment
        // or force a reload on the next open.
        <div id={threadId} hidden={!threadOpen} className="min-w-0">
          <CommentThread
            key={`thread-${epoch.current.n}`}
            variant="embedded"
            targetType="post"
            targetId={post.id}
            isThreadOwner={viewerId !== null && viewerId === post.authorUserId}
            onUnavailable={() => setGone(true)}
            onCountChange={setThreadCount}
          />
        </div>
      )}
    </Card>
  );
}
