'use client';

import { useRef, useState } from 'react';

import { Button } from '../../_components/ui';
import { useTranslate } from '../../_components/locale-provider';
import { cn } from '../../_lib/cn';
import { rejectionFor, type MediaRejection } from '../../_lib/media-upload';

export interface MediaPickerProps {
  onFiles: (files: File[]) => void;
  variant: 'stage' | 'inline';
}

/**
 * Drop zone and file input.
 *
 * `stage` is the empty first screen of the composer; `inline` is the small
 * "add more" tile that sits at the end of the thumbnail strip. Both share the
 * validation so a rejected file gives the same message wherever it was dropped.
 */
export function MediaPicker({ onFiles, variant }: MediaPickerProps) {
  const t = useTranslate();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<MediaRejection | null>(null);

  const accept = (list: FileList | null) => {
    if (!list) return;
    const files = [...list];
    const usable: File[] = [];
    let problem: MediaRejection | null = null;

    // Nothing is dropped for being "too many": a gallery has no item ceiling.
    // Only an unusable file type or size is refused.
    for (const file of files) {
      const rejection = rejectionFor(file);
      if (rejection !== null) {
        problem ??= rejection;
        continue;
      }
      usable.push(file);
    }

    setRejected(problem);
    if (usable.length > 0) onFiles(usable);
  };

  const open = () => input.current?.click();

  return (
    <div className={variant === 'stage' ? 'flex flex-col gap-3' : 'contents'}>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,video/mp4,video/quicktime,video/webm"
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files);
          // Reset so picking the same file twice still fires a change event.
          event.target.value = '';
        }}
      />

      {variant === 'stage' ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-14 text-center',
            'transition-[border-color,background-color] duration-150',
            dragging ? 'border-accent bg-accent-subtle' : 'border-line bg-surface-sunken',
          )}
        >
          {/* A drawn glyph rather than a stock icon: two overlapping frames read
              as "a set of photos", which is what this composer is for. */}
          <span aria-hidden className="relative block h-16 w-20">
            <span className="absolute top-0 left-0 block size-14 -rotate-12 rounded-md border-2 border-line-strong bg-surface" />
            <span className="absolute top-2 left-6 block size-14 rotate-[9deg] rounded-md border-2 border-accent bg-accent-subtle" />
          </span>
          <div>
            <p className="text-lg font-semibold text-fg">{t('post.media.dropTitle')}</p>
            <p className="mt-1 text-sm text-fg-muted">{t('post.media.dropHint')}</p>
          </div>
          <Button onClick={open}>{t('post.media.choose')}</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-label={t('post.media.addMore')}
          className={cn(
            'grid size-16 shrink-0 place-items-center rounded-md border-2 border-dashed border-line',
            'text-xl text-fg-muted transition-colors hover:border-accent hover:text-accent-text',
          )}
        >
          +
        </button>
      )}

      {rejected !== null && (
        <p role="alert" className="text-sm text-danger-text">
          {t(rejected === 'type' ? 'post.media.rejectedType' : 'post.media.rejectedSize')}
        </p>
      )}
    </div>
  );
}
