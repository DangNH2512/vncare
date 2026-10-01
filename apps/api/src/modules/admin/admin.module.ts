import { Module } from '@nestjs/common';
import { HealthModule } from '../health/index.js';
import { MediaModule } from '../media/index.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { AdminEventsController } from './admin-events.controller.js';
import { AdminEventsRepository } from './admin-events.repository.js';
import { AdminEventsService } from './admin-events.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersRepository } from './admin-users.repository.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [HealthModule, MediaModule],
  controllers: [AdminController, AdminUsersController, AdminEventsController],
  providers: [
    AdminService,
    AdminRepository,
    AdminUsersService,
    AdminUsersRepository,
    AdminEventsService,
    AdminEventsRepository,
  ],
})
export class AdminModule {}
