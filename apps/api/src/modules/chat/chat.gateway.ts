import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { CHAT_SOCKET_EVENTS, type MessageResponseT } from '@dnc/contracts';
import { AuthService } from '../auth/index.js';
import { ChatRepository } from './chat.repository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Room naming. A socket only ever joins rooms it has been authorized into. */
const room = {
  conversation: (id: string) => `conversation:${id}`,
  user: (id: string) => `user:${id}`,
};

/**
 * Realtime delivery for chat.
 *
 * This is an acceleration layer, never a source of truth: every message is
 * already durable in `messages` before it is broadcast, so a client that misses
 * an event loses nothing it cannot fetch over REST. Reconnecting clients
 * re-read the thread rather than replaying socket traffic.
 *
 * Identity comes from the socket handshake with the same development stub the
 * HTTP guard uses; a JWT replaces it in `authenticate` without touching
 * anything else here.
 */
@Injectable()
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly chats: ChatRepository,
    private readonly auth: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = await this.authenticate(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    // The per-user room lets the server reach someone across every device they
    // have open, without knowing which conversations they are watching.
    void client.join(room.user(userId));
  }

  /**
   * Subscribes a socket to one thread after checking membership against the
   * database. Trusting a client-supplied conversation id without this check
   * would turn every private thread into a public feed.
   */
  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<{ joined: boolean }> {
    const userId = await this.authenticate(client);
    const conversationId = this.readConversationId(payload);
    if (!userId || !conversationId) return { joined: false };

    const conversation = await this.chats.findForParticipant(conversationId, userId);
    if (!conversation) {
      this.logger.warn(`socket ${client.id} denied join on ${conversationId}`);
      return { joined: false };
    }

    await client.join(room.conversation(conversationId));
    return { joined: true };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<{ left: boolean }> {
    const conversationId = this.readConversationId(payload);
    if (!conversationId) return { left: false };
    await client.leave(room.conversation(conversationId));
    return { left: true };
  }

  /**
   * Typing indicators are relayed, never stored. They carry no content and are
   * scoped to a room the socket has already been authorized into.
   */
  @SubscribeMessage(CHAT_SOCKET_EVENTS.typing)
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = await this.authenticate(client);
    const conversationId = this.readConversationId(payload);
    if (!userId || !conversationId) return;
    if (!client.rooms.has(room.conversation(conversationId))) return;

    client
      .to(room.conversation(conversationId))
      .emit(CHAT_SOCKET_EVENTS.typing, { conversationId, userId });
  }

  /** Broadcasts a stored message to the thread room and to every participant. */
  emitMessageCreated(message: MessageResponseT, participantIds: readonly string[]): void {
    if (!this.server) return;
    this.server
      .to(room.conversation(message.conversationId))
      .emit(CHAT_SOCKET_EVENTS.messageCreated, message);

    // Participants who have the app open but are not viewing the thread still
    // need the inbox to move; they are reached through their user room.
    for (const participantId of participantIds) {
      if (participantId === message.senderUserId) continue;
      this.server
        .to(room.user(participantId))
        .emit(CHAT_SOCKET_EVENTS.conversationUpdated, {
          conversationId: message.conversationId,
          lastMessageAt: message.createdAt,
        });
    }
  }

  /**
   * Verifies the access token from the socket handshake.
   *
   * The same token and the same verifier as HTTP, because a socket that
   * authenticates differently from the REST API is a second front door with its
   * own bugs. Every message handler re-reads it rather than trusting a value
   * cached at connect time, so a revoked session stops working mid-connection.
   */
  private async authenticate(client: Socket): Promise<string | null> {
    // Read defensively: a socket reconnecting mid-upgrade can reach a handler
    // with a partially populated handshake, and a throw here would surface as
    // an unanswered acknowledgement rather than a refused connection.
    const handshake = client.handshake as
      | {
          auth?: Record<string, unknown>;
          headers?: Record<string, string | string[] | undefined>;
        }
      | undefined;
    const raw = handshake?.auth?.['token'] ?? handshake?.headers?.['authorization'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string' || value.length === 0) return null;

    const token = value.toLowerCase().startsWith('bearer ') ? value.slice(7) : value;
    try {
      return (await this.auth.verifyAccessToken(token)).sub;
    } catch {
      return null;
    }
  }

  private readConversationId(payload: unknown): string | null {
    if (typeof payload !== 'object' || payload === null) return null;
    const value = (payload as Record<string, unknown>)['conversationId'];
    return typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
  }
}
