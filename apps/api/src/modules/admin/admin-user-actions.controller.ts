import { Body, Controller, HttpCode, Param, Post, Req, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminRoleActionResult,
  AdminUserActionResult,
  ChangeRoleBody,
  envelope,
  ReasonedActionBody,
  type AdminRoleActionResultT,
  type AdminUserActionResultT,
  type ChangeRoleBodyT,
  type ReasonedActionBodyT,
} from '@dnc/contracts';
import { CurrentUser, type CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminActionBodyPipe } from './admin-action-body.pipe.js';
import {
  AdminUserActionsService,
  type ActionRequestMeta,
} from './admin-user-actions.service.js';

const UserActionEnvelope = envelope(AdminUserActionResult);
const RoleActionEnvelope = envelope(AdminRoleActionResult);
const UuidParam = z.uuid();

/**
 * The contract refuses `super_admin`; the route accepts the value so the
 * service can answer `invalidTransition` (A3-AC-10) instead of a generic 400.
 */
const ChangeRoleRouteBody = ChangeRoleBody.extend({
  role: z.enum(['member', 'curator', 'moderator', 'admin', 'super_admin']),
});

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

const header = (req: RequestLike, name: string): string | null => {
  const value = req.headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
};

const metaOf = (req: RequestLike): ActionRequestMeta => ({
  requestId: header(req, 'x-request-id'),
  ip: req.ip ?? null,
  userAgent: header(req, 'user-agent'),
});

/** Console actions on user accounts. Roles come from the permission matrix. */
@Controller('api/v1/admin/users')
export class AdminUserActionsController {
  constructor(private readonly actions: AdminUserActionsService) {}

  /** Suspends an active account and cuts its sessions at once. */
  @Post(':id/suspend')
  @HttpCode(200)
  @Roles(...allowedRolesFor('user.suspend'))
  @SerializeOptions({ schema: UserActionEnvelope })
  async suspend(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ReasonedActionBody)) body: ReasonedActionBodyT,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminUserActionResultT }> {
    return { success: true, data: await this.actions.suspend(caller, id, body.reason, metaOf(req)) };
  }

  /** Lifts a suspension. */
  @Post(':id/unsuspend')
  @HttpCode(200)
  @Roles(...allowedRolesFor('user.suspend'))
  @SerializeOptions({ schema: UserActionEnvelope })
  async unsuspend(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ReasonedActionBody)) body: ReasonedActionBodyT,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminUserActionResultT }> {
    return {
      success: true,
      data: await this.actions.unsuspend(caller, id, body.reason, metaOf(req)),
    };
  }

  /** Changes a role among member, curator, moderator and admin. Super admin only. */
  @Post(':id/role')
  @HttpCode(200)
  @Roles(...allowedRolesFor('user.role.assign'))
  @SerializeOptions({ schema: RoleActionEnvelope })
  async changeRole(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ChangeRoleRouteBody))
    body: Omit<ChangeRoleBodyT, 'role'> & { role: ChangeRoleBodyT['role'] | 'super_admin' },
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminRoleActionResultT }> {
    return {
      success: true,
      data: await this.actions.changeRole(caller, id, body.role, body.reason, metaOf(req)),
    };
  }
}
