'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import type { CommentResponseT } from '@dnc/contracts';

import { Avatar, Button, TrustBadge, type TrustLevel } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { translateApiError } from '../../../_lib/api-error';
import { cn } from '../../../_lib/cn';
import type { CommentTargetType } from '../../../_lib/comments-api';
import {
  formatEventDateLong,
  formatEventTime,
  timeAgo,
  toDateTimeAttribute,
} from '../../../_lib/datetime';
import { useNow } from '../../../_lib/use-now';
import { MAX_COMMENT_LENGTH } from './comment-composer';
import { PencilIcon, PinIcon, ReplyIcon, TrashIcon } from './comment-icons';
import { ReactionButton } from './reaction-button';

export interface CommentItemProps {
  comment: CommentResponseT;
  targetType: CommentTargetType;
  /** Signed-in viewer's id, or null for a guest. */
  viewerId: string | null;
  /** The viewer owns the thread (hosts the event / wrote the post): may pin. */
  isThreadOwner: boolean;
  /** The target no longer accepts writes (cancelled event): read-only. */
  closed: boolean;
  onReply: (comment: CommentResponseT) => void;
  onEdit: (id: string, body: string) => Promise<void>;
  onDelete: (comment: CommentResponseT) => Promise<void>;
  onPin: (comment: CommentResponseT, pinned: boolean) => Promise<void>;
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
  tone = 'default',
  pressed,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
  pressed?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors',
        'hover:bg-surface-sunken active:scale-[0.98] disabled:opacity-55',
        tone === 'danger' && 'text-danger-text',
        tone === 'accent' && 'text-accent-text',
        tone === 'default' && 'text-fg-muted',
      )}
    >
      {children}
    </button>
  );
}

/**
 * One comment row: identity, text, and the actions the viewer may take.
 *
 * Comment text is rendered as plain text (never as HTML) with `break-words`, so
 * a pasted URL or markup cannot widen the column or run. Actions mirror what
 * the API allows but do not enforce it: the server is the authority.
 */
export function CommentItem({
  comment,
  targetType,
  viewerId,
  isThreadOwner,
  closed,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: CommentItemProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const now = useNow();
  const editId = useId();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard focus must land somewhere sensible when a control disappears.
  const editButton = useRef<HTMLButtonElement | null>(null);
  const deleteButton = useRef<HTMLButtonElement | null>(null);
  const cancelConfirm = useRef<HTMLButtonElement | null>(null);
  const restoreEditFocus = useRef(false);
  const restoreDeleteFocus = useRef(false);

  useEffect(() => {
    if (!editing && restoreEditFocus.current) {
      restoreEditFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (confirming) {
      cancelConfirm.current?.focus();
    } else if (restoreDeleteFocus.current) {
      restoreDeleteFocus.current = false;
      deleteButton.current?.focus();
    }
  }, [confirming]);

  const isMine = viewerId !== null && comment.userId === viewerId;
  const canEdit = isMine && !closed;
  const canPin = isThreadOwner && comment.depth === 0 && !closed;
  const author = comment.author;
  const name = author?.displayName ?? t('post.author.former');
  const pinnedLabel =
    targetType === 'event' ? t('comments.pinned.host') : t('comments.pinned.author');

  const run = async (action: () => Promise<void>, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      done?.();
    } catch (cause) {
      setError(translateApiError(t, cause, 'comments.error.action'));
    } finally {
      setBusy(false);
    }
  };

  const absolute = `${formatEventDateLong(comment.createdAt, locale)} ${formatEventTime(comment.createdAt, locale)}`;
  const relative = now === null ? '' : timeAgo(comment.createdAt, locale, new Date(now));
  const draftChanged = draft.trim() !== '' && draft.trim() !== comment.body;

  return (
    <div className="flex min-w-0 gap-2.5" data-comment-id={comment.id}>
      {author === null ? (
        <Avatar name={name} size="sm" />
      ) : (
        <Link href={`/u/${author.handle}`} tabIndex={-1} aria-hidden className="shrink-0">
          <Avatar name={name} size="sm" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {author === null ? (
            <span className="min-w-0 truncate text-sm font-semibold text-fg-muted">{name}</span>
          ) : (
            <Link
              href={`/u/${author.handle}`}
              className="min-w-0 max-w-full truncate text-sm font-semibold text-fg hover:underline"
            >
              {name}
            </Link>
          )}
          {author !== null && (
            <TrustBadge level={author.trustLevel as TrustLevel} variant="compact" />
          )}
          {comment.isPinned && (
            <span
              role="img"
              aria-label={pinnedLabel}
              title={pinnedLabel}
              className="inline-flex text-accent-text"
            >
              <PinIcon filled width={16} height={16} />
            </span>
          )}
          <span className="text-xs text-fg-muted">
            <time dateTime={toDateTimeAttribute(comment.createdAt)} title={absolute}>
              {relative}
            </time>
            {comment.isEdited && ` · ${t('comments.edited')}`}
          </span>
        </div>

        {editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <label htmlFor={editId} className="sr-only">
              {t('comments.composer.aria')}
            </label>
            <textarea
              id={editId}
              value={draft}
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              className="block w-full min-w-0 resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-md break-words text-fg focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy || !draftChanged}
                onClick={() =>
                  void run(
                    () => onEdit(comment.id, draft.trim()),
                    () => {
                      restoreEditFocus.current = true;
                      setEditing(false);
                    },
                  )
                }
              >
                {t('comments.action.save')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  restoreEditFocus.current = true;
                  setEditing(false);
                  setDraft(comment.body);
                  setError(null);
                }}
              >
                {t('comments.action.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-md whitespace-pre-wrap break-words text-fg">{comment.body}</p>
        )}

        {!editing && (
          <div className="-ml-2 mt-0.5 flex flex-wrap items-center">
            <ReactionButton
              targetType="comment"
              targetId={comment.id}
              count={comment.reactionCount}
              reacted={comment.viewerReaction !== null}
              readOnly={closed}
            />
            {!closed && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                title={t('comments.action.reply')}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-fg-muted hover:bg-surface-sunken"
              >
                <ReplyIcon />
                {t('comments.action.reply')}
              </button>
            )}
            {canPin && (
              <IconAction
                label={comment.isPinned ? t('comments.action.unpin') : t('comments.action.pin')}
                tone="accent"
                disabled={busy}
                pressed={comment.isPinned}
                onClick={() => void run(() => onPin(comment, !comment.isPinned))}
              >
                <PinIcon filled={comment.isPinned} />
              </IconAction>
            )}
            {canEdit && (
              <IconAction
                buttonRef={editButton}
                label={t('comments.action.edit')}
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
              >
                <PencilIcon />
              </IconAction>
            )}
            {canEdit && (
              <IconAction
                buttonRef={deleteButton}
                label={t('comments.action.delete')}
                tone="danger"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                <TrashIcon />
              </IconAction>
            )}
          </div>
        )}

        {confirming && (
          <div
            role="group"
            aria-label={t('comments.delete.title')}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              restoreDeleteFocus.current = true;
              setConfirming(false);
            }}
            className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-surface-sunken p-3"
          >
            <p className="text-sm font-semibold text-fg">{t('comments.delete.title')}</p>
            <p className="text-sm text-fg-muted">
              {comment.depth === 0 && comment.replyCount > 0
                ? t('comments.delete.bodyWithReplies')
                : t('comments.delete.body')}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void run(() => onDelete(comment), () => setConfirming(false))}
              >
                {t('comments.action.delete')}
              </Button>
              <Button
                ref={cancelConfirm}
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  restoreDeleteFocus.current = true;
                  setConfirming(false);
                }}
              >
                {t('comments.action.cancel')}
              </Button>
            </div>
          </div>
        )}

        {error !== null && (
          <p role="alert" className="mt-1 text-sm break-words text-danger-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
