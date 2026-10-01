import { ApiError } from './api';
import type { MessageKey, Translate } from './i18n';

/**
 * Translates a server-chosen `messageKey`, or falls back to a screen default.
 *
 * The catalog lookup returns the key itself when it has no entry, so an
 * unrecognised key is detected by equality and never shown to the member.
 */
export function translateApiError(t: Translate, cause: unknown, fallbackKey: MessageKey): string {
  if (cause instanceof ApiError && cause.messageKey !== undefined) {
    const known = t(cause.messageKey as MessageKey);
    if (known !== cause.messageKey) return known;
  }
  return t(fallbackKey);
}
