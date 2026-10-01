import { Module } from '@nestjs/common';
import { HealthModule } from '../health/index.js';
import { AuditModule } from '../audit/index.js';
import { MediaModule } from '../media/index.js';
import { ChatModule } from '../chat/index.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditRepository } from './admin-audit.repository.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminEventActionsController } from './admin-event-actions.controller.js';
import { AdminEventActionsRepository } from './admin-event-actions.repository.js';
import { AdminEventActionsService } from './admin-event-actions.service.js';
import { AdminEventsController } from './admin-events.controller.js';
import { AdminEventsRepository } from './admin-events.repository.js';
import { AdminEventsService } from './admin-events.service.js';
import { AdminUserActionsController } from './admin-user-actions.controller.js';
import { AdminUserActionsRepository } from './admin-user-actions.repository.js';
import { AdminUserActionsService } from './admin-user-actions.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersRepository } from './admin-users.repository.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [HealthModule, MediaModule, AuditModule, ChatModule],
  controllers: [AdminController, AdminUsersController, AdminEventsController, AdminAuditController, AdminUserActionsController, AdminEventActionsController],
  providers: [
    AdminService,
    AdminRepository,
    AdminUsersService,
    AdminUsersRepository,
    AdminEventsService,
    AdminEventsRepository,
    AdminAuditService,
    AdminAuditRepository,
    AdminUserActionsService,
    AdminUserActionsRepository,
    AdminEventActionsService,
    AdminEventActionsRepository,
  ],
})
export class AdminModule {}
