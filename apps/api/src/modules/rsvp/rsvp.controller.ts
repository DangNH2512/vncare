import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';
import {
  AttendeeResponse,
  envelope,
  RsvpResponse,
} from '@dnc/contracts';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { RsvpService } from './rsvp.service.js';

const RsvpEnvelope = envelope(RsvpResponse);
const AttendeesEnvelope = envelope(z.array(AttendeeResponse));
const UuidParam = z.uuid();

/**
 * RSVP endpoints, addressed by occurrence: a weekly class is one event with
 * many occurrences, and a seat belongs to one of them.
 *
 * Nothing here is @Public — even reading the attendee list requires an
 * account, because it is meet-in-person safety data.
 */
@Controller('api/v1/occurrences/:occurrenceId')
export class RsvpController {
  constructor(private readonly rsvps: RsvpService) {}

  /**
   * Joins, or queues when full.
   *
   * The Idempotency-Key header is mandatory: a mobile retry after a dropped
   * connection must resolve to the RSVP the first attempt created, not to a
   * duplicate-registration error the user cannot understand.
   */
  @Post('rsvps')
  @SerializeOptions({ schema: RsvpEnvelope })
  async join(
    @Param('occurrenceId', { schema: UuidParam }) occurrenceId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        messageKey: 'rsvp.error.idempotencyKeyRequired',
      });
    }
    const { rsvp } = await this.rsvps.join(occurrenceId, idempotencyKey, viewer);
    return { success: true, data: rsvp };
  }

  /** Cancels the caller's own registration; the freed seat promotes the queue head. */
  @Delete('rsvps')
  @HttpCode(204)
  async cancel(
    @Param('occurrenceId', { schema: UuidParam }) occurrenceId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.rsvps.cancel(occurrenceId, viewer);
  }

  @Get('rsvps/me')
  @SerializeOptions({ schema: RsvpEnvelope })
  async mine(
    @Param('occurrenceId', { schema: UuidParam }) occurrenceId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.rsvps.myRsvp(occurrenceId, viewer) };
  }

  @Get('rsvps')
  @SerializeOptions({ schema: AttendeesEnvelope })
  async attendees(
    @Param('occurrenceId', { schema: UuidParam }) occurrenceId: string,
    @CurrentUser() _viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.rsvps.attendees(occurrenceId) };
  }
}
