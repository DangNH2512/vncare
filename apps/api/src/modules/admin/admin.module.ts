import { Module } from '@nestjs/common';
import { HealthModule } from '../health/index.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [HealthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
