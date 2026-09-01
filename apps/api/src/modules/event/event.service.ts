import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EventCreateRequestT, EventResponseT } from '@dnc/contracts';

/**
 * Draft-event creation, in memory only. This service exists to prove the
 * contract chain (Zod -> validation pipe -> serializer -> OpenAPI); the
 * repository layer replaces the in-memory part when TypeORM lands.
 */
@Injectable()
export class EventService {
  createDraft(
    input: EventCreateRequestT,
  ): EventResponseT & { internalModerationNote: string } {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      slug: this.slugify(input.title),
      title: input.title,
      description: input.description ?? null,
      areaId: input.areaId,
      lat: input.lat,
      lng: input.lng,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      capacity: input.capacity,
      seatsTaken: 0,
      status: 'draft',
      requiredTrustLevel: input.requiredTrustLevel,
      createdAt: now,
      // Never reaches clients: the response schema strips unknown fields.
      internalModerationNote: 'pending first review',
    };
  }

  private slugify(title: string): string {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base}-${randomUUID().slice(0, 8)}`;
  }
}
