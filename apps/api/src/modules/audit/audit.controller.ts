import { Controller, Get, Query, SerializeOptions } from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import {
  AuditLogQuery,
  AuditLogResponse,
  cursorPage,
  envelope,
  type AuditLogQueryT,
} from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { AuditService } from './audit.service.js';

const AuditPageEnvelope = envelope(cursorPage(AuditLogResponse));

/**
 * Read-only view of the staff audit log. There is no PATCH, PUT or DELETE
 * route here and there never will be (AC-45): the table itself refuses them.
 */
@Controller('api/v1/admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(...allowedRolesFor('audit_log.view'))
  @SerializeOptions({ schema: AuditPageEnvelope })
  async list(
    @Query({ schema: AuditLogQuery }) query: AuditLogQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.audit.list(query, viewer) };
  }
}
