import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, SerializeOptions } from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminModerationCaseDetailResponse,
  AdminModerationQueueQuery,
  AdminModerationQueueResponse,
  AssignCaseBody,
  AssignCaseResult,
  ChangeCaseSeverityBody,
  ChangeCaseSeverityResult,
  DecideCaseBody,
  DecideCaseResult,
  envelope,
  ModerationCaseNumber,
  type AdminModerationCaseDetailResponseT,
  type AdminModerationQueueQueryT,
  type AdminModerationQueueResponseT,
  type AssignCaseBodyT,
  type AssignCaseResultT,
  type ChangeCaseSeverityBodyT,
  type ChangeCaseSeverityResultT,
  type DecideCaseResultT,
} from '@dnc/contracts';
import type { z } from 'zod';
import { CurrentUser, type CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminActionBodyPipe } from './admin-action-body.pipe.js';
import { AdminQueryPipe } from './admin-query.pipe.js';
import { AdminModerationQueueService } from './admin-moderation-queue.service.js';
import { AdminModerationService } from './admin-moderation.service.js';
import type { ActionRequestMeta } from './admin-user-actions.service.js';

const QueueEnvelope = envelope(AdminModerationQueueResponse);
const DetailEnvelope = envelope(AdminModerationCaseDetailResponse);
const AssignEnvelope = envelope(AssignCaseResult);
const SeverityEnvelope = envelope(ChangeCaseSeverityResult);
const DecideEnvelope = envelope(DecideCaseResult);

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

/**
 * Moderation queue and case decisions for the console (A4). Reading needs
 * `moderation.queue.view`, every write `moderation.decide`; the row rules
 * (conflict of interest, 30-day cap, takedown) are re-checked in the service.
 */
@Controller('api/v1/admin/moderation/cases')
export class AdminModerationController {
  constructor(
    private readonly moderation: AdminModerationService,
    private readonly queue: AdminModerationQueueService,
  ) {}

  /** Open and in-review cases by severity then deadline, without those the caller has a conflict with. */
  @Get()
  @Roles(...allowedRolesFor('moderation.queue.view'))
  @SerializeOptions({ schema: QueueEnvelope })
  async list(
    @Query(new AdminQueryPipe(AdminModerationQueueQuery)) query: AdminModerationQueueQueryT,
    @CurrentUser() caller: CurrentUserContext,
  ): Promise<{ success: true; data: AdminModerationQueueResponseT }> {
    return { success: true, data: await this.queue.listQueue(caller, query) };
  }

  /** One case: snapshot beside the current state, reporters (handle and trust), actions, strikes. */
  @Get(':caseNumber')
  @Roles(...allowedRolesFor('moderation.queue.view'))
  @SerializeOptions({ schema: DetailEnvelope })
  async detail(
    @Param('caseNumber', { schema: ModerationCaseNumber }) caseNumber: number,
    @CurrentUser() caller: CurrentUserContext,
  ): Promise<{ success: true; data: AdminModerationCaseDetailResponseT }> {
    return { success: true, data: await this.queue.getCase(caller, caseNumber) };
  }

  /** Takes the case for the caller, or (admin) assigns it to someone else. */
  @Post(':caseNumber/assign')
  @HttpCode(200)
  @Roles(...allowedRolesFor('moderation.decide'))
  @SerializeOptions({ schema: AssignEnvelope })
  async assign(
    @Param('caseNumber', { schema: ModerationCaseNumber }) caseNumber: number,
    @Body(new AdminActionBodyPipe(AssignCaseBody)) body: AssignCaseBodyT,
    @CurrentUser() caller: CurrentUserContext,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: AssignCaseResultT }> {
    return {
      success: true,
      data: await this.moderation.assign(caller, caseNumber, body, metaOf(req)),
    };
  }

  /** Changes the severity with a reason; the deadline keeps the earlier of the two. */
  @Post(':caseNumber/severity')
  @HttpCode(200)
  @Roles(...allowedRolesFor('moderation.decide'))
  @SerializeOptions({ schema: SeverityEnvelope })
  async severity(
    @Param('caseNumber', { schema: ModerationCaseNumber }) caseNumber: number,
    @Body(new AdminActionBodyPipe(ChangeCaseSeverityBody)) body: ChangeCaseSeverityBodyT,
    @CurrentUser() caller: CurrentUserContext,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: ChangeCaseSeverityResultT }> {
    return {
      success: true,
      data: await this.moderation.changeSeverity(caller, caseNumber, body, metaOf(req)),
    };
  }

  /** Applies a decision: dismiss, hide, remove, warn or suspend for a limited time. */
  @Post(':caseNumber/decisions')
  @HttpCode(200)
  @Roles(...allowedRolesFor('moderation.decide'))
  @SerializeOptions({ schema: DecideEnvelope })
  async decide(
    @Param('caseNumber', { schema: ModerationCaseNumber }) caseNumber: number,
    @Body(new AdminActionBodyPipe(DecideCaseBody)) body: z.output<typeof DecideCaseBody>,
    @CurrentUser() caller: CurrentUserContext,
    @Req() req: RequestLike,
  ): Promise<{ success: true; data: DecideCaseResultT }> {
    return {
      success: true,
      data: await this.moderation.decide(caller, caseNumber, body, metaOf(req)),
    };
  }
}
