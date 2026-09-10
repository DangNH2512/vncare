import { z } from 'zod';

/** Standard response envelope for every endpoint: `{ success, data, meta }`. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.boolean(),
    data,
    meta: z.record(z.string(), z.unknown()).optional(),
  });

/** Cursor-based pagination wrapper shared by all list endpoints. */
export const cursorPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

/**
 * Standard error shape returned to clients. `messageKey` is an i18n key
 * (present in both en.json and vi.json), never a display string.
 */
export const ApiError = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    messageKey: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorT = z.infer<typeof ApiError>;
