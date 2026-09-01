import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  cursorPage,
  envelope,
  EventCreateRequest,
  EventResponse,
  EventStatusUpdateRequest,
  EventUpdateRequest,
  ListEventQuery,
  type EventCreateRequestT,
  type EventStatusUpdateRequestT,
  type EventUpdateRequestT,
  type ListEventQueryT,
} from '@dnc/contracts';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard.js';
import { TrustLevelGuard } from '../../common/guards/trust-level.guard.js';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { EventService } from './event.service.js';

const EventEnvelope = envelope(EventResponse);
const EventPageEnvelope = envelope(cursorPage(EventResponse));
const UuidParam = z.uuid();

@Controller('api/v1/events')
@UseGuards(AuthenticatedGuard, TrustLevelGuard)
export class EventController {
  constructor(private readonly events: EventService) {}

  /**
   * Creates a draft event. The body is validated by the global
   * StandardSchemaValidationPipe against EventCreateRequest; the response is
   * validated and stripped against envelope(EventResponse). Both schemas also
   * feed the generated OpenAPI document.
   */
  @Post()
  @MinTrustLevel(1)
  @SerializeOptions({ schema: EventEnvelope })
  async create(
    @Body({ schema: EventCreateRequest }) body: EventCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.events.create(body, viewer) };
  }

  /** Discovery. A radius search needs lat, lng and radiusMeters together. */
  @Get()
  @SerializeOptions({ schema: EventPageEnvelope })
  async list(
    @Query({ schema: ListEventQuery }) query: ListEventQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.events.list(query, viewer) };
  }

  @Get(':id')
  @SerializeOptions({ schema: EventEnvelope })
  async findOne(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.events.findOne(id, viewer) };
  }

  @Patch(':id')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: EventEnvelope })
  async update(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: EventUpdateRequest }) body: EventUpdateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.events.update(id, body, viewer) };
  }

  /** Publish, unpublish or cancel. Moderation states are not reachable here. */
  @Put(':id/status')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: EventEnvelope })
  async updateStatus(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: EventStatusUpdateRequest }) body: EventStatusUpdateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.events.updateStatus(id, body, viewer) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.events.remove(id, viewer);
  }
}
