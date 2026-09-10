import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';

export const S3 = Symbol('S3');
export const MEDIA_BUCKET = Symbol('MEDIA_BUCKET');

/**
 * S3-compatible object storage.
 *
 * MinIO locally, a CDN-backed bucket in production — the same API either way,
 * which is why the stack committed to the S3 protocol rather than a provider.
 * `forcePathStyle` is required by MinIO: virtual-host addressing needs wildcard
 * DNS that a local container does not have.
 */
@Global()
@Module({
  providers: [
    {
      provide: S3,
      useFactory: (): S3Client =>
        new S3Client({
          region: process.env['S3_REGION'] ?? 'us-east-1',
          endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9002',
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env['S3_ACCESS_KEY'] ?? 'dnc',
            secretAccessKey: process.env['S3_SECRET_KEY'] ?? 'dnc-local-only',
          },
        }),
    },
    {
      provide: MEDIA_BUCKET,
      useFactory: (): string => process.env['S3_MEDIA_BUCKET'] ?? 'dnc-media',
    },
  ],
  exports: [S3, MEDIA_BUCKET],
})
export class StorageModule {}
