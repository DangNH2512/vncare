import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type MediaCompleteRequestT,
  type MediaKindT,
  type MediaResponseT,
  type MediaUploadRequestT,
  type MediaUploadResponseT,
} from '@dnc/contracts';
import { MEDIA_BUCKET, S3 } from '../../storage/storage.module.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { MediaRepository, type MediaRow } from './media.repository.js';
import { toMediaResponse } from './media.mapper.js';

/** Presigned PUT lifetime. Long enough for a slow phone upload, short enough to be useless if leaked. */
const UPLOAD_TTL_SECONDS = 600;

/** Presigned GET lifetime. Bounded so a copied URL stops working well before a moderation decision does. */
const VIEW_TTL_SECONDS = 3600;

const LIMITS: Readonly<
  Record<MediaKindT, { mimeTypes: readonly string[]; maxBytes: number }>
> = {
  image: { mimeTypes: ALLOWED_IMAGE_MIME, maxBytes: MAX_IMAGE_BYTES },
  video: { mimeTypes: ALLOWED_VIDEO_MIME, maxBytes: MAX_VIDEO_BYTES },
};

@Injectable()
export class MediaService implements OnModuleInit {
  constructor(
    private readonly media: MediaRepository,
    @Inject(S3) private readonly s3: S3Client,
    @Inject(MEDIA_BUCKET) private readonly bucket: string,
  ) {}

  /**
   * Creates the bucket if it is absent.
   *
   * Local development gets a working stack from `docker compose up` alone. A
   * managed bucket in production already exists and this is a no-op, so the
   * same code path is correct in both places.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3
        .send(new CreateBucketCommand({ Bucket: this.bucket }))
        .catch(() => undefined);
    }
  }

  /**
   * Issues a presigned PUT.
   *
   * Type and size are checked before signing, not after uploading: once a URL
   * is signed the object storage will accept whatever the client sends, so this
   * is the only moment the limit can be enforced.
   */
  async createUpload(
    input: MediaUploadRequestT,
    viewer: CurrentUserContext,
  ): Promise<MediaUploadResponseT> {
    const limit = LIMITS[input.kind];
    if (!limit.mimeTypes.includes(input.mimeType)) {
      throw new BadRequestException({
        code: 'MEDIA_TYPE_NOT_ALLOWED',
        messageKey: 'errors.media.typeNotAllowed',
        details: { allowed: limit.mimeTypes },
      });
    }
    if (input.byteSize > limit.maxBytes) {
      throw new BadRequestException({
        code: 'MEDIA_TOO_LARGE',
        messageKey: 'errors.media.tooLarge',
        details: { maxBytes: limit.maxBytes },
      });
    }

    const row = await this.media.create({
      ownerUserId: viewer.id,
      kind: input.kind,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    });

    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: row.storage_key,
        ContentType: input.mimeType,
      }),
      { expiresIn: UPLOAD_TTL_SECONDS },
    );

    return {
      mediaId: row.id,
      uploadUrl,
      // Signed into the URL, so the client must send exactly this and nothing more.
      uploadHeaders: { 'content-type': input.mimeType },
      expiresInSeconds: UPLOAD_TTL_SECONDS,
    };
  }

  /**
   * Marks an upload complete.
   *
   * The object is checked against storage rather than trusted from the request:
   * a client that calls this without uploading would otherwise attach an empty
   * item to a post, and the gallery would render a broken frame forever.
   */
  async complete(
    id: string,
    input: MediaCompleteRequestT,
    viewer: CurrentUserContext,
  ): Promise<MediaResponseT> {
    const row = await this.media.findOwned(id, viewer.id);
    if (!row) throw this.notFound();

    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: row.storage_key }),
      );
    } catch {
      throw new BadRequestException({
        code: 'MEDIA_NOT_UPLOADED',
        messageKey: 'errors.media.notUploaded',
      });
    }

    const ready = await this.media.markReady(id, input);
    if (!ready) throw this.notFound();
    return this.sign(ready);
  }

  /** Resolves a gallery to responses with fresh signed URLs, in the given order. */
  async resolveGallery(ids: readonly string[]): Promise<MediaResponseT[]> {
    const rows = await this.media.findReadyByIds(ids);
    return Promise.all(rows.map((row) => this.sign(row)));
  }

  /**
   * Keeps only ids the caller owns and has finished uploading.
   *
   * Attaching someone else's media id to your own post would republish their
   * photo under your name, so ownership is verified at attach time rather than
   * assumed from the client's list.
   */
  filterAttachable(ids: readonly string[], viewer: CurrentUserContext): Promise<string[]> {
    return this.media.filterOwnedReady(ids, viewer.id);
  }

  private async sign(row: MediaRow): Promise<MediaResponseT> {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: row.storage_key }),
      { expiresIn: VIEW_TTL_SECONDS },
    );
    return toMediaResponse(row, url);
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'MEDIA_NOT_FOUND',
      messageKey: 'errors.media.notFound',
    });
  }
}
