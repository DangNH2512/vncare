'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { PostKindT, PostResponseT } from '@dnc/contracts';
import type { MessageKey } from '@dnc/i18n';

import { Avatar, Button, Select } from '../../_components/ui';
import { useAuth } from '../../_components/auth-provider';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { AREAS, areaName } from '../../_lib/areas';
import { ApiError, createPost } from '../../_lib/api';
import { cn } from '../../_lib/cn';
import { kindOf, uploadDraft, type DraftMedia } from '../../_lib/media-upload';
import { MediaCarousel, type CarouselItem } from './media-carousel';
import { MediaPicker } from './media-picker';
import { LocationPicker, type PickedLocation } from './location-picker';

const BODY_LIMIT = 5000;

/** Order matches how often each type is used, most common first. */
const KINDS: readonly PostKindT[] = ['question', 'recommendation', 'looking_for', 'notice'];

const KIND_LABEL: Readonly<Record<PostKindT, MessageKey>> = {
  question: 'post.kind.question',
  recommendation: 'post.kind.recommendation',
  looking_for: 'post.kind.lookingFor',
  notice: 'post.kind.notice',
};

export interface PostComposerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (post: PostResponseT) => void;
}

/**
 * Two-stage composer for a community post.
 *
 * Stage one is media, stage two is everything else — the split Instagram
 * established, and it earns its place here for a reason beyond familiarity:
 * uploads start while the author is still writing, so publishing is instant
 * even on a hotel wifi. A post with no media skips straight to stage two.
 *
 * Built on the native `<dialog>` element rather than a div overlay: it brings
 * the focus trap, the Escape handler and the inert background with it, all of
 * which are easy to get subtly wrong by hand and impossible to notice without a
 * keyboard or a screen reader.
 */
export function PostComposer({ open, onClose, onCreated }: PostComposerProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyId = useId();

  const [stage, setStage] = useState<'pick' | 'compose'>('pick');
  const [kind, setKind] = useState<PostKindT>('question');
  const [areaId, setAreaId] = useState<string>('');
  const [body, setBody] = useState('');
  const [drafts, setDrafts] = useState<DraftMedia[]>([]);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const patchDraft = useCallback((localId: string, patch: Partial<DraftMedia>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.localId === localId ? { ...draft, ...patch } : draft)),
    );
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const added: DraftMedia[] = [];
      for (const file of files) {
        const mediaKind = kindOf(file);
        if (mediaKind === null) continue;
        added.push({
          localId: crypto.randomUUID(),
          mediaId: null,
          kind: mediaKind,
          file,
          previewUrl: URL.createObjectURL(file),
          width: null,
          height: null,
          durationSeconds: null,
          progress: 0,
          status: 'uploading',
        });
      }
      if (added.length === 0) return;

      setDrafts((current) => [...current, ...added]);
      setStage('compose');
      for (const draft of added) {
        void uploadDraft(draft, (patch) => patchDraft(draft.localId, patch));
      }
    },
    [patchDraft],
  );

  const removeDraft = (localId: string) => {
    setDrafts((current) => {
      const gone = current.find((draft) => draft.localId === localId);
      // Object URLs are held by the browser until revoked; leaking one per
      // discarded photo adds up fast in a session of editing.
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((draft) => draft.localId !== localId);
    });
  };

  const reset = useCallback(() => {
    for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
    setStage('pick');
    setKind('question');
    setAreaId('');
    setBody('');
    setDrafts([]);
    setLocation(null);
    setShowMap(false);
    setError(null);
    setSubmitting(false);
  }, [drafts]);

  const close = () => {
    reset();
    onClose();
  };

  const trimmed = body.trim();
  const uploading = drafts.some((draft) => draft.status === 'uploading');
  const ready = drafts.filter((draft) => draft.status === 'ready');
  const canSubmit = trimmed.length > 0 && !uploading && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createPost({
        kind,
        body: trimmed,
        mediaIds: ready.map((draft) => draft.mediaId).filter((id): id is string => id !== null),
        ...(areaId === '' ? {} : { areaId }),
        ...(location === null ? {} : { location }),
      });
      onCreated(created);
      close();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.isOffline
          ? t('post.composer.errorOffline')
          : t('post.composer.errorGeneric'),
      );
      setSubmitting(false);
    }
  };

  const previewItems: CarouselItem[] = drafts.map((draft) => ({
    id: draft.localId,
    kind: draft.kind,
    url: draft.previewUrl,
    width: draft.width,
    height: draft.height,
  }));

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      aria-label={t('post.composer.title')}
      className={cn(
        'm-auto w-[min(60rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line',
        'bg-surface p-0 text-fg shadow-card backdrop:bg-fg/50 backdrop:backdrop-blur-sm',
      )}
    >
      {/* Header mirrors the stage: back only exists once there is somewhere to
          go back to, and the primary action names what it will do next. */}
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        {stage === 'compose' && drafts.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setStage('pick')}>
            ‹ {t('post.composer.back')}
          </Button>
        ) : (
          <span className="min-h-9" />
        )}
        <h2 className="text-md font-semibold">{t('post.composer.title')}</h2>
        {stage === 'pick' ? (
          <Button variant="ghost" size="sm" onClick={() => setStage('compose')}>
            {t('post.composer.skipMedia')} ›
          </Button>
        ) : (
          // One primary action for the whole dialog, in the header where the
          // eye already is after the Back control. A second Post button at the
          // foot of a scrolling column only duplicates it and gets clipped.
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={close} disabled={submitting}>
              {t('post.composer.cancel')}
            </Button>
            <Button size="sm" onClick={() => void submit()} disabled={!canSubmit}>
              {submitting
                ? t('post.composer.submitting')
                : uploading
                  ? t('post.composer.waitingUploads')
                  : t('post.composer.submit')}
            </Button>
          </div>
        )}
      </header>

      {stage === 'pick' ? (
        <div className="p-5">
          <MediaPicker onFiles={addFiles} variant="stage" />
        </div>
      ) : (
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          // Two columns on a wide screen, stacked on a phone: the gallery is the
          // subject and deserves the larger half, the text the taller one.
          className="grid max-h-[min(80vh,44rem)] grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden"
        >
          <section className="flex min-w-0 flex-col justify-center gap-3 border-line p-4 md:border-r">
            {drafts.length > 0 ? (
              <>
                <MediaCarousel
                  items={previewItems}
                  label={t('post.media.previewLabel')}
                  previousLabel={t('post.media.previous')}
                  nextLabel={t('post.media.next')}
                />
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {drafts.map((draft) => (
                    <div key={draft.localId} className="relative shrink-0">
                      {draft.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a local object URL has nothing to optimise
                        <img
                          src={draft.previewUrl}
                          alt=""
                          className="size-16 rounded-md border border-line bg-surface-sunken object-cover"
                        />
                      ) : (
                        <video
                          src={draft.previewUrl}
                          className="size-16 rounded-md border border-line bg-surface-sunken object-cover"
                          muted
                        />
                      )}
                      {draft.status !== 'ready' && (
                        <span
                          className={cn(
                            'absolute inset-0 grid place-items-center rounded-md text-xs font-semibold',
                            draft.status === 'failed'
                              ? 'bg-danger-subtle text-danger-text'
                              : 'bg-fg/55 text-bg',
                          )}
                        >
                          {draft.status === 'failed'
                            ? '!'
                            : `${Math.round(draft.progress * 100)}%`}
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={t('post.media.remove')}
                        onClick={() => removeDraft(draft.localId)}
                        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-fg text-xs text-bg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <MediaPicker onFiles={addFiles} variant="inline" />
                </div>
                <p className="text-xs text-fg-muted">
                  {t('post.media.counter', { count: drafts.length })}
                </p>
              </>
            ) : (
              <MediaPicker onFiles={addFiles} variant="stage" />
            )}
          </section>

          <section className="flex min-w-0 flex-col gap-4 p-4 md:overflow-y-auto">
            <div className="flex items-center gap-2">
              <Avatar
                name={user?.displayName ?? 'You'}
                size="sm"
                {...(user?.avatarUrl ? { src: user.avatarUrl } : {})}
              />
              <span className="text-sm font-semibold">
                {user?.displayName ?? t('post.composer.you')}
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={bodyId} className="text-sm font-medium text-fg">
                {t('post.composer.bodyLabel')}
              </label>
              <textarea
                id={bodyId}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={BODY_LIMIT}
                rows={6}
                autoFocus
                placeholder={t('post.composer.bodyPlaceholder')}
                className={cn(
                  'min-h-36 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-md',
                  'transition-[border-color] duration-150 focus:border-accent focus:outline-none',
                )}
              />
              <p className="text-right text-xs text-fg-muted">
                {body.length}/{BODY_LIMIT}
              </p>
            </div>

            <Select
              label={t('post.composer.kindLabel')}
              value={kind}
              onChange={(event) => setKind(event.target.value as PostKindT)}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(KIND_LABEL[value])}
                </option>
              ))}
            </Select>

            <Select
              label={t('post.composer.areaLabel')}
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
            >
              <option value="">{t('post.composer.areaCityWide')}</option>
              {AREAS.map((area) => (
                <option key={area.id} value={area.id}>
                  {areaName(area, locale)}
                </option>
              ))}
            </Select>

            {/* The map is behind a disclosure: most posts have no place, and a
                map that loads tiles for everyone would make the composer slow
                for the majority to serve the minority. */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowMap((current) => !current)}
                aria-expanded={showMap}
                className={cn(
                  'flex min-h-11 items-center justify-between gap-2 rounded-md border border-line px-3',
                  'text-left text-sm transition-colors hover:border-line-strong hover:bg-surface-sunken',
                )}
              >
                <span className="min-w-0 truncate">
                  📍{' '}
                  {location === null
                    ? t('post.location.add')
                    : (location.label || t('post.location.pinned'))}
                </span>
                <span aria-hidden className="text-fg-muted">
                  {showMap ? '▴' : '▾'}
                </span>
              </button>
              {showMap && <LocationPicker value={location} onChange={setLocation} />}
            </div>

            {error !== null && (
              <p
                role="alert"
                className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text"
              >
                {error}
              </p>
            )}

          </section>
        </form>
      )}
    </dialog>
  );
}
