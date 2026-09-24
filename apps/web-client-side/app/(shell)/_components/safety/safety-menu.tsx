'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportTargetTypeT } from '@dnc/contracts';
import type { MessageKey } from '@dnc/i18n';

import { Badge, Button } from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { publicProfile, unblockUser } from '../../../_lib/api';
import { cn } from '../../../_lib/cn';
import { BlockDialog, blockFailureKey } from './block-dialog';
import { ReportSheet } from './report-sheet';

export type SafetyOwner = { userId: string } | { handle: string };

export interface SafetyMenuProps {
  /** What "Report" files against. */
  target: { type: ReportTargetTypeT; id: string };
  /**
   * The person behind the target — the one "Block" blocks. Posts and profiles
   * carry the user id; an event only names its organizer by handle, which is
   * resolved through the public profile (no contract change, task board T-WEB-1).
   */
  owner: SafetyOwner;
  /** "Block author" / "Block organizer" / "Block this person". */
  blockLabel: MessageKey;
  /** After a block the API confirmed, from the menu or from "also block" on a report. */
  onBlocked?: () => void;
  onUnblocked?: () => void;
  className?: string;
}

/**
 * The "⋯" entry to Report and Block on anything a member wrote.
 *
 * Callers do not render it on the viewer's own content: reporting or blocking
 * yourself is refused by the API, and offering it would only teach people the
 * menu is noise. Signed-out visitors do see it; both actions go through the
 * sign-in prompt first.
 */
export function SafetyMenu({
  target,
  owner,
  blockLabel,
  onBlocked,
  onUnblocked,
  className,
}: SafetyMenuProps) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [unblockFailure, setUnblockFailure] = useState<MessageKey | null>(null);

  // The resolved id is kept for the life of the menu: once the viewer has
  // blocked an organizer, the organizer's profile answers 404 to them, so the
  // lookup that unblocking needs must have happened before the block.
  const ownerId = useRef<{ handle: string; id: Promise<string> } | null>(null);
  const ownerUserId = 'userId' in owner ? owner.userId : null;
  const ownerHandle = 'handle' in owner ? owner.handle : null;
  const resolveOwnerId = useCallback((): Promise<string> => {
    if (ownerUserId !== null) return Promise.resolve(ownerUserId);
    const handle = ownerHandle ?? '';
    const cached = ownerId.current;
    if (cached !== null && cached.handle === handle) return cached.id;
    const id = publicProfile(handle).then(
      (profile) => profile.userId,
      (cause: unknown) => {
        // Let the next attempt try again rather than caching the failure.
        ownerId.current = null;
        throw cause;
      },
    );
    ownerId.current = { handle, id };
    return id;
  }, [ownerUserId, ownerHandle]);

  // Close on a click outside or on Escape, and put focus on the first item
  // when the menu opens so it is usable from the keyboard.
  useEffect(() => {
    if (!menuOpen) return;
    firstItemRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    // Warm the organizer lookup while the viewer is choosing (see above).
    if (!menuOpen && user !== null) void resolveOwnerId().catch(() => undefined);
    setMenuOpen(!menuOpen);
  };

  const markBlocked = () => {
    setBlocked(true);
    setUnblockFailure(null);
    onBlocked?.();
  };

  const unblock = async () => {
    if (unblocking) return;
    setUnblocking(true);
    setUnblockFailure(null);
    try {
      await unblockUser(await resolveOwnerId());
      setBlocked(false);
      onUnblocked?.();
    } catch (cause) {
      setUnblockFailure(blockFailureKey(cause));
    } finally {
      setUnblocking(false);
    }
  };

  const itemClass =
    'flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none sm:min-h-10';

  return (
    <div ref={rootRef} className={cn('relative flex shrink-0 flex-col items-end gap-1', className)}>
      <div className="flex items-center gap-1.5">
        {blocked && (
          <>
            <Badge tone="neutral">{t('safety.block.blocked')}</Badge>
            <Button variant="ghost" size="sm" onClick={() => void unblock()} disabled={unblocking}>
              {t('safety.block.unblock')}
            </Button>
          </>
        )}
        <button
          type="button"
          onClick={toggleMenu}
          aria-label={t('safety.menu.more')}
          title={t('safety.menu.more')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid size-11 place-items-center rounded-full text-lg leading-none text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg sm:size-9"
        >
          <span aria-hidden>⋯</span>
        </button>
      </div>

      {unblockFailure !== null && (
        <p role="alert" className="max-w-64 text-right text-xs text-danger-text">
          {t(unblockFailure)}
        </p>
      )}

      {menuOpen && (
        <div
          role="menu"
          aria-label={t('safety.menu.more')}
          className="absolute top-full right-0 z-30 mt-1 w-max max-w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-surface py-1 shadow-raised"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setMenuOpen(false);
              requireAuth(() => setReportOpen(true));
            }}
          >
            {t('safety.report.action')}
          </button>
          {!blocked && (
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, 'text-danger-text')}
              onClick={() => {
                setMenuOpen(false);
                requireAuth(() => setBlockOpen(true));
              }}
            >
              {t(blockLabel)}
            </button>
          )}
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={target.type}
        targetId={target.id}
        onReported={({ alsoBlocked }) => {
          if (alsoBlocked) markBlocked();
        }}
      />
      <BlockDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        resolveUserId={resolveOwnerId}
        onBlocked={markBlocked}
      />
    </div>
  );
}
