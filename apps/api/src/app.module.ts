import { Module } from '@nestjs/common';
import { EventModule } from './modules/event/index.js';
import { HealthModule } from './modules/health/index.js';

@Module({
  imports: [HealthModule, EventModule],
})
export class AppModule {}
