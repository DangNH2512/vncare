import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';

/**
 * The only door other modules get into the chat sockets. It exposes one
 * operation so a caller (the admin console) can cut a user off without being
 * able to emit to rooms or read the gateway's server.
 */
@Injectable()
export class ChatSocketControl {
  constructor(private readonly gateway: ChatGateway) {}

  /** Drops every open socket of one user, on every device. */
  disconnectUser(userId: string): void {
    this.gateway.disconnectUser(userId);
  }
}
