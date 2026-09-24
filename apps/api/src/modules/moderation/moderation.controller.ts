import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';
import { allowedRolesFor } from '@dnc/domain';
import {
  envelope,
  ModerationActionRequest,
  ModerationActionResponse,
  ModerationQueueQuery,
  ModerationQueueResponse,
  ModerationTicketDetailResponse,
  TicketDismissRequest,
  TicketSeverityRequest,
  type ModerationActionRequestT,
  type ModerationQueueQueryT,
  type TicketDismissRequestT,
  type TicketSeverityRequestT,
} from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ModerationService } from './moderation.service.js';

const QueueEnvelope = envelope(ModerationQueueResponse);
const TicketEnvelope = envelope(ModerationTicketDetailResponse);
const ActionEnvelope = envelope(ModerationActionResponse);
const UuidParam = z.uuid();

/**
 * Staff report queue and moderation decisions. Every route is role-gated by
 * RolesGuard before any body is parsed, so a member or curator gets 403 no
 * matter what they send (AC-39). There is no route that edits or deletes a
 * report, ticket or action (AC-45).
 */
@Controller('api/v1/admin/moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  /** Tickets the caller has no conflict of interest in (INV-4), with the server clock for the SLA countdown. */
  @Get('queue')
  @Roles(...allowedRolesFor('moderation.queue.view'))
  @SerializeOptions({ schema: QueueEnvelope })
  async queue(
    @Query({ schema: ModerationQueueQuery }) query: ModerationQueueQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.moderation.queue(query, viewer) };
  }

  @Get('tickets/:ticketId')
  @Roles(...allowedRolesFor('moderation.queue.view'))
  @SerializeOptions({ schema: TicketEnvelope })
  async ticket(
    @Param('ticketId', { schema: UuidParam }) ticketId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.moderation.ticket(ticketId, viewer) };
  }

  /** One endpoint for every enforcement and reversal; the body is a union discriminated by `action`. */
  @Post('actions')
  @Roles(...allowedRolesFor('moderation.action.take'))
  @SerializeOptions({ schema: ActionEnvelope })
  async act(
    @Body({ schema: ModerationActionRequest }) body: ModerationActionRequestT,
    @Headers('x-request-id') requestId: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.moderation.act(body, viewer, requestId) };
  }

  @Post('tickets/:ticketId/dismiss')
  @Roles(...allowedRolesFor('moderation.action.take'))
  @SerializeOptions({ schema: ActionEnvelope })
  async dismiss(
    @Param('ticketId', { schema: UuidParam }) ticketId: string,
    @Body({ schema: TicketDismissRequest }) body: TicketDismissRequestT,
    @Headers('x-request-id') requestId: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return {
      success: true,
      data: await this.moderation.dismiss(ticketId, body, viewer, requestId),
    };
  }

  @Post('tickets/:ticketId/severity')
  @Roles(...allowedRolesFor('moderation.action.take'))
  @SerializeOptions({ schema: ActionEnvelope })
  async severity(
    @Param('ticketId', { schema: UuidParam }) ticketId: string,
    @Body({ schema: TicketSeverityRequest }) body: TicketSeverityRequestT,
    @Headers('x-request-id') requestId: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return {
      success: true,
      data: await this.moderation.changeSeverity(ticketId, body, viewer, requestId),
    };
  }
}
