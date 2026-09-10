import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ConversationCreateRequestT,
  ConversationRespondRequestT,
  ConversationResponseT,
  ListConversationQueryT,
  ListMessageQueryT,
  MarkReadRequestT,
  MessageCreateRequestT,
  MessageResponseT,
} from '@dnc/contracts';
import { toPage } from '../../common/pagination.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import {
  ChatRepository,
  conversationCursorOf,
  messageCursorOf,
} from './chat.repository.js';
import { ChatGateway } from './chat.gateway.js';
import { toConversationResponse, toMessageResponse } from './chat.mapper.js';

/** Opening a direct thread with a stranger requires T2 (see the trust ladder). */
const DIRECT_MESSAGE_MIN_TRUST = 2;

@Injectable()
export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly gateway: ChatGateway,
  ) {}

  async create(
    input: ConversationCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<ConversationResponseT> {
    const conversationId =
      input.type === 'direct'
        ? await this.openDirect(input.recipientUserId, viewer)
        : await this.chats.createEventGroup(
            input.eventId,
            input.occurrenceId ?? null,
            viewer.id,
            input.minTrustLevelToJoin,
          );

    return this.findOne(conversationId, viewer);
  }

  private async openDirect(
    recipientUserId: string,
    viewer: CurrentUserContext,
  ): Promise<string> {
    if (recipientUserId === viewer.id) {
      throw new ForbiddenException({
        code: 'CANNOT_MESSAGE_SELF',
        messageKey: 'errors.chat.cannotMessageSelf',
      });
    }
    if (viewer.trustLevel < DIRECT_MESSAGE_MIN_TRUST) {
      throw new ForbiddenException({
        code: 'TRUST_LEVEL_TOO_LOW',
        messageKey: 'errors.auth.trustLevelTooLow',
        details: { required: DIRECT_MESSAGE_MIN_TRUST },
      });
    }

    try {
      const { id } = await this.chats.findOrCreateDirect(viewer.id, recipientUserId);
      return id;
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async findOne(id: string, viewer: CurrentUserContext): Promise<ConversationResponseT> {
    return toConversationResponse(await this.loadOrThrow(id, viewer));
  }

  async list(
    query: ListConversationQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: ConversationResponseT[]; nextCursor: string | null }> {
    const { rows, limit } = await this.chats.listForUser(viewer.id, query);
    return toPage(rows, limit, toConversationResponse, conversationCursorOf);
  }

  /** Joining an event room is open to members; the host's trust floor still applies. */
  async join(id: string, viewer: CurrentUserContext): Promise<ConversationResponseT> {
    await this.chats.join(id, viewer.id);
    return this.findOne(id, viewer);
  }

  async respond(
    id: string,
    input: ConversationRespondRequestT,
    viewer: CurrentUserContext,
  ): Promise<ConversationResponseT> {
    await this.loadOrThrow(id, viewer);
    const updated = await this.chats.respondToRequest(id, viewer.id, input.decision);
    if (!updated) {
      // The caller is a participant but not the recipient of a pending request:
      // either they opened it themselves, or it has already been answered.
      throw new ForbiddenException({
        code: 'NOT_REQUEST_RECIPIENT',
        messageKey: 'errors.chat.notRequestRecipient',
      });
    }
    return this.findOne(id, viewer);
  }

  /**
   * Sends a message.
   *
   * Order matters: membership, then the conversation's own state, then the
   * request quota, and only then the write. Each check is cheap and each one
   * that passes narrows what the next one has to consider.
   */
  async sendMessage(
    conversationId: string,
    input: MessageCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<MessageResponseT> {
    const conversation = await this.loadOrThrow(conversationId, viewer);

    // Idempotency resolves before every send-side rule. A retry after a dropped
    // connection is the same request as the original: charging it against the
    // request quota a second time would reject a message the sender already
    // sent successfully.
    const replayed = await this.chats.findClientMessage(
      conversationId,
      viewer.id,
      input.clientMessageId,
    );
    if (replayed) return toMessageResponse(replayed);

    if (conversation.status !== 'active') {
      throw new ForbiddenException({
        code: 'CONVERSATION_CLOSED',
        messageKey: 'errors.chat.conversationClosed',
      });
    }
    await this.assertRequestQuota(conversation, viewer);

    let row;
    try {
      row = await this.chats.createMessage({
        conversationId,
        senderUserId: viewer.id,
        type: input.type,
        body: input.body ?? null,
        bodyLocale: input.bodyLocale ?? null,
        mediaId: input.mediaId ?? null,
        sharedEventId: input.sharedEventId ?? null,
        replyToMessageId: input.replyToMessageId ?? null,
        clientMessageId: input.clientMessageId,
      });
    } catch (error) {
      throw translatePostgresError(error);
    }

    const message = toMessageResponse(row);
    // Broadcast after the write commits. The socket is an accelerator: a failed
    // emit must never make a stored message look unsent.
    this.gateway.emitMessageCreated(
      message,
      await this.chats.activeParticipantIds(conversationId),
    );
    return message;
  }

  /**
   * Enforces the opening-message allowance.
   *
   * A stranger may send a bounded number of messages before the recipient has
   * agreed to talk. Without this, "request to message" is decoration and the
   * recipient still receives an unbounded stream from someone they never
   * accepted.
   */
  private async assertRequestQuota(
    conversation: { id: string; type: string; request_status: string; created_by_user_id: string },
    viewer: CurrentUserContext,
  ): Promise<void> {
    if (conversation.type !== 'direct') return;

    if (conversation.request_status === 'declined' || conversation.request_status === 'blocked') {
      throw new ForbiddenException({
        code: 'CONVERSATION_REQUEST_REFUSED',
        messageKey: 'errors.chat.requestRefused',
      });
    }
    if (conversation.request_status !== 'pending') return;
    if (conversation.created_by_user_id !== viewer.id) return;

    const [sent, quota] = await Promise.all([
      this.chats.countMessagesFrom(conversation.id, viewer.id),
      this.chats.requestMessageQuota(conversation.id),
    ]);
    if (sent >= quota) {
      throw new ForbiddenException({
        code: 'REQUEST_QUOTA_EXHAUSTED',
        messageKey: 'errors.chat.requestQuotaExhausted',
        details: { quota },
      });
    }
  }

  async listMessages(
    conversationId: string,
    query: ListMessageQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: MessageResponseT[]; nextCursor: string | null }> {
    await this.loadOrThrow(conversationId, viewer);
    const { rows, limit } = await this.chats.listMessages(conversationId, query);
    return toPage(rows, limit, toMessageResponse, messageCursorOf);
  }

  /** Deleting a message is the sender's own action; it never removes it for others' history. */
  async removeMessage(
    conversationId: string,
    messageId: string,
    viewer: CurrentUserContext,
  ): Promise<void> {
    await this.loadOrThrow(conversationId, viewer);
    const deleted = await this.chats.softDeleteMessage(messageId, viewer.id);
    if (!deleted) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        messageKey: 'errors.chat.messageNotFound',
      });
    }
  }

  async markRead(
    conversationId: string,
    input: MarkReadRequestT,
    viewer: CurrentUserContext,
  ): Promise<ConversationResponseT> {
    await this.loadOrThrow(conversationId, viewer);
    await this.chats.markRead(conversationId, viewer.id, input.lastReadMessageId);
    return this.findOne(conversationId, viewer);
  }

  /**
   * A non-member and a non-existent conversation both answer 404. Telling the
   * caller a thread exists but is not theirs is enough to confirm that two
   * specific people are talking.
   */
  private async loadOrThrow(id: string, viewer: CurrentUserContext) {
    const conversation = await this.chats.findForParticipant(id, viewer.id);
    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        messageKey: 'errors.chat.conversationNotFound',
      });
    }
    return conversation;
  }
}
