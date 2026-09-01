import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  envelope,
  MediaCompleteRequest,
  MediaResponse,
  MediaUploadRequest,
  MediaUploadResponse,
  type MediaCompleteRequestT,
  type MediaUploadRequestT,
} from '@dnc/contracts';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard.js';
import { TrustLevelGuard } from '../../common/guards/trust-level.guard.js';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { MediaService } from './media.service.js';

const UploadEnvelope = envelope(MediaUploadResponse);
const MediaEnvelope = envelope(MediaResponse);
const UuidParam = z.uuid();

/**
 * Upload handshake.
 *
 * Two calls rather than one multipart POST: bytes go straight from the browser
 * to object storage, so the API never buffers a 100 MB video and an upload does
 * not occupy a request thread for its whole duration.
 */
@Controller('api/v1/media')
@UseGuards(AuthenticatedGuard, TrustLevelGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: UploadEnvelope })
  async createUpload(
    @Body({ schema: MediaUploadRequest }) body: MediaUploadRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.media.createUpload(body, viewer) };
  }

  @Put(':id/complete')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: MediaEnvelope })
  async complete(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: MediaCompleteRequest }) body: MediaCompleteRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.media.complete(id, body, viewer) };
  }
}
