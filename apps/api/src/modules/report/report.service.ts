import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  REPORT_RATE_WINDOW_HOURS,
  REPORT_REASON_SEVERITY,
  reportDailyLimit,
  SEVERITY_RANK,
  SLA_HOURS,
} from '@dnc/domain';
import type { ReportCreateRequestT, ReportResponseT } from '@dnc/contracts';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { ReportRepository } from './report.repository.js';
import { toReportResponse } from './report.mapper.js';

/**
 * Files member reports (task board D8, D9).
 *
 * Deliberately not audited: a report is a member's private act, not a staff
 * action on someone else's data (brief §10, AC-46).
 */
@Injectable()
export class ReportService {
  constructor(private readonly reports: ReportRepository) {}

  /**
   * Creates a report, or returns the one this request already created.
   *
   * Order matters and is fixed by D9: the replay and duplicate checks run
   * before the rate limit, so retrying a submit or reporting the same thing
   * twice never costs the reporter an allowance slot; the target is resolved
   * before the limit too, so a typo'd id answers 404 rather than 429.
   * Always 201 — the reporter cannot tell a fresh report from a returned one.
   */
  async create(
    input: ReportCreateRequestT,
    idempotencyKey: string,
    viewer: CurrentUserContext,
  ): Promise<ReportResponseT> {
    return this.reports.transaction(async (tx) => {
      await this.reports.lockReporter(tx, viewer.id);

      const replay = await this.reports.findByIdempotencyKey(tx, viewer.id, idempotencyKey);
      if (replay) return toReportResponse(replay);

      const open = await this.reports.findOpenForTarget(
        tx,
        viewer.id,
        input.targetType,
        input.targetId,
      );
      const severity = REPORT_REASON_SEVERITY[input.reason];
      // Same or milder reason than the reporter's gravest open report: a
      // duplicate, answered with that report (AC-5). A strictly graver one is
      // new information and gets a report of its own in the same ticket
      // (acceptance FU-4), filed through the normal checks below.
      if (open && SEVERITY_RANK[severity] <= SEVERITY_RANK[open.severity]) {
        return toReportResponse(open);
      }

      const target = await this.reports.resolveTarget(
        tx,
        viewer.id,
        input.targetType,
        input.targetId,
      );
      if (!target) {
        throw new NotFoundException({
          code: 'REPORT_TARGET_NOT_FOUND',
          messageKey: 'errors.report.targetNotFound',
        });
      }
      if (target.ownerUserId === viewer.id) {
        throw new UnprocessableEntityException({
          code: 'REPORT_SELF_NOT_ALLOWED',
          messageKey: 'errors.report.selfNotAllowed',
        });
      }

      const limit = reportDailyLimit(viewer.trustLevel);
      const window = await this.reports.recentWindow(
        tx,
        viewer.id,
        limit,
        REPORT_RATE_WINDOW_HOURS,
      );
      if (window.count >= limit) {
        // The controller copies retryAfterSeconds into the Retry-After header;
        // it stays in details too, because a cross-origin page cannot read a
        // header the API does not expose.
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            messageKey: 'errors.report.rateLimited',
            details: { retryAfterSeconds: window.retryAfterSeconds },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      let ticketId: string;
      if (open) {
        // Escalation: the same person, so the ticket's report_count (people)
        // stays; only severity rises and the deadline comes in (§7).
        ticketId = open.ticket_id;
        await this.reports.raiseTicket(tx, ticketId, severity, SLA_HOURS[severity]);
      } else {
        ticketId = await this.reports.upsertTicket(tx, {
          targetType: input.targetType,
          targetId: input.targetId,
          ownerUserId: target.ownerUserId,
          relatedEventOrganizerId: target.relatedEventOrganizerId,
          severity,
          slaHours: SLA_HOURS[severity],
        });
      }

      // Empty after trimming is "no description": the column's CHECK wants 1–2000.
      const description = input.description ? input.description : null;
      const row = await this.reports.insertReport(tx, {
        ticketId,
        reporterUserId: viewer.id,
        targetType: input.targetType,
        targetId: input.targetId,
        ownerUserId: target.ownerUserId,
        reason: input.reason,
        severity,
        description,
        alsoBlocked: input.alsoBlock,
        snapshot: target.snapshot,
        idempotencyKey,
      });

      if (input.alsoBlock) {
        await this.reports.blockOwner(tx, viewer.id, target.ownerUserId);
      }
      return toReportResponse(row);
    });
  }
}
