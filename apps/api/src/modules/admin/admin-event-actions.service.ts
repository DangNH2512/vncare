import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import type { AdminEventActionResultT, EventStatusT } from '@dnc/contracts';
import { AuditService } from '../audit/index.js';
import type { ActionActor, ActionRequestMeta } from './admin-user-actions.service.js';
import { AdminEventActionsRepository } from './admin-event-actions.repository.js';

type EventAction = 'suspend' | 'restore' | 'takedown';

interface ActionRule {
  permission: 'content.hide' | 'event.takedown';
  from: readonly EventStatusT[];
  to: EventStatusT;
  audit: string;
}

/**
 * Source and target per action (D-R6). `draft`, `cancelled` and `taken_down`
 * appear in no source list, so they always answer `invalidTransition`.
 */
const RULES: Record<EventAction, ActionRule> = {
  suspend: {
    permission: 'content.hide',
    from: ['published', 'pending_review'],
    to: 'suspended',
    audit: 'event.suspended',
  },
  restore: {
    permission: 'content.hide',
    from: ['suspended'],
    // Never used: restore reads its target from the audit trail (`restoreTarget`).
    to: 'pending_review',
    audit: 'event.restored',
  },
  takedown: {
    permission: 'event.takedown',
    from: ['published', 'pending_review', 'suspended'],
    to: 'taken_down',
    audit: 'event.taken_down',
  },
};

const fail = {
  notFound: () =>
    new NotFoundException({ code: 'EVENT_NOT_FOUND', messageKey: 'errors.admin.eventNotFound' }),
  roleNotAllowed: () =>
    new ForbiddenException({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }),
  conflictOfInterest: () =>
    new ForbiddenException({
      code: 'CONFLICT_OF_INTEREST',
      messageKey: 'errors.admin.conflictOfInterest',
    }),
  transition: () =>
    new ConflictException({
      code: 'INVALID_TRANSITION',
      messageKey: 'errors.admin.invalidTransition',
    }),
};

/**
 * Suspend, restore and take down an event (A3, T4-T6).
 *
 * One transaction per action: re-read actor, lock the event row, rules,
 * conditional update, audit line. Anything refused throws before the audit
 * write, so a 4xx leaves no audit line, and an audit failure rolls the change
 * back. RSVPs are never touched: the existing ones keep their status, and new
 * ones are refused because the RSVP path requires `events.status = 'published'`.
 */
@Injectable()
export class AdminEventActionsService {
  constructor(
    private readonly actions: AdminEventActionsRepository,
    private readonly audit: AuditService,
  ) {}

  suspend(actor: ActionActor, id: string, reason: string, meta: ActionRequestMeta) {
    return this.run('suspend', actor, id, reason, meta);
  }

  /** Returns a suspended event to the status it had before the suspension. */
  restore(actor: ActionActor, id: string, reason: string, meta: ActionRequestMeta) {
    return this.run('restore', actor, id, reason, meta);
  }

  takedown(actor: ActionActor, id: string, reason: string, meta: ActionRequestMeta) {
    return this.run('takedown', actor, id, reason, meta);
  }

  /**
   * Restore returns the event to the status it had before the suspension, so a
   * `pending_review` event never becomes public without review. The suspend
   * audit line is written in the same transaction as the suspension and the
   * table is append-only; the audit service picks the newest unclosed one by id. A missing
   * or unexpected value (data suspended before this rule) falls back to
   * `pending_review`, the safe side.
   */
  private async restoreTarget(
    tx: Parameters<AdminEventActionsRepository['findActor']>[0],
    eventId: string,
  ): Promise<EventStatusT> {
    const previous = await this.audit.lastSuspensionSource(tx, eventId);
    return previous === 'published' ? 'published' : 'pending_review';
  }

  private run(
    action: EventAction,
    actor: ActionActor,
    id: string,
    reason: string,
    meta: ActionRequestMeta,
  ): Promise<AdminEventActionResultT> {
    const rule = RULES[action];
    return this.actions.transaction(async (tx) => {
      // The token claim may predate a demotion or suspension: ask the database.
      const current = await this.actions.findActor(tx, actor.id);
      if (
        !current ||
        current.status !== 'active' ||
        !(allowedRolesFor(rule.permission) as readonly string[]).includes(current.role)
      ) {
        throw fail.roleNotAllowed();
      }
      const event = await this.actions.lockEvent(tx, id);
      if (!event) throw fail.notFound();
      // Đ34: a moderator does not moderate their own event. Higher roles are
      // not bound by this rule in v1.
      if (current.role === 'moderator' && event.organizer_id === actor.id) {
        throw fail.conflictOfInterest();
      }
      if (!rule.from.includes(event.status)) throw fail.transition();
      const to = action === 'restore' ? await this.restoreTarget(tx, event.id) : rule.to;
      if (!(await this.actions.transitionStatus(tx, event.id, rule.from, to))) {
        throw fail.transition();
      }
      await this.audit.record(tx, {
        actor: { userId: actor.id, type: 'staff', role: current.role },
        action: rule.audit,
        entityType: 'event',
        entityId: event.id,
        before: { status: event.status },
        after: { status: to },
        reason,
        ...meta,
      });
      return { id: event.id, status: to };
    });
  }
}
