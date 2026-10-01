import { Controller, Get, Param, Query, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import { allowedRolesFor } from '@dnc/domain';
import {
  AdminEventDetailResponse,
  AdminEventListQuery,
  AdminEventListResponse,
  envelope,
  type AdminEventDetailResponseT,
  type AdminEventListQueryT,
  type AdminEventListResponseT,
} from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminQueryPipe } from './admin-query.pipe.js';
import { AdminEventsService } from './admin-events.service.js';

const ListEnvelope = envelope(AdminEventListResponse);
const DetailEnvelope = envelope(AdminEventDetailResponse);
const UuidParam = z.uuid();

/** Event directory for the console. Roles come from the permission matrix. */
@Controller('api/v1/admin/events')
export class AdminEventsController {
  constructor(private readonly events: AdminEventsService) {}

  /** Filter, sort and keyset-paginate events with aggregate seat figures. */
  @Get()
  @Roles(...allowedRolesFor('event.directory.view'))
  @SerializeOptions({ schema: ListEnvelope })
  async list(
    @Query(new AdminQueryPipe(AdminEventListQuery)) query: AdminEventListQueryT,
  ): Promise<{ success: true; data: AdminEventListResponseT }> {
    return { success: true, data: await this.events.list(query) };
  }

  /** One event with every occurrence and aggregate seat figures. No attendee names. */
  @Get(':id')
  @Roles(...allowedRolesFor('event.directory.view'))
  @SerializeOptions({ schema: DetailEnvelope })
  async detail(
    @Param('id', { schema: UuidParam }) id: string,
  ): Promise<{ success: true; data: AdminEventDetailResponseT }> {
    return { success: true, data: await this.events.detail(id) };
  }
}
