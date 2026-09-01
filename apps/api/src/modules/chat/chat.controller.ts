import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ConversationCreateRequest,
  ConversationRespondRequest,
  ConversationResponse,
  cursorPage,
  envelope,
  ListConversationQuery,
  ListMessageQuery,
  MarkReadRequest,
  MessageCreateRequest,
  MessageResponse,
  type ConversationCreateRequestT,
  type ConversationRespondRequestT,
  type ListConversationQueryT,
  type ListMessageQueryT,
  type MarkReadRequestT,
  type MessageCreateRequestT,
} from '@dnc/contracts';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';

const ConversationEnvelope = envelope(ConversationResponse);
const ConversationPageEnvelope = envelope(cursorPage(ConversationResponse));
const MessageEnvelope = envelope(MessageResponse);
const MessagePageEnvelope = envelope(cursorPage(MessageResponse));
const UuidParam = z.uuid();

/**
 * Chat over REST.
 *
 * REST is the durable path: a message is stored here and only then broadcast on
 * the `/chat` socket namespace. A client with no socket connection loses no
 * message, it just learns about it later.
 */
@Controller('api/v1/conversations')
export class ChatController {
  constructor(private readonly chats: ChatService) {}

  /** T1 to open an event room; opening a direct thread additionally needs T2, checked in the service. */
  @Post()
  @MinTrustLevel(1)
  @SerializeOptions({ schema: ConversationEnvelope })
  async create(
    @Body({ schema: ConversationCreateRequest }) body: ConversationCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.create(body, viewer) };
  }

  @Get()
  @SerializeOptions({ schema: ConversationPageEnvelope })
  async list(
    @Query({ schema: ListConversationQuery }) query: ListConversationQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.list(query, viewer) };
  }

  @Get(':id')
  @SerializeOptions({ schema: ConversationEnvelope })
  async findOne(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.findOne(id, viewer) };
  }

  @Post(':id/participants')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: ConversationEnvelope })
  async join(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.join(id, viewer) };
  }

  /** Accept, decline or block a pending request. Only the recipient may call it. */
  @Put(':id/request')
  @SerializeOptions({ schema: ConversationEnvelope })
  async respond(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: ConversationRespondRequest }) body: ConversationRespondRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.respond(id, body, viewer) };
  }

  @Post(':id/messages')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: MessageEnvelope })
  async sendMessage(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: MessageCreateRequest }) body: MessageCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.sendMessage(id, body, viewer) };
  }

  @Get(':id/messages')
  @SerializeOptions({ schema: MessagePageEnvelope })
  async listMessages(
    @Param('id', { schema: UuidParam }) id: string,
    @Query({ schema: ListMessageQuery }) query: ListMessageQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.listMessages(id, query, viewer) };
  }

  @Delete(':id/messages/:messageId')
  @HttpCode(204)
  async removeMessage(
    @Param('id', { schema: UuidParam }) id: string,
    @Param('messageId', { schema: UuidParam }) messageId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.chats.removeMessage(id, messageId, viewer);
  }

  @Put(':id/read')
  @SerializeOptions({ schema: ConversationEnvelope })
  async markRead(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: MarkReadRequest }) body: MarkReadRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.chats.markRead(id, body, viewer) };
  }
}
