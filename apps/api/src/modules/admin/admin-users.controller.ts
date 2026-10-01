import { Controller, Get, Param, Query, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminUserDetailResponse,
  AdminUserListQuery,
  AdminUserListResponse,
  envelope,
  type AdminUserDetailResponseT,
  type AdminUserListQueryT,
  type AdminUserListResponseT,
} from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminQueryPipe } from './admin-query.pipe.js';
import { AdminUsersService } from './admin-users.service.js';

const ListEnvelope = envelope(AdminUserListResponse);
const DetailEnvelope = envelope(AdminUserDetailResponse);
const UuidParam = z.uuid();

/** User directory for the console. Staff roles come from the permission matrix, never spelled out here. */
@Controller('api/v1/admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  /** Search, filter, sort and keyset-paginate accounts. Contact data is masked. */
  @Get()
  @Roles(...allowedRolesFor('user.directory.view'))
  @SerializeOptions({ schema: ListEnvelope })
  async list(
    @Query(new AdminQueryPipe(AdminUserListQuery)) query: AdminUserListQueryT,
  ): Promise<{ success: true; data: AdminUserListResponseT }> {
    return { success: true, data: await this.users.list(query) };
  }

  /** One account with profile, account, trust, activity and session blocks. */
  @Get(':id')
  @Roles(...allowedRolesFor('user.directory.view'))
  @SerializeOptions({ schema: DetailEnvelope })
  async detail(
    @Param('id', { schema: UuidParam }) id: string,
  ): Promise<{ success: true; data: AdminUserDetailResponseT }> {
    return { success: true, data: await this.users.detail(id) };
  }
}
