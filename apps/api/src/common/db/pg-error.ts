import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';

/** PostgreSQL SQLSTATE codes this API translates into HTTP responses. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';
const LOCK_NOT_AVAILABLE = '55P03';
const QUERY_CANCELED = '57014';

interface PostgresError {
  code?: string;
}

function sqlState(error: unknown): PostgresError {
  return typeof error === 'object' && error !== null ? error : {};
}

/**
 * Maps a database error onto an HTTP exception carrying an i18n key.
 *
 * Constraint names are never forwarded to the client: they describe the
 * physical schema, which is not part of the API contract and is useful to an
 * attacker mapping the database. The caller re-throws anything unrecognised so
 * a genuine bug still surfaces as a 500 with a stack trace in Sentry.
 */
export function translatePostgresError(error: unknown): Error {
  const { code } = sqlState(error);

  switch (code) {
    case UNIQUE_VIOLATION:
      return new ConflictException({
        code: 'DUPLICATE',
        messageKey: 'errors.common.duplicate',
      });
    case FOREIGN_KEY_VIOLATION:
      return new BadRequestException({
        code: 'REFERENCE_NOT_FOUND',
        messageKey: 'errors.common.referenceNotFound',
      });
    case CHECK_VIOLATION:
      return new BadRequestException({
        code: 'CONSTRAINT_VIOLATED',
        messageKey: 'errors.common.constraintViolated',
      });
    case LOCK_NOT_AVAILABLE:
    case QUERY_CANCELED:
      // A contended row, not a client mistake: the same request is expected to
      // succeed on retry, so the client is told to retry rather than to change.
      return new ServiceUnavailableException({
        code: 'RETRY_LATER',
        messageKey: 'errors.common.retryLater',
      });
    default:
      return error instanceof Error ? error : new Error(String(error));
  }
}
