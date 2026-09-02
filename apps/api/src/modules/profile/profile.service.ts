import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MediaResponseT,
  MyProfileResponseT,
  ProfileUpdateRequestT,
  PublicProfileResponseT,
} from '@dnc/contracts';
import { normalizePhone } from '@dnc/domain';
import { translatePostgresError } from '../../common/db/pg-error.js';
import { AuthRepository } from '../auth/index.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { MediaService } from '../media/index.js';
import { ProfileRepository, type ProfileRow } from './profile.repository.js';
import { toMyProfile, toPublicProfile } from './profile.mapper.js';

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
    const row = await this.profiles.findByHandle(handle);
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
