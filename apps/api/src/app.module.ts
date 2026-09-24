import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MailModule } from './mail/mail.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TrustLevelGuard } from './common/guards/trust-level.guard.js';
import { AdminModule } from './modules/admin/index.js';
import { AreaModule } from './modules/area/index.js';
import { AuditModule } from './modules/audit/index.js';
import { AuthModule } from './modules/auth/index.js';
import { ChatModule } from './modules/chat/index.js';
import { CommentModule } from './modules/comment/index.js';
import { EventModule } from './modules/event/index.js';
import { HealthModule } from './modules/health/index.js';
import { MediaModule } from './modules/media/index.js';
import { ModerationModule } from './modules/moderation/index.js';
import { PostModule } from './modules/post/index.js';
import { ProfileModule } from './modules/profile/index.js';
import { ReactionModule } from './modules/reaction/index.js';
import { ReportModule } from './modules/report/index.js';
import { RsvpModule } from './modules/rsvp/index.js';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    RedisModule,
    MailModule,
    AuthModule,
    HealthModule,
    AdminModule,
    AreaModule,
    MediaModule,
    ProfileModule,
    EventModule,
    RsvpModule,
    PostModule,
    CommentModule,
    ReactionModule,
    ChatModule,
    ReportModule,
    AuditModule,
    ModerationModule,
  ],
  providers: [
    // Applied to every route, in this order. Authentication denies by default —
    // a new endpoint is unreachable until someone marks it @Public, which is
    // the safe direction to fail. The role gate runs next, on the identity the
    // first guard resolved, and the trust gate runs last: D-07 orders access
    // checks state -> role -> relationship -> trust, so a role mismatch is
    // rejected before a trust floor is even read.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TrustLevelGuard },
  ],
})
export class AppModule {}
