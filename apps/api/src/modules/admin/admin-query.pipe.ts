import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates a query string against a contract schema and fails with the flat
 * `{ code, messageKey }` body the console reads, instead of the generic
 * validation payload. Nothing the caller sent is echoed back.
 */
@Injectable()
export class AdminQueryPipe<S extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'ADMIN_QUERY_INVALID',
        messageKey: 'errors.admin.queryInvalid',
      });
    }
    return result.data;
  }
}
