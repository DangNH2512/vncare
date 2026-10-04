import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  BlockedUserResponseT,
  ListBlockQueryT,
  MediaResponseT,
  MyProfileResponseT,
  ProfileUpdateRequestT,
  PublicProfileResponseT,
} from '@dnc/contracts';
import { normalizePhone } from '@dnc/domain';
import { translatePostgresError } from '../../common/db/pg-error.js';
import { toPage } from '../../common/pagination.js';
import { AuthRepository } from '../auth/index.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { MediaService } from '../media/index.js';
import { blockCursorOf, ProfileRepository, type ProfileRow } from './profile.repository.js';
import { toBlockedUser, toMyProfile, toPublicProfile } from './profile.mapper.js';

@Injectable()
export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly media: MediaService,
    private readonly users: AuthRepository,
  ) {}

  /**
   * Reads a profile by its public handle.
   *
   * `members_only` answers 404 to an anonymous reader rather than 403: telling
   * a stranger "this handle exists but you may not see it" is still telling
   * them the handle exists.
   */
  async findByHandle(
    handle: string,
    viewer: CurrentUserContext | null,
  ): Promise<PublicProfileResponseT> {
    // A block between the viewer and the owner, either way, makes the profile
    // absent at the query: the 404 below is then the very same one a handle
    // nobody holds gets, so the response cannot tell "blocked" apart (AC-17).
    const row = await this.profiles.findByHandle(handle, viewer?.id ?? null);
    if (!row) throw this.notFound();

    const isOwner = viewer?.id === row.user_id;
    if (!isOwner && !this.visibleTo(row, viewer)) throw this.notFound();

    return toPublicProfile(row, await this.avatar(row));
  }

  private visibleTo(row: ProfileRow, viewer: CurrentUserContext | null): boolean {
    switch (row.visibility) {
      case 'public':
        return true;
      case 'members_only':
        return viewer !== null;
      case 'private':
        return false;
    }
  }

  async me(viewer: CurrentUserContext): Promise<MyProfileResponseT> {
    const row = await this.profiles.findByUserId(viewer.id);
    if (!row) throw this.notFound();
    return toMyProfile(row, await this.avatar(row));
  }

  async update(
    patch: ProfileUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<MyProfileResponseT> {
    if (patch.avatarMediaId !== undefined && patch.avatarMediaId !== null) {
      // Someone else's upload must not become your face.
      const owned = await this.media.filterAttachable([patch.avatarMediaId], viewer);
      if (owned.length === 0) {
        throw new ForbiddenException({
          code: 'MEDIA_NOT_OWNED',
          messageKey: 'errors.media.notFound',
        });
      }
    }

    try {
      // The phone lives on `users`, not `profiles`: it is a sign-in identifier
      // guarded by a unique index, not a profile field.
      if (Object.hasOwn(patch, 'phone')) {
        await this.users.updatePhone(viewer.id, this.phoneOrThrow(patch.phone ?? null));
      }

      const row = await this.profiles.update(viewer.id, patch);
      if (!row) throw this.notFound();
      return toMyProfile(row, await this.avatar(row));
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  /**
   * Normalises a typed number to E.164, or rejects it.
   *
   * Rejecting rather than storing what was typed: an unnormalised number
   * defeats the unique index — the same person could hold `0905123456` and
   * `+84905123456` as two accounts — and would never match at sign-in.
   */
  private phoneOrThrow(input: string | null): string | null {
    if (input === null || input.trim() === '') return null;
    const normalized = normalizePhone(input);
    if (normalized === null) {
      throw new BadRequestException({
        code: 'PHONE_INVALID',
        messageKey: 'errors.profile.phoneInvalid',
      });
    }
    return normalized;
  }

  /**
   * Blocks another member (E2). Silent by design: nothing is sent to the
   * blocked person and nothing they can call reveals it (brief §6).
   *
   * No audit entry: blocking is a member's private safety choice, not a staff
   * action on someone else's data (AC-46).
   */
  async block(targetUserId: string, viewer: CurrentUserContext): Promise<void> {
    if (targetUserId === viewer.id) {
      throw new UnprocessableEntityException({
        code: 'BLOCK_SELF_NOT_ALLOWED',
        messageKey: 'errors.block.selfNotAllowed',
      });
    }
    const found = await this.profiles.block(viewer.id, targetUserId);
    if (!found) throw this.notFound();
  }

  /** Lifts a block (E3); succeeds whether or not one existed. */
  async unblock(targetUserId: string, viewer: CurrentUserContext): Promise<void> {
    await this.profiles.unblock(viewer.id, targetUserId);
  }

  /** The caller's own block list (E4). Nobody else's list is reachable. */
  async listBlocks(
    query: ListBlockQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: BlockedUserResponseT[]; nextCursor: string | null }> {
    const { rows, limit } = await this.profiles.listBlocks(viewer.id, query);
    const page = rows.slice(0, limit);
    const avatarIds = [
      ...new Set(page.map((r) => r.avatar_media_id).filter((v): v is string => v !== null)),
    ];
    // One signing pass for the page, as the attendee list does.
    const avatars = new Map(
      avatarIds.length === 0
        ? []
        : (await this.media.resolveGallery(avatarIds)).map((item) => [item.id, item.url]),
    );
    return toPage(
      rows,
      limit,
      (row) =>
        toBlockedUser(
          row,
          row.avatar_media_id === null ? null : (avatars.get(row.avatar_media_id) ?? null),
        ),
      blockCursorOf,
    );
  }

  private async avatar(row: ProfileRow): Promise<MediaResponseT | null> {
    if (row.avatar_media_id === null) return null;
    const [avatar] = await this.media.resolveGallery([row.avatar_media_id]);
    return avatar ?? null;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'PROFILE_NOT_FOUND',
      messageKey: 'errors.profile.notFound',
    });
  }
}
