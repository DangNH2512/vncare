'use client';

import type { ReportSnapshotT } from '@dnc/contracts';

import { formatDateTime } from '../../_lib/datetime';
import { useTranslate } from '../locale-provider';
import { Badge } from '../ui';
import { EVENT_STATUS_LABEL_KEY } from './labels';

/**
 * What the reported item looked like when the report was filed (AC-27).
 *
 * This is evidence, not the live item: an author may have edited or deleted
 * it since, which is why the snapshot is stored on the report and rendered
 * here as-is. User-written text is shown verbatim in its own language — no
 * translation, and `whitespace-pre-wrap` so line breaks the author typed
 * stay where they were.
 */
export function SnapshotView({ snapshot }: { snapshot: ReportSnapshotT }) {
  const t = useTranslate();

  switch (snapshot.targetType) {
    case 'event':
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-md font-semibold break-words text-fg">{snapshot.title}</p>
            <Badge tone="neutral">{t(EVENT_STATUS_LABEL_KEY[snapshot.status])}</Badge>
          </div>
          {snapshot.startsAt !== null && (
            <p className="text-sm text-fg-muted">{formatDateTime(snapshot.startsAt)}</p>
          )}
          {snapshot.description !== null && snapshot.description !== '' && (
            <UserText text={snapshot.description} />
          )}
        </div>
      );
    case 'post':
      return (
        <div className="flex flex-col gap-2">
          <UserText text={snapshot.body} />
          {snapshot.status === 'hidden' && (
            <Badge tone="warning">{t('safety.label.contentHidden')}</Badge>
          )}
        </div>
      );
    case 'comment':
      return (
        <div className="flex flex-col gap-2">
          <UserText text={snapshot.body} />
          {snapshot.status === 'hidden' && (
            <Badge tone="warning">{t('safety.label.contentHidden')}</Badge>
          )}
        </div>
      );
    case 'user':
      return (
        <div className="flex flex-col gap-1">
          <p className="text-md font-semibold break-words text-fg">
            {snapshot.displayName}{' '}
            <span className="font-normal text-fg-muted">@{snapshot.handle}</span>
          </p>
          {snapshot.headline !== null && snapshot.headline !== '' && (
            <p className="text-sm break-words text-fg-muted">{snapshot.headline}</p>
          )}
          {snapshot.bio !== null && snapshot.bio !== '' && <UserText text={snapshot.bio} />}
        </div>
      );
  }
}

function UserText({ text }: { text: string }) {
  return (
    <blockquote className="border-l-2 border-line-strong pl-3 text-sm whitespace-pre-wrap break-words text-fg">
      {text}
    </blockquote>
  );
}
