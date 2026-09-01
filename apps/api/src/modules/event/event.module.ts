import { Module } from '@nestjs/common';
import { EventController } from './event.controller.js';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

@Module({
  controllers: [EventController],
  providers: [EventService, EventRepository],
  exports: [EventRepository],
})
export class EventModule {}
