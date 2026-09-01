import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { TrustLevelGuard } from './common/guards/trust-level.guard.js';
import { AuthModule } from './modules/auth/index.js';
import { ChatModule } from './modules/chat/index.js';
import { CommentModule } from './modules/comment/index.js';
import { EventModule } from './modules/event/index.js';
import { HealthModule } from './modules/health/index.js';
import { MediaModule } from './modules/media/index.js';
import { PostModule } from './modules/post/index.js';
import { ProfileModule } from './modules/profile/index.js';
import { ReactionModule } from './modules/reaction/index.js';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    AuthModule,
    HealthModule,
    MediaModule,
    ProfileModule,
    EventModule,
    PostModule,
    CommentModule,
    ReactionModule,
    ChatModule,
  ],
  providers: [
    // Applied to every route, in this order. Authentication denies by default —
    // a new endpoint is unreachable until someone marks it @Public, which is
    // the safe direction to fail. The trust gate runs after, on the identity
    // the first guard resolved.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TrustLevelGuard },
  ],
})
export class AppModule {}
