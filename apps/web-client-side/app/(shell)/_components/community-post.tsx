'use client';

import { MAX_GALLERY_PREVIEW, type PostKindT, type PostResponseT } from '@dnc/contracts';
import type { MessageKey } from '@dnc/i18n';

import { Avatar, Badge, Card } from '../../_components/ui';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { areaName, findAreaById } from '../../_lib/areas';
import { timeAgo } from '../../_lib/datetime';
import { MediaCarousel } from './media-carousel';

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
}

/**
 * A community post in the feed.
 *
 * Deliberately quieter than EventPost: a post has no cover, no capacity bar and
 * no RSVP, because it has no time and no seats. Making the two look alike would
 * suggest you can join a question.
 */
export function CommunityPost({ post }: CommunityPostProps) {
  const t = useTranslate();
  const { locale } = useLocale();

  const area = post.areaId === null ? undefined : findAreaById(post.areaId);
  // The author's display name arrives with the profile endpoint; until then the
  // id seeds a stable avatar so two posts by the same person look the same.
  const authorLabel = post.authorUserId.slice(0, 2).toUpperCase();

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={authorLabel} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-fg-muted">
            {t('post.card.posted')} · {timeAgo(post.createdAt, locale)}
            {post.isEdited ? ` · ${t('post.card.edited')}` : ''}
          </p>
        </div>
        <Badge tone={KIND_TONE[post.kind]}>{t(KIND_LABEL[post.kind])}</Badge>
      </div>

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
        <span>💬 {t('post.card.comments', { count: post.commentCount })}</span>
      </div>
    </Card>
  );
}
