import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ChatModule } from './modules/chat/index.js';
import { CommentModule } from './modules/comment/index.js';
import { EventModule } from './modules/event/index.js';
import { HealthModule } from './modules/health/index.js';
import { MediaModule } from './modules/media/index.js';
import { PostModule } from './modules/post/index.js';
import { ReactionModule } from './modules/reaction/index.js';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    HealthModule,
    MediaModule,
    EventModule,
    PostModule,
    CommentModule,
    ReactionModule,
    ChatModule,
  ],
})
export class AppModule {}
