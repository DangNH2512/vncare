import { Body, Controller, Get, Param, Patch, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import {
  envelope,
  MyProfileResponse,
  ProfileUpdateRequest,
  PublicProfileResponse,
  type ProfileUpdateRequestT,
} from '@dnc/contracts';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CurrentUser,
  OptionalUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ProfileService } from './profile.service.js';

const PublicEnvelope = envelope(PublicProfileResponse);
const MyEnvelope = envelope(MyProfileResponse);

/** Same pattern as the handle column: lowercase, so one person has one URL. */
const HandleParam = z
  .string()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/);

@Controller('api/v1')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  /** The owner's own record, including the fields nobody else may read. */
  @Get('me/profile')
  @SerializeOptions({ schema: MyEnvelope })
  async me(@CurrentUser() viewer: CurrentUserContext) {
    return { success: true, data: await this.profiles.me(viewer) };
  }

  @Patch('me/profile')
  @SerializeOptions({ schema: MyEnvelope })
  async update(
    @Body({ schema: ProfileUpdateRequest }) body: ProfileUpdateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.profiles.update(body, viewer) };
  }

  /**
   * A member's public page. Readable without an account so a shared profile
   * link works for someone who has not signed up yet — which is how they find
   * out the community exists.
   */
  @Public()
  @Get('profiles/:handle')
  @SerializeOptions({ schema: PublicEnvelope })
  async byHandle(
    @Param('handle', { schema: HandleParam }) handle: string,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return { success: true, data: await this.profiles.findByHandle(handle, viewer) };
  }
}
