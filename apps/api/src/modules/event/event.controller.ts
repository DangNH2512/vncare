import { Body, Controller, Post, SerializeOptions } from '@nestjs/common';
import {
  envelope,
  EventCreateRequest,
  EventResponse,
  type EventCreateRequestT,
} from '@dnc/contracts';
import { EventService } from './event.service.js';

const EventEnvelope = envelope(EventResponse);

@Controller('api/v1/events')
export class EventController {
  constructor(private readonly events: EventService) {}

  /**
   * Creates a draft event. The request body is validated by the global
   * StandardSchemaValidationPipe against EventCreateRequest; the response is
   * validated and stripped against envelope(EventResponse). Both schemas also
   * feed the generated OpenAPI document.
   */
  @Post()
  @SerializeOptions({ schema: EventEnvelope })
  create(@Body({ schema: EventCreateRequest }) body: EventCreateRequestT) {
    return { success: true, data: this.events.createDraft(body) };
  }
}
