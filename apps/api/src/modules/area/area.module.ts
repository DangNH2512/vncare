import { Module } from '@nestjs/common';
import { AreaController } from './area.controller.js';
import { AreaRepository } from './area.repository.js';
import { AreaService } from './area.service.js';

@Module({
  controllers: [AreaController],
  providers: [AreaService, AreaRepository],
  exports: [AreaRepository],
})
export class AreaModule {}
