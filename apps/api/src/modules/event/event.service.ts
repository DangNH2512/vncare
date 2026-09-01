import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  EventCreateRequestT,
  EventResponseT,
  EventStatusUpdateRequestT,
  EventUpdateRequestT,
  ListEventQueryT,
} from '@dnc/contracts';
import { toPage } from '../../common/pagination.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { EventRepository, eventCursorOf } from './event.repository.js';
import { toEventResponse } from './event.mapper.js';

@Injectable()
export class EventService {
  constructor(private readonly events: EventRepository) {}

  /**
   * Creates a draft event with its first occurrence.
   *
   * New events start as `draft` regardless of what the organizer intends: they
   * become visible through an explicit status change, which is where the
   * pre-publish review for low-trust organizers hooks in.
   */
  async create(
    input: EventCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<EventResponseT> {
    try {
      const row = await this.events.create({
        organizerId: viewer.id,
        slug: this.slugify(input.title),
        title: input.title,
        description: input.description ?? null,
        areaId: input.areaId,
        lat: input.lat,
        lng: input.lng,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        capacity: input.capacity,
        requiredTrustLevel: input.requiredTrustLevel,
      });
      return toEventResponse(row);
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async findOne(id: string, viewer: CurrentUserContext | null): Promise<EventResponseT> {
    const row = await this.events.findById(id, viewer?.id ?? null);
    if (!row) throw this.notFound();
    return toEventResponse(row);
  }

  async list(
    query: ListEventQueryT,
    viewer: CurrentUserContext | null,
  ): Promise<{ items: EventResponseT[]; nextCursor: string | null }> {
    const { rows, limit } = await this.events.list(query, viewer?.id ?? null);
    return toPage(rows, limit, toEventResponse, eventCursorOf);
  }

  async update(
    id: string,
    patch: EventUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<EventResponseT> {
    await this.assertOrganizer(id, viewer);
    try {
      const row = await this.events.update(id, patch);
      if (!row) throw this.notFound();
      return toEventResponse(row);
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async updateStatus(
    id: string,
    input: EventStatusUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<EventResponseT> {
    await this.assertOrganizer(id, viewer);
    const row = await this.events.updateStatus(id, input.status);
    if (!row) {
      // The event exists and belongs to the caller, so the only way the update
      // matched nothing is a moderation hold.
      throw new ForbiddenException({
        code: 'EVENT_UNDER_MODERATION',
        messageKey: 'errors.event.underModeration',
      });
    }
    return toEventResponse(row);
  }

  async remove(id: string, viewer: CurrentUserContext): Promise<void> {
    await this.assertOrganizer(id, viewer);
    const deleted = await this.events.softDelete(id);
    if (!deleted) throw this.notFound();
  }

  private async assertOrganizer(id: string, viewer: CurrentUserContext): Promise<void> {
    const organizerId = await this.events.findOrganizer(id);
    if (!organizerId) throw this.notFound();
    if (organizerId !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_EVENT_ORGANIZER',
        messageKey: 'errors.event.notOrganizer',
      });
    }
  }

  /**
   * Builds a URL-safe slug from the title.
   *
   * Vietnamese diacritics are stripped through NFD so "Cà phê" becomes
   * "ca-phe"; the random suffix keeps the partial unique index satisfied
   * without a retry loop when two events share a name.
   */
  private slugify(title: string): string {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base}-${randomUUID().slice(0, 8)}`;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'EVENT_NOT_FOUND',
      messageKey: 'errors.event.notFound',
    });
  }
}
