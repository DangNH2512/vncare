import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/**
 * Builds the OpenAPI document. Request/response shapes are derived from the
 * Zod schemas attached to route parameters and @SerializeOptions — there are
 * no hand-written @ApiProperty decorators to drift from the contracts.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Da Nang Connect API')
    .setDescription('Community events platform for expats in Da Nang')
    .setVersion('0.0.1')
    .build();
  return SwaggerModule.createDocument(app, config);
}
