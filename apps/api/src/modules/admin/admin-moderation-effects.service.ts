import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { z } from 'zod';
import type { AuditEntityTypeT, DecideCaseBody, UserRoleT } from '@dnc/contracts';
import { AuditService } from '../audit/index.js';
import type { SessionRevocationReason } from '../auth/auth.service.js';
import { fail } from './admin-moderation-errors.js';
import {
  AdminModerationRepository,
  type CaseRow,
  type TargetLock,
} from './admin-moderation.repository.js';
import { AdminUserActionsRepository } from './admin-user-actions.repository.js';

/** A moderator suspends for at most this long, and only a `member` (Đ37-Đ38). */
const MODERATOR_MAX_SUSPENSION_MS = 30 * 24 * 3_600_000;
/** INV-3 floor, same rule and same reasoning as the user actions service. */
const SUPER_ADMIN_FLOOR = 2;

export type DecideBody = z.output<typeof DecideCaseBody>;
export type ContentType = 'event' | 'post' | 'comment';

/** What a decision did to the world, as the single audit line describes it. */
export interface Effect {
  entityType: AuditEntityTypeT;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  /** Set when an account was suspended, so the caller cuts its sockets after commit. */
  suspendedUserId?: string;
}

/**
 * Applies one decision action to the reported content or the owner's account
 * (D-M11) inside the caller's transaction, after the locks are taken, and
 * describes the outcome for the audit line. Role and conflict checks happen in
 * `AdminModerationService`; the row rules (30-day cap, protected roles, INV-3,
 * source statuses) live here.
 */
@Injectable()
export class AdminModerationEffectsService {
  constructor(
    private readonly moderation: AdminModerationRepository,
    private readonly userActions: AdminUserActionsRepository,
    private readonly audit: AuditService,
  ) {}

  /** Applies the chosen action to the content or the account and describes it for the audit line. */
  async apply(
    tx: PoolClient,
    cut: (userId: string, reason: SessionRevocationReason) => Promise<number>,
    actorRole: UserRoleT,
    kase: CaseRow,
    target: TargetLock | null,
    body: DecideBody,
  ): Promise<Effect> {
    const content: ContentType | null = kase.target_type === 'user' ? null : kase.target_type;
    switch (body.actionType) {
      case 'no_action':
        return this.dismiss(tx, kase, content, target);
      case 'content_hidden':
        return this.hide(tx, kase, content, target);
      case 'content_removed':
        return this.remove(tx, kase, content, target);
      case 'warning':
        return this.warn(kase);
      case 'suspended':
        return this.suspend(tx, cut, actorRole, kase, body);
    }
  }

  /**
   * Dismissal. Content the system hid on its own (D-M7) comes back, unless a
   * moderator already hid or removed it within this case or the newest hide is
   * not this case's automatic one. An event goes back
   * where it was before the hide, never to `published` by default (AD-9).
   */
  private async dismiss(
    tx: PoolClient,
    kase: CaseRow,
    content: ContentType | null,
    target: TargetLock | null,
  ): Promise<Effect> {
    if (
      content &&
      target &&
      kase.auto_hidden &&
      !(await this.moderation.hasContentAction(tx, kase.id)) &&
      (await this.isOwnAutoHide(tx, kase, content))
    ) {
      if (content === 'event' && target.status === 'suspended') {
        const source = await this.audit.lastSuspensionSource(tx, kase.target_id);
        const to = source === 'published' ? 'published' : 'pending_review';
        if (await this.moderation.changeContent(tx, 'event', kase.target_id, ['suspended'], to, null)) {
          return this.contentEffect('event', kase, 'event.restored', 'suspended', to);
        }
      }
      if (content !== 'event' && target.status === 'hidden') {
        if (
          await this.moderation.changeContent(tx, content, kase.target_id, ['hidden'], 'visible', 'clean')
        ) {
          return this.contentEffect(content, kase, `${content}.restored`, 'hidden', 'visible');
        }
      }
    }
    if (content && content !== 'event') {
      await this.moderation.setModerationState(tx, content, kase.target_id, 'clean', [
        'flagged',
        'under_review',
      ]);
    }
    return this.caseEffect(kase, 'moderation_case.dismissed');
  }

  /**
   * True when the newest hide line of the content is the system's automatic
   * hide of this very case. If an admin restored the content and suspended it
   * again, the newest line is theirs (or another case's), and a dismissal here
   * must not undo a hide it did not make.
   */
  private async isOwnAutoHide(tx: PoolClient, kase: CaseRow, content: ContentType): Promise<boolean> {
    const action = content === 'event' ? 'event.suspended' : `${content}.hidden`;
    const latest = await this.audit.latestByAction(tx, content, kase.target_id, action);
    return latest?.actorType === 'system' && latest.caseNumber === Number(kase.case_number);
  }

  private async hide(
    tx: PoolClient,
    kase: CaseRow,
    content: ContentType | null,
    target: TargetLock | null,
  ): Promise<Effect> {
    if (!content || !target) throw fail.transition();
    const from = content === 'event' ? ['published', 'pending_review'] : ['visible', 'pending_review'];
    const to = content === 'event' ? 'suspended' : 'hidden';
    if (from.includes(target.status)) {
      const state = content === 'event' ? null : 'actioned';
      if (!(await this.moderation.changeContent(tx, content, kase.target_id, from, to, state))) {
        throw fail.transition();
      }
      const action = content === 'event' ? 'event.suspended' : `${content}.hidden`;
      return this.contentEffect(content, kase, action, target.status, to);
    }
    if (target.status === to) {
      // Already hidden (typically by the automatic hide): record the decision
      // without a second `event.suspended` line, which would make a later
      // restore forget the real status the event had before.
      await this.moderation.setModerationState(tx, content, kase.target_id, 'actioned', [
        'flagged',
        'under_review',
        'clean',
      ]);
      return this.caseEffect(kase, 'moderation_case.decided');
    }
    throw fail.transition();
  }

  private async remove(
    tx: PoolClient,
    kase: CaseRow,
    content: ContentType | null,
    target: TargetLock | null,
  ): Promise<Effect> {
    if (!content || !target) throw fail.transition();
    const from =
      content === 'event'
        ? ['published', 'pending_review', 'suspended']
        : ['visible', 'pending_review', 'hidden'];
    const to = content === 'event' ? 'taken_down' : 'removed';
    if (!from.includes(target.status)) throw fail.transition();
    const state = content === 'event' ? null : 'actioned';
    if (!(await this.moderation.changeContent(tx, content, kase.target_id, from, to, state))) {
      throw fail.transition();
    }
    const action = content === 'event' ? 'event.taken_down' : `${content}.removed`;
    return this.contentEffect(content, kase, action, target.status, to);
  }

  /** A warning is a strike on the owner (weight 1); no channel delivers it yet (doc 05 section 14). */
  private warn(kase: CaseRow): Effect {
    if (!kase.target_owner_user_id) throw fail.transition();
    return {
      entityType: 'user',
      entityId: kase.target_owner_user_id,
      action: 'user.warned',
      before: null,
      after: { strikeWeight: 1 },
    };
  }

  /**
   * Time-limited suspension of the content's owner. The row rules mirror A3:
   * a moderator only reaches a `member` and at most 30 days; an admin never
   * reaches another admin or a super admin; INV-3 keeps two active super admins.
   */
  private async suspend(
    tx: PoolClient,
    cut: (userId: string, reason: SessionRevocationReason) => Promise<number>,
    actorRole: UserRoleT,
    kase: CaseRow,
    body: DecideBody,
  ): Promise<Effect> {
    if (!kase.target_owner_user_id || !body.expiresAt) throw fail.bodyInvalid();
    const until = new Date(body.expiresAt);
    const now = Date.now();
    if (until.getTime() <= now) throw fail.bodyInvalid();
    if (actorRole === 'moderator' && until.getTime() - now > MODERATOR_MAX_SUSPENSION_MS) {
      throw fail.durationTooLong();
    }
    const owner = await this.moderation.lockUser(tx, kase.target_owner_user_id);
    if (!owner) throw fail.transition();
    if (actorRole === 'moderator' && owner.role !== 'member') throw fail.protectedRole();
    if (actorRole === 'admin' && (owner.role === 'admin' || owner.role === 'super_admin')) {
      throw fail.protectedRole();
    }
    if (owner.status !== 'active') throw fail.transition();
    if (
      owner.role === 'super_admin' &&
      (await this.userActions.countActiveSuperAdmins(tx)) <= SUPER_ADMIN_FLOOR
    ) {
      throw fail.lastSuperAdmin();
    }
    if (!(await this.moderation.suspendUser(tx, owner.id, until, body.reasonNote))) {
      throw fail.transition();
    }
    await cut(owner.id, 'suspended');
    return {
      entityType: 'user',
      entityId: owner.id,
      action: 'user.suspended',
      before: { status: 'active' },
      after: { status: 'suspended', expiresAt: until.toISOString() },
      suspendedUserId: owner.id,
    };
  }

  private contentEffect(
    content: ContentType,
    kase: CaseRow,
    action: string,
    from: string,
    to: string,
  ): Effect {
    return {
      entityType: content,
      entityId: kase.target_id,
      action,
      before: { status: from },
      after: { status: to },
    };
  }

  private caseEffect(kase: CaseRow, action: string): Effect {
    return {
      entityType: 'moderation_case',
      entityId: kase.id,
      action,
      before: null,
      after: { targetType: kase.target_type },
    };
  }
}
