import { MESSAGE_KEYS, type MessageKey } from '@dnc/i18n';

import { ApiError } from '../../_lib/api';
import type { Translate } from '../../_lib/i18n';

const KNOWN_KEYS: ReadonlySet<string> = new Set(MESSAGE_KEYS);

export interface ActionFailure {
  text: string;
  /** 409: the state changed under the operator; the fix is to reload, not to retry. */
  conflict: boolean;
}

/**
 * Turns a failed admin action into text.
 *
 * A 4xx that carries a `messageKey` the catalog knows is shown through that
 * key. Everything else (offline, 5xx, an unknown key) reads as the generic
 * "nothing was changed": every action is one transaction, so a failure
 * leaves no partial state, and a raw key must never reach the screen.
 */
export function describeActionFailure(error: unknown, t: Translate): ActionFailure {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    const key = error.messageKey;
    if (key !== undefined && KNOWN_KEYS.has(key)) {
      return { text: t(key as MessageKey), conflict: error.status === 409 };
    }
  }
  return { text: t('admin.action.failed'), conflict: false };
}
