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
  cursorPage,
  envelope,
  ListPostQuery,
  PostCreateRequest,
  PostResponse,
  PostUpdateRequest,
  type ListPostQueryT,
  type PostCreateRequestT,
  type PostUpdateRequestT,
} from '@dnc/contracts';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CurrentUser,
  OptionalUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { PostService } from './post.service.js';

const PostEnvelope = envelope(PostResponse);
const PostPageEnvelope = envelope(cursorPage(PostResponse));
const UuidParam = z.uuid();

@Controller('api/v1/posts')
export class PostController {
  constructor(private readonly posts: PostService) {}

  /** Publishing requires a verified account (T1); T0 can read but not write. */
  @Post()
  @MinTrustLevel(1)
  @SerializeOptions({ schema: PostEnvelope })
  async create(
    @Body({ schema: PostCreateRequest }) body: PostCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.posts.create(body, viewer) };
  }

  @Public()
  @Get()
  @SerializeOptions({ schema: PostPageEnvelope })
  async list(
    @Query({ schema: ListPostQuery }) query: ListPostQueryT,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return { success: true, data: await this.posts.list(query, viewer) };
  }

  @Public()
  @Get(':id')
  @SerializeOptions({ schema: PostEnvelope })
  async findOne(
    @Param('id', { schema: UuidParam }) id: string,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return { success: true, data: await this.posts.findOne(id, viewer) };
  }

  @Patch(':id')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: PostEnvelope })
  async update(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: PostUpdateRequest }) body: PostUpdateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.posts.update(id, body, viewer) };
  }

  /** Soft delete: the row survives for moderation history and appeals. */
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.posts.remove(id, viewer);
  }
}
