import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import type {
  AdminRoleActionResultT,
  AdminUserActionResultT,
  AssignableRoleT,
  UserRoleT,
} from '@dnc/contracts';
import { AuditService } from '../audit/index.js';
import { AuthService } from '../auth/index.js';
import { ChatSocketControl } from '../chat/index.js';
import { AdminModerationRepository } from './admin-moderation.repository.js';
import {
  AdminUserActionsRepository,
  type ActionTargetRow,
} from './admin-user-actions.repository.js';

export interface ActionActor {
  id: string;
  role: string;
}

/** Request facts stored with the audit line; never returned to the client. */
export interface ActionRequestMeta {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
}

/** Minimum trust level to hold a role that moderates other people's content. */
const STAFF_TRUST_MIN = 3;
const TRUST_GATED_ROLES: ReadonlySet<string> = new Set(['moderator', 'admin']);
/**
 * INV-3 keeps at least two active super admins. The count is taken before the
 * suspension, so "active before <= 2" is the same as "fewer than 2 remain
 * after". Do not relax this to `<= 1`: that would allow going from 2 to 1.
 */
const SUPER_ADMIN_FLOOR = 2;

const fail = {
  notFound: () =>
    new NotFoundException({ code: 'USER_NOT_FOUND', messageKey: 'errors.admin.userNotFound' }),
  self: () =>
    new ForbiddenException({ code: 'SELF_ACTION', messageKey: 'errors.admin.selfAction' }),
  protectedRole: () =>
    new ForbiddenException({
      code: 'TARGET_ROLE_PROTECTED',
      messageKey: 'errors.admin.targetRoleProtected',
    }),
  roleNotAllowed: () =>
    new ForbiddenException({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }),
  transition: () =>
    new ConflictException({
      code: 'INVALID_TRANSITION',
      messageKey: 'errors.admin.invalidTransition',
    }),
  lastSuperAdmin: () =>
    new ConflictException({
      code: 'LAST_SUPER_ADMIN',
      messageKey: 'errors.admin.lastSuperAdmin',
    }),
  trustTooLow: () =>
    new ConflictException({ code: 'TRUST_TOO_LOW', messageKey: 'errors.admin.trustTooLow' }),
};

/**
 * Suspend, unsuspend and role change (A3, T1-T3).
 *
 * Each action is one transaction: lock, rules, conditional update, audit line,
 * session revocation. Anything refused throws before the audit write, so a 4xx
 * leaves no audit line, and an audit failure rolls the whole action back.
 */
@Injectable()
export class AdminUserActionsService {
  private readonly logger = new Logger(AdminUserActionsService.name);

  constructor(
    private readonly actions: AdminUserActionsRepository,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly chat: ChatSocketControl,
    private readonly moderation: AdminModerationRepository,
  ) {}

  async suspend(
    actor: ActionActor,
    targetId: string,
    reason: string,
    meta: ActionRequestMeta,
  ): Promise<AdminUserActionResultT> {
    const { result, markDeferred } = await this.auth.withSessionRevocation(async (tx, cut) => {
      const { actorRole, target } = await this.begin(tx, actor, targetId, 'user.suspend');
      this.assertMayTouchStaff(actorRole, target);
      if (target.status !== 'active') throw fail.transition();
      if (
        target.role === 'super_admin' &&
        (await this.actions.countActiveSuperAdmins(tx)) <= SUPER_ADMIN_FLOOR
      ) {
        throw fail.lastSuperAdmin();
      }
      if (!(await this.actions.transitionStatus(tx, target.id, 'active', 'suspended', reason))) {
        throw fail.transition();
      }
      await this.audit.record(tx, {
        actor: { userId: actor.id, type: 'staff', role: actorRole },
        action: 'user.suspended',
        entityType: 'user',
        entityId: target.id,
        before: { status: 'active' },
        after: { status: 'suspended' },
        reason,
        ...meta,
      });
      // D-R17: the same act is also a moderation action, outside any case.
      await this.moderation.insertAction(tx, {
        caseId: null,
        actionType: 'suspended',
        actorUserId: actor.id,
        actorRole,
        subjectUserId: target.id,
        targetType: 'user',
        targetId: target.id,
        reasonCode: 'other',
        reasonNote: reason,
        severity: 'high',
      });
      await cut(target.id, 'suspended');
      return { id: target.id, status: 'suspended' as const, role: target.role };
    });
    this.afterCut(result.id, markDeferred, 'suspend');
    return markDeferred ? { ...result, sessionCutDeferred: true } : result;
  }

  async unsuspend(
    actor: ActionActor,
    targetId: string,
    reason: string,
    meta: ActionRequestMeta,
  ): Promise<AdminUserActionResultT> {
    // Sessions were revoked at suspension; nothing to cut here. The deny-list
    // mark compares against `iat`, so a fresh login works immediately.
    const { result } = await this.auth.withSessionRevocation(async (tx) => {
      const { actorRole, target } = await this.begin(tx, actor, targetId, 'user.suspend');
      this.assertMayTouchStaff(actorRole, target);
      if (target.status !== 'suspended') throw fail.transition();
      if (!(await this.actions.transitionStatus(tx, target.id, 'suspended', 'active', null))) {
        throw fail.transition();
      }
      await this.audit.record(tx, {
        actor: { userId: actor.id, type: 'staff', role: actorRole },
        action: 'user.unsuspended',
        entityType: 'user',
        entityId: target.id,
        before: { status: 'suspended' },
        after: { status: 'active' },
        reason,
        ...meta,
      });
      return { id: target.id, status: 'active' as const, role: target.role };
    });
    return result;
  }

  async changeRole(
    actor: ActionActor,
    targetId: string,
    role: AssignableRoleT | 'super_admin',
    reason: string,
    meta: ActionRequestMeta,
  ): Promise<AdminRoleActionResultT> {
    const { result, markDeferred } = await this.auth.withSessionRevocation(async (tx, cut) => {
      const { actorRole, target } = await this.begin(tx, actor, targetId, 'user.role.assign');
      // super_admin can be neither granted nor taken away through the API in v1.
      if (role === 'super_admin' || target.role === 'super_admin') throw fail.transition();
      if (target.status !== 'active') throw fail.transition();
      if (target.role === role) throw fail.transition();
      if (TRUST_GATED_ROLES.has(role) && target.trust_level < STAFF_TRUST_MIN) {
        throw fail.trustTooLow();
      }
      if (!(await this.actions.transitionRole(tx, target.id, target.role, role))) {
        throw fail.transition();
      }
      await this.audit.record(tx, {
        actor: { userId: actor.id, type: 'staff', role: actorRole },
        action: 'user.role_changed',
        entityType: 'user',
        entityId: target.id,
        before: { role: target.role },
        after: { role },
        reason,
        ...meta,
      });
      // The role is a token claim, so every old token is stale from now on.
      await cut(target.id, 'role_changed');
      return { id: target.id, role: role as UserRoleT };
    });
    this.afterCut(result.id, markDeferred, 'role');
    return markDeferred ? { ...result, sessionCutDeferred: true } : result;
  }

  /**
   * Shared opening of every action: take the invariant lock, re-read the actor
   * (the token claim may predate a demotion), then lock the target and refuse a
   * self-action. The actor's role is checked against the permission matrix
   * again here so the rule does not live only on the route decorator.
   */
  private async begin(
    tx: Parameters<AdminUserActionsRepository['lockInvariant']>[0],
    actor: ActionActor,
    targetId: string,
    permission: 'user.suspend' | 'user.role.assign',
  ): Promise<{ actorRole: UserRoleT; target: ActionTargetRow }> {
    await this.actions.lockInvariant(tx);
    const current = await this.actions.findActor(tx, actor.id);
    if (
      !current ||
      current.status !== 'active' ||
      !(allowedRolesFor(permission) as readonly string[]).includes(current.role)
    ) {
      throw fail.roleNotAllowed();
    }
    if (actor.id === targetId) throw fail.self();
    const target = await this.actions.lockTarget(tx, targetId);
    if (!target) throw fail.notFound();
    return { actorRole: current.role, target };
  }

  /** `admin` may act on non-staff-admin accounts only; `super_admin` on anyone but themself. */
  private assertMayTouchStaff(actorRole: UserRoleT, target: ActionTargetRow): void {
    if (actorRole === 'admin' && (target.role === 'admin' || target.role === 'super_admin')) {
      throw fail.protectedRole();
    }
  }

  /**
   * Post-commit work. Never throws: the change is already durable, and failing
   * the request now would invite a retry that hits `invalidTransition`.
   */
  private afterCut(userId: string, markDeferred: boolean, action: 'suspend' | 'role'): void {
    try {
      this.chat.disconnectUser(userId);
    } catch (error) {
      this.logger.error(
        `socket disconnect failed after ${action} of ${userId}: ${(error as Error).message}`,
      );
    }
    if (markDeferred) {
      // The deny-list mark was refused by Redis, so the old access token lives
      // until it expires (at most 15 minutes). The audit line is already
      // committed and append-only; the response carries `sessionCutDeferred`.
      this.logger.warn(`sessionCutDeferred: ${action} of ${userId} committed without deny-list mark`);
    }
  }
}
