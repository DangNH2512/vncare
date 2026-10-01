import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { RateLimitedException } from './rate-limited.exception.js';

/**
 * Renders a {@link RateLimitedException} as a 429 with a `Retry-After` header.
 *
 * Bound with `@UseFilters` on the controllers that enforce a limit, so the
 * header exists in the e2e harness as well as in `main.ts`, without a global
 * registration.
 */
@Catch(RateLimitedException)
export class RateLimitedExceptionFilter implements ExceptionFilter<RateLimitedException> {
  catch(exception: RateLimitedException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(429)
      .set('Retry-After', String(exception.retryAfterSeconds))
      .json(exception.getResponse());
  }
}
