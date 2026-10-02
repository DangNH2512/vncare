import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  SerializeOptions,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import {
  CreateReportBody,
  CreateReportResponse,
  cursorPage,
  envelope,
  MyReportItem,
  ReportIdempotencyKey,
  type CreateReportBodyT,
} from '@dnc/contracts';
import { CurrentUser, type CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import { RateLimitedExceptionFilter } from '../../common/rate-limit/index.js';
import { ReportService } from './report.service.js';

const CreateEnvelope = envelope(CreateReportResponse);
const MineEnvelope = envelope(cursorPage(MyReportItem));

const MINE_DEFAULT_LIMIT = 20;
const MINE_MAX_LIMIT = 50;

/** Query of `GET /reports/mine`; a stale cursor yields the first page, as elsewhere. */
const MyReportsQuery = z.strictObject({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MINE_MAX_LIMIT).default(MINE_DEFAULT_LIMIT),
});
type MyReportsQueryT = z.infer<typeof MyReportsQuery>;

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

const requestIdOf = (req: RequestLike): string | null => {
  const value = req.headers['x-request-id'];
  return (Array.isArray(value) ? value[0] : value) ?? null;
};

/** Member reports (A4). The console side lives in the admin module. */
@Controller('api/v1/reports')
@UseFilters(RateLimitedExceptionFilter)
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /**
   * Reports content or a profile. Needs a verified account (T1+). The
   * `Idempotency-Key` header (uuid) is mandatory: a retry returns the first
   * result and never a second row.
   */
  @Post()
  @MinTrustLevel(1)
  @SerializeOptions({ schema: CreateEnvelope })
  async create(
    @Body({ schema: CreateReportBody }) body: CreateReportBodyT,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
    @Req() req: RequestLike,
  ) {
    const key = ReportIdempotencyKey.safeParse(idempotencyKey);
    if (!key.success) {
      throw new BadRequestException({
        code: 'REPORT_IDEMPOTENCY_REQUIRED',
        messageKey: 'errors.report.idempotencyRequired',
      });
    }
    const data = await this.reports.create(viewer, key.data, body, { requestId: requestIdOf(req) });
    return { success: true, data };
  }

  /** The caller's own reports with a coarse status; never a case, a moderator or the reported person. */
  @Get('mine')
  @SerializeOptions({ schema: MineEnvelope })
  async mine(
    @Query({ schema: MyReportsQuery }) query: MyReportsQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.reports.listMine(viewer, query) };
  }
}
