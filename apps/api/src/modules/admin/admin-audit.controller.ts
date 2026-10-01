import { Controller, Get, Query, SerializeOptions } from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminAuditListQuery,
  AdminAuditListResponse,
  envelope,
  type AdminAuditListQueryT,
  type AdminAuditListResponseT,
} from '@dnc/contracts';
import { CurrentUser, type CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminQueryPipe } from './admin-query.pipe.js';
import { AdminAuditService } from './admin-audit.service.js';

const ListEnvelope = envelope(AdminAuditListResponse);

/** Audit trail for the console. Which rows a role sees is decided in the service (D-R12). */
@Controller('api/v1/admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  /** Filter and keyset-paginate audit lines, newest first. No ip or user agent. */
  @Get()
  @Roles(...allowedRolesFor('audit_log.view'))
  @SerializeOptions({ schema: ListEnvelope })
  async list(
    @Query(new AdminQueryPipe(AdminAuditListQuery)) query: AdminAuditListQueryT,
    @CurrentUser() caller: CurrentUserContext,
  ): Promise<{ success: true; data: AdminAuditListResponseT }> {
    return { success: true, data: await this.audit.list(query, caller) };
  }
}
