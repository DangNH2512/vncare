/**
 * Masking of contact data for the admin console.
 *
 * The repository masks in SQL so the raw value never leaves the database; the
 * pure functions below are the specification of the same shape and what the
 * unit test pins down. Both must stay in step.
 */

/** Matches every masked email: first character, three stars, `@`, domain. */
export const EMAIL_MASK_PATTERN = /^.\*{3}@.+$/;

/**
 * `anna@gmail.com` -> `a***@gmail.com`; null for an account without an email.
 * Same cut as the SQL twin: the domain is the text between the first and the
 * second `@`, the first character is a code point, and an empty domain is null.
 */
export function maskEmail(email: string | null): string | null {
  if (email === null) return null;
  const at = email.indexOf('@');
  if (at < 1) return null;
  const domain = email.split('@')[1] ?? '';
  if (domain === '') return null;
  return `${Array.from(email)[0] ?? ''}***@${domain}`;
}

/** `+84901234678` -> `*** *** 678`. */
export function maskPhone(phone: string | null): string | null {
  if (phone === null) return null;
  return `*** *** ${phone.slice(-3)}`;
}

/** SQL twin of `maskEmail`, for a column reference such as `u.email`. */
export const emailMaskSql = (column: string): string =>
  `CASE WHEN ${column} IS NULL OR position('@' in ${column}::text) < 2
             OR split_part(${column}::text, '@', 2) = '' THEN NULL
        ELSE left(${column}::text, 1) || '***@' || split_part(${column}::text, '@', 2) END`;

/** SQL twin of `maskPhone`. */
export const phoneMaskSql = (column: string): string =>
  `CASE WHEN ${column} IS NULL THEN NULL ELSE '*** *** ' || right(${column}, 3) END`;
