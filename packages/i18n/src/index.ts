import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };

export { MESSAGE_KEYS, type MessageKey } from './message-keys.js';

/**
 * Raw message catalogs. Runtime i18n stays per-app (next-intl on web,
 * i18next on mobile); this package only shares the data and the key type.
 */
export const messages = { en, vi } as const;
export type Locale = keyof typeof messages;
export const DEFAULT_LOCALE: Locale = 'en';
