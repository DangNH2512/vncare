import { Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { ChatController } from './chat.controller.js';
import { ChatSocketControl } from './chat-socket-control.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatRepository } from './chat.repository.js';
import { ChatService } from './chat.service.js';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRepository,
    ChatGateway,
    ChatSocketControl,
    RateLimitService,
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
  exports: [ChatRepository, ChatSocketControl],
})
export class ChatModule {}
