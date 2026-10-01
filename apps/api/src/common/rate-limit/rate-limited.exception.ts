import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a rate limit rejects a request.
 *
 * Carries the retry delay so the filter can set `Retry-After`, which an
 * `HttpException` has no way to express on its own. The body deliberately says
 * nothing about which counter tripped.
 */
export class RateLimitedException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        messageKey: 'errors.auth.rateLimited',
        details: { retryAfterSeconds },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
