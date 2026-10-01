import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates the body of a reasoned admin action and answers with the flat
 * `{ code, messageKey }` the console reads. The failing field picks the key
 * (reason before confirm), so a lost reason and a lost confirmation are told
 * apart. Nothing the caller sent is echoed back.
 */
@Injectable()
export class AdminActionBodyPipe<S extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) return result.data;

    const fields = new Set(result.error.issues.map((issue) => issue.path[0]));
    if (fields.has('reason')) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        messageKey: 'errors.admin.reasonRequired',
      });
    }
    if (fields.has('confirm')) {
      throw new BadRequestException({
        code: 'CONFIRMATION_REQUIRED',
        messageKey: 'errors.admin.confirmationRequired',
      });
    }
    throw new BadRequestException({
      code: 'ADMIN_BODY_INVALID',
      messageKey: 'errors.admin.queryInvalid',
    });
  }
}
