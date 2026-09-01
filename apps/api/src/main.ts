import 'reflect-metadata';
import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './common/openapi.js';

/**
 * Browser origins allowed to call this API.
 *
 * An allow-list, never a wildcard: `credentials: true` plus `origin: true`
 * would let any page make authenticated calls with the visitor's own cookie.
 */
function corsOrigins(): string[] {
  const configured = process.env['CORS_ORIGINS'];
  return configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3002'];
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    allowedHeaders: ['content-type', 'authorization', 'x-platform'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  // Validates every parameter that carries a Standard Schema (Zod) and
  // replaces the raw input with the parsed value (defaults applied).
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  // Validates and strips responses against the schema given per-route via
  // @SerializeOptions({ schema }); internal fields never leak to clients.
  app.useGlobalInterceptors(new StandardSchemaSerializerInterceptor(app.get(Reflector)));
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app));
  await app.listen(Number(process.env['PORT'] ?? 3001));
}

void bootstrap();
