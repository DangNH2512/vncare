import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { decideRsvpOutcome } from '@dnc/domain';
import type { AttendeeResponseT, RsvpResponseT } from '@dnc/contracts';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { MediaService } from '../media/index.js';
import { RsvpRepository } from './rsvp.repository.js';
import { toAttendeeResponse, toRsvpResponse } from './rsvp.mapper.js';

@Injectable()
export class RsvpService {
  constructor(
    private readonly rsvps: RsvpRepository,
    private readonly media: MediaService,
  ) {}

  /**
   * Registers the caller for one occurrence.
   *
   * The admission decision is `decideRsvpOutcome` from @dnc/domain — the same
   * pure function web and mobile use to predict the outcome — evaluated here
   * against numbers read under the occurrence row lock, which is what makes the
   * prediction binding. A full occurrence answers with a waitlist place, never
   * an error.
   */
  async join(
    occurrenceId: string,
    idempotencyKey: string,
    viewer: CurrentUserContext,
  ): Promise<{ rsvp: RsvpResponseT; created: boolean }> {
    try {
      return await this.rsvps.transaction(async (tx) => {
        const fresh = await this.rsvps.claimIdempotencyKey(
          tx,
          idempotencyKey,
          viewer.id,
          'rsvp:join',
        );
        if (!fresh) {
          // The retry of a request that already succeeded: hand back the state
          // it created rather than judging the request twice.
          const existing = await this.rsvps.findOwn(occurrenceId, viewer.id, tx);
          if (existing) return { rsvp: toRsvpResponse(existing), created: false };
          // The key was spent on an occurrence this row no longer matches —
          // fall through and treat it as a fresh request.
        }

        const occurrence = await this.rsvps.lockOccurrence(tx, occurrenceId, viewer.id);
        if (!occurrence) throw this.notFound();

        const decision = decideRsvpOutcome({
          seatsTaken: occurrence.seats_taken,
          capacity: occurrence.capacity,
          viewerTrustLevel: viewer.trustLevel,
          requiredTrustLevel: occurrence.required_trust_level,
          viewerIsSuspended: false,
          existingActiveStatus: occurrence.existing_active_status,
          occurrenceOpen:
            occurrence.event_status === 'published' &&
            occurrence.starts_at.getTime() > Date.now(),
        });

        if (decision.kind === 'reject') {
          throw this.rejection(decision.reason, decision.messageKey);
        }

        const status = decision.kind === 'confirm' ? 'confirmed' : 'waitlisted';
        const id = await this.rsvps.insertRsvp(tx, occurrenceId, viewer.id, status);
        if (status === 'waitlisted') {
          await this.rsvps.appendWaitlist(tx, occurrenceId, viewer.id);
        }
        await this.rsvps.refreshSeatCache(tx, occurrenceId);

        const row = await this.rsvps.findById(id, tx);
        if (!row) throw this.notFound();
        return { rsvp: toRsvpResponse(row), created: true };
      });
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  /**
   * Cancels the caller's registration and gives the freed seat to the head of
   * the waitlist, all in the one transaction — a seat must never be visibly
   * free while someone is queued for it.
   */
  async cancel(occurrenceId: string, viewer: CurrentUserContext): Promise<void> {
    try {
      await this.rsvps.transaction(async (tx) => {
        const occurrence = await this.rsvps.lockOccurrence(tx, occurrenceId, viewer.id);
        if (!occurrence) throw this.notFound();

        const previous = await this.rsvps.cancelActive(tx, occurrenceId, viewer.id);
        if (previous === null) {
          throw new NotFoundException({
            code: 'RSVP_NOT_FOUND',
            messageKey: 'rsvp.error.notRegistered',
          });
        }

        if (previous === 'waitlisted') {
          await this.rsvps.closeWaitlistEntry(tx, occurrenceId, viewer.id, 'cancelled');
        } else {
          // A seat came free; the queue moves up. TODO(notification): tell the
          // promoted person once the notification module exists.
          await this.rsvps.promoteNextWaiting(tx, occurrenceId);
        }
        await this.rsvps.refreshSeatCache(tx, occurrenceId);
      });
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async myRsvp(occurrenceId: string, viewer: CurrentUserContext): Promise<RsvpResponseT> {
    const row = await this.rsvps.findOwn(occurrenceId, viewer.id);
    if (!row) {
      throw new NotFoundException({
        code: 'RSVP_NOT_FOUND',
        messageKey: 'rsvp.error.notRegistered',
      });
    }
    return toRsvpResponse(row);
  }

  /**
   * Who is going. Members only — the docs treat the attendee list as
   * meet-in-person safety data, so it is never served anonymously.
   */
  async attendees(occurrenceId: string): Promise<AttendeeResponseT[]> {
    const rows = await this.rsvps.listAttendees(occurrenceId);
    const avatarIds = [...new Set(rows.map((r) => r.avatar_media_id).filter((v): v is string => v !== null))];
    const avatars = new Map(
      (await this.media.resolveGallery(avatarIds)).map((item) => [item.id, item.url]),
    );
    return rows.map((row) =>
      toAttendeeResponse(
        row,
        row.avatar_media_id === null ? null : (avatars.get(row.avatar_media_id) ?? null),
      ),
    );
  }

  private rejection(reason: string, messageKey: string): Error {
    if (reason === 'already_active') {
      return new ConflictException({ code: 'ALREADY_RSVPED', messageKey });
    }
    if (reason === 'occurrence_closed') {
      return new BadRequestException({ code: 'OCCURRENCE_CLOSED', messageKey });
    }
    return new ForbiddenException({ code: reason.toUpperCase(), messageKey });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'OCCURRENCE_NOT_FOUND',
      messageKey: 'rsvp.error.occurrenceNotFound',
    });
  }
}
