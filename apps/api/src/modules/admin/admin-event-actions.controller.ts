import { Body, Controller, HttpCode, Param, Post, Req, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminEventActionResult,
  envelope,
  ReasonedActionBody,
  type AdminEventActionResultT,
  type ReasonedActionBodyT,
} from '@dnc/contracts';
import { CurrentUser, type CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminActionBodyPipe } from './admin-action-body.pipe.js';
import { AdminEventActionsService } from './admin-event-actions.service.js';
import type { ActionRequestMeta } from './admin-user-actions.service.js';

const EventActionEnvelope = envelope(AdminEventActionResult);
const UuidParam = z.uuid();

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

const header = (req: RequestLike, name: string): string | null => {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? null;
};

const metaOf = (req: RequestLike): ActionRequestMeta => ({
  requestId: header(req, 'x-request-id'),
  ip: req.ip ?? null,
  userAgent: header(req, 'user-agent'),
});

/** Console actions on events. Roles come from the permission matrix. */
@Controller('api/v1/admin/events')
export class AdminEventActionsController {
  constructor(private readonly actions: AdminEventActionsService) {}

  /** Hides a published or pending event from the public; reversible. */
  @Post(':id/suspend')
  @HttpCode(200)
  @Roles(...allowedRolesFor('content.hide'))
  @SerializeOptions({ schema: EventActionEnvelope })
  async suspend(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ReasonedActionBody)) body: ReasonedActionBodyT,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminEventActionResultT }> {
    return { success: true, data: await this.actions.suspend(caller, id, body.reason, metaOf(req)) };
  }

  /** Publishes a suspended event again. */
  @Post(':id/restore')
  @HttpCode(200)
  @Roles(...allowedRolesFor('content.hide'))
  @SerializeOptions({ schema: EventActionEnvelope })
  async restore(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ReasonedActionBody)) body: ReasonedActionBodyT,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminEventActionResultT }> {
    return { success: true, data: await this.actions.restore(caller, id, body.reason, metaOf(req)) };
  }

  /** Takes an event down for good. Not reversible in v1. */
  @Post(':id/takedown')
  @HttpCode(200)
  @Roles(...allowedRolesFor('event.takedown'))
  @SerializeOptions({ schema: EventActionEnvelope })
  async takedown(
    @CurrentUser() caller: CurrentUserContext,
    @Param('id', { schema: UuidParam }) id: string,
    @Body(new AdminActionBodyPipe(ReasonedActionBody)) body: ReasonedActionBodyT,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AdminEventActionResultT }> {
    return { success: true, data: await this.actions.takedown(caller, id, body.reason, metaOf(req)) };
  }
}
