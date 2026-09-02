import { Module } from '@nestjs/common';
import { MediaModule } from '../media/index.js';
import { RsvpController } from './rsvp.controller.js';
import { RsvpRepository } from './rsvp.repository.js';
import { RsvpService } from './rsvp.service.js';

@Module({
  imports: [MediaModule],
  controllers: [RsvpController],
  providers: [RsvpService, RsvpRepository],
  exports: [RsvpRepository],
})
export class RsvpModule {}
