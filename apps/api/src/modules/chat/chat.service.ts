import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { chatStateAt, chatWindowOf } from '@dnc/domain';
import { toPage } from '../../common/pagination.js';
import {
  CHAT_HOURLY_MAX_BY_TRUST,
  CHAT_HOURLY_MAX_DEFAULT,
  CHAT_MINUTE_MAX,
  HOUR_WINDOW_SECONDS,
  MINUTE_WINDOW_SECONDS,
} from '../../common/rate-limit/rate-limit.config.js';
import {
  RateLimitedException,
  RateLimitService,
  type RateLimitRule,
  type Reservation,
} from '../../common/rate-limit/index.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import {
  ChatRepository,
  ConversationGoneError,
  conversationCursorOf,
  messageCursorOf,
  type OccurrenceTimes,
} from './chat.repository.js';
import { ChatGateway } from './chat.gateway.js';
import { toConversationResponse, toMessageResponse } from './chat.mapper.js';

/** Opening a direct thread with a stranger requires T2 (see the trust ladder). */
const DIRECT_MESSAGE_MIN_TRUST = 2;

/** Refuses opening or joining a room before its window starts; the caller is already known to be eligible. */
function assertChatOpenable(times: OccurrenceTimes): void {
  const window = chatWindowOf(times);
  if (chatStateAt(window, new Date()) === 'not_open') {
    throw new ForbiddenException({
      code: 'CHAT_NOT_OPEN',
      messageKey: 'errors.chat.notOpen',
      details: { opensAt: window.opensAt.toISOString() },
    });
  }
}

function conversationClosed(): ForbiddenException {
  return new ForbiddenException({
    code: 'CONVERSATION_CLOSED',
    messageKey: 'errors.chat.conversationClosed',
  });
}

@Injectable()
export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly gateway: ChatGateway,
    private readonly rateLimit: RateLimitService,
  ) {}

  async create(
    input: ConversationCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<ConversationResponseT> {
    const conversationId =
      input.type === 'direct'
        ? await this.openDirect(input.recipientUserId, viewer)
        : await this.openEventGroup(input, viewer);

    return this.findOne(conversationId, viewer);
  }

  private async openEventGroup(
    input: Extract<ConversationCreateRequestT, { type: 'event_group' }>,
    viewer: CurrentUserContext,
  ): Promise<string> {
    let result;
    try {
      result = await this.chats.openEventGroup({
        eventId: input.eventId,
        occurrenceId: input.occurrenceId ?? null,
        viewerId: viewer.id,
        viewerTrustLevel: viewer.trustLevel,
        minTrustLevelToJoin: input.minTrustLevelToJoin,
        assertWindow: assertChatOpenable,
      });
    } catch (error) {
      throw translatePostgresError(error);
    }

    switch (result.outcome) {
      case 'ok':
        return result.conversationId;
      case 'occurrence_mismatch':
        throw new BadRequestException({
          code: 'OCCURRENCE_NOT_IN_EVENT',
          messageKey: 'errors.common.referenceNotFound',
        });
      default:
        // Unknown, unpublished and not-yours are one answer: a waitlisted or
        // uninvited caller must not learn that a room exists.
        throw new NotFoundException({
          code: 'EVENT_NOT_FOUND',
          messageKey: 'errors.event.notFound',
        });
    }
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

  /**
   * Joins an event room. Only an organizer or a confirmed attendee who meets the
   * room's trust floor gets in; every other case, including a direct thread and
   * an unknown id, answers the same 404 so existence is not disclosed.
   */
  async join(id: string, viewer: CurrentUserContext): Promise<ConversationResponseT> {
    let admitted: boolean;
    try {
      admitted = await this.chats.joinEventGroup(
        id,
        viewer.id,
        viewer.trustLevel,
        assertChatOpenable,
      );
    } catch (error) {
      throw translatePostgresError(error);
    }
    if (!admitted) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        messageKey: 'errors.chat.conversationNotFound',
      });
    }
    return this.findOne(id, viewer);
  }

  /**
   * Leaves an event room. Repeating it is a success; only someone who never had a
   * seat (or a direct thread) gets the indistinguishable 404.
   */
  async leave(id: string, viewer: CurrentUserContext): Promise<void> {
    const seated = await this.chats.leave(id, viewer.id);
    if (!seated) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        messageKey: 'errors.chat.conversationNotFound',
      });
    }
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
   * Order matters: membership, then a cheap replay lookup, then the
   * conversation's own state, then the rate limit, and only then one
   * transaction that re-decides idempotency, quota and the write under the
   * conversation row lock. The rate limit is reserved before that transaction
   * so no DB lock is held across a Redis round trip; every path that does not
   * store a new message gives the slots back exactly once.
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
    // sent successfully. This unlocked read is only a fast path; the
    // authoritative check repeats under the lock.
    const replayed = await this.chats.findClientMessage(
      conversationId,
      viewer.id,
      input.clientMessageId,
    );
    if (replayed) return toMessageResponse(replayed);

    // Unlocked pre-check so a refusal never spends a slot. The quota is only
    // decidable under the lock, so it is not counted here.
    this.assertSendable({ ...conversation, request_message_quota: 0 }, viewer, null);

    const slots = await this.reserveSendSlots(viewer);

    let stored;
    try {
      stored = await this.chats.appendMessage(
        {
          conversationId,
          senderUserId: viewer.id,
          type: input.type,
          body: input.body ?? null,
          bodyLocale: input.bodyLocale ?? null,
          mediaId: input.mediaId ?? null,
          sharedEventId: input.sharedEventId ?? null,
          replyToMessageId: input.replyToMessageId ?? null,
          clientMessageId: input.clientMessageId,
        },
        // Re-decide on the state read under FOR UPDATE: status and request
        // status may have changed since the unlocked read above.
        (locked) =>
          this.assertSendable({ ...conversation, ...locked }, viewer, locked.sentBySender),
      );
    } catch (error) {
      await this.rateLimit.release(slots);
      if (error instanceof ConversationGoneError) {
        throw new NotFoundException({
          code: 'CONVERSATION_NOT_FOUND',
          messageKey: 'errors.chat.conversationNotFound',
        });
      }
      throw translatePostgresError(error);
    }

    const message = toMessageResponse(stored.row);
    if (!stored.inserted) {
      // A concurrent replay of the same clientMessageId: the original is already
      // stored and announced, so give back the slots and stay silent.
      await this.rateLimit.release(slots);
      return message;
    }
    // Broadcast after the transaction commits, only for a new row. The socket
    // is an accelerator: a failed emit must never make a stored message look unsent.
    this.gateway.emitMessageCreated(
      message,
      await this.chats.activeParticipantIds(conversationId),
    );
    return message;
  }

  /** Conversation state, event window and (when `sent` is known) the opening quota. */
  private assertSendable(
    conversation: {
      type: string;
      status: string;
      request_status: string;
      request_message_quota: number;
      created_by_user_id: string;
      event_starts_at: Date | null;
      event_ends_at: Date | null;
    },
    viewer: CurrentUserContext,
    sent: number | null,
  ): void {
    if (conversation.status !== 'active') throw conversationClosed();
    this.assertWindowAllowsSending(conversation);
    this.assertRequestQuota(conversation, viewer, sent);
  }

  /** Event rooms accept messages only inside their window; reading stays open afterwards. */
  private assertWindowAllowsSending(conversation: {
    type: string;
    event_starts_at: Date | null;
    event_ends_at: Date | null;
  }): void {
    if (conversation.type !== 'event_group' || !conversation.event_starts_at) return;
    const window = chatWindowOf({
      startsAt: conversation.event_starts_at,
      endsAt: conversation.event_ends_at,
    });
    const state = chatStateAt(window, new Date());
    if (state === 'closed') throw conversationClosed();
    if (state === 'not_open') {
      throw new ForbiddenException({
        code: 'CHAT_NOT_OPEN',
        messageKey: 'errors.chat.notOpen',
        details: { opensAt: window.opensAt.toISOString() },
      });
    }
  }

  /** Hourly allowance by trust level plus a per-minute burst ceiling. */
  private async reserveSendSlots(viewer: CurrentUserContext): Promise<Reservation[]> {
    const rules: RateLimitRule[] = [
      {
        key: this.rateLimit.keyFor('chat_message', 'user', viewer.id, 'minute'),
        max: CHAT_MINUTE_MAX,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        bucket: 'user_minute',
        action: 'chat_message',
      },
      {
        key: this.rateLimit.keyFor('chat_message', 'user', viewer.id, 'hour'),
        max: CHAT_HOURLY_MAX_BY_TRUST[viewer.trustLevel] ?? CHAT_HOURLY_MAX_DEFAULT,
        windowSeconds: HOUR_WINDOW_SECONDS,
        bucket: 'user_hour',
        action: 'chat_message',
      },
    ];
    const decision = await this.rateLimit.reserve(rules);
    if (decision.blocked) {
      throw new RateLimitedException(decision.retryAfterSeconds, 'errors.rateLimit.exceeded');
    }
    return decision.reservations;
  }

  /**
   * Enforces the opening-message allowance.
   *
   * A stranger may send a bounded number of messages before the recipient has
   * agreed to talk. Without this, "request to message" is decoration and the
   * recipient still receives an unbounded stream from someone they never
   * accepted.
   */
  private assertRequestQuota(
    conversation: {
      type: string;
      request_status: string;
      request_message_quota: number;
      created_by_user_id: string;
    },
    viewer: CurrentUserContext,
    sent: number | null,
  ): void {
    if (conversation.type !== 'direct') return;

    if (conversation.request_status === 'declined' || conversation.request_status === 'blocked') {
      throw new ForbiddenException({
        code: 'CONVERSATION_REQUEST_REFUSED',
        messageKey: 'errors.chat.requestRefused',
      });
    }
    if (conversation.request_status !== 'pending') return;
    if (conversation.created_by_user_id !== viewer.id) return;
    if (sent === null) return;

    if (sent >= conversation.request_message_quota) {
      throw new ForbiddenException({
        code: 'REQUEST_QUOTA_EXHAUSTED',
        messageKey: 'errors.chat.requestQuotaExhausted',
        details: { quota: conversation.request_message_quota },
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
    const deleted = await this.chats.softDeleteMessage(conversationId, messageId, viewer.id);
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
    // A marker pointing outside this room would let a caller probe other rooms'
    // message ids and skew the unread count against the wrong thread.
    if (!(await this.chats.messageInConversation(conversationId, input.lastReadMessageId))) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        messageKey: 'errors.chat.messageNotFound',
      });
    }
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
