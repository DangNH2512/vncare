import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';
import {
  BlockedUserResponse,
  cursorPage,
  envelope,
  ListBlockQuery,
  MyProfileResponse,
  ProfileUpdateRequest,
  PublicProfileResponse,
  type ListBlockQueryT,
  type ProfileUpdateRequestT,
} from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  OptionalUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ProfileService } from './profile.service.js';

const PublicEnvelope = envelope(PublicProfileResponse);
const MyEnvelope = envelope(MyProfileResponse);
const BlockPageEnvelope = envelope(cursorPage(BlockedUserResponse));
const UuidParam = z.uuid();

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

  /**
   * Blocks a member (E2). 204 whether the block is new or already existed, so
   * a double tap and a retry both land on one row.
   */
  @Post('users/:userId/block')
  @Roles(...allowedRolesFor('block.manage'))
  @HttpCode(204)
  async block(
    @Param('userId', { schema: UuidParam }) userId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.profiles.block(userId, viewer);
  }

  /** Lifts a block (E3). 204 even when there was none: the state asked for is already true. */
  @Delete('users/:userId/block')
  @Roles(...allowedRolesFor('block.manage'))
  @HttpCode(204)
  async unblock(
    @Param('userId', { schema: UuidParam }) userId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.profiles.unblock(userId, viewer);
  }

  /** The caller's own block list (E4), newest first. */
  @Get('me/blocks')
  @Roles(...allowedRolesFor('block.manage'))
  @SerializeOptions({ schema: BlockPageEnvelope })
  async blocks(
    @Query({ schema: ListBlockQuery }) query: ListBlockQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.profiles.listBlocks(query, viewer) };
  }
}
