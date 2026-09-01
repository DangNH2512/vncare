import { DEFAULT_LOCALE, messages, type Locale, type MessageKey } from '@dnc/i18n';

export type { Locale, MessageKey };

/** English is the default locale; Vietnamese is the second. See @dnc/i18n. */
export const LOCALES: readonly Locale[] = ['en', 'vi'];
export const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;

/** Values substituted into `{placeholder}` slots of a message. */
export type MessageParams = Readonly<Record<string, string | number>>;

/** Signature every screen receives from `useTranslate()`. */
export type Translate = (key: MessageKey, params?: MessageParams) => string;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Walks a dotted key through a nested catalog; returns undefined unless it lands on a string. */
function lookup(catalog: unknown, key: string): string | undefined {
  let node: unknown = catalog;
  for (const segment of key.split('.')) {
    if (!isRecord(node)) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params: MessageParams | undefined): string {
  if (params === undefined) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolves a message for a locale.
 *
 * Missing translations fall back to the English catalog and, failing that, to
 * the key itself — a visible key is easier to spot in review than empty space.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const raw = lookup(messages[locale], key) ?? lookup(messages[FALLBACK_LOCALE], key);
  return raw === undefined ? key : interpolate(raw, params);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tags used for Intl formatting; `en-GB` gives day-first dates and a 24h clock. */
export const INTL_LOCALE: Readonly<Record<Locale, string>> = {
  en: 'en-GB',
  vi: 'vi-VN',
};
