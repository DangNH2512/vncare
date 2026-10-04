import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Res,
  SerializeOptions,
} from '@nestjs/common';
import type { Response } from 'express';
import { allowedRolesFor } from '@dnc/domain';
import {
  envelope,
  ReportCreateRequest,
  ReportResponse,
  type ReportCreateRequestT,
} from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ReportService } from './report.service.js';

const ReportEnvelope = envelope(ReportResponse);

/**
 * Member reports. Any signed-in account may report, at every trust level: the
 * right to report is rate limited but never taken away (doc 05 §7.9).
 */
@Controller('api/v1/reports')
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /**
   * Files a report. The Idempotency-Key header is mandatory (BR-23): a double
   * tap or a retry after a dropped connection resolves to the report the first
   * attempt created.
   */
  @Post()
  @Roles(...allowedRolesFor('report.create'))
  @SerializeOptions({ schema: ReportEnvelope })
  async create(
    @Body({ schema: ReportCreateRequest }) body: ReportCreateRequestT,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        messageKey: 'errors.common.idempotencyKeyRequired',
      });
    }
    try {
      return { success: true, data: await this.reports.create(body, idempotencyKey, viewer) };
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        const details = (error.getResponse() as { details?: { retryAfterSeconds?: number } })
          .details;
        response.setHeader('Retry-After', String(details?.retryAfterSeconds ?? 1));
      }
      throw error;
    }
  }
}
