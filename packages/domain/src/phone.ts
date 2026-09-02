/** Vietnam's country calling code, without the leading plus. */
const VN_CODE = '84';

/** E.164 allows at most fifteen digits; fewer than eight is not a reachable number. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/**
 * Normalises a typed phone number to E.164, or returns null when the input is
 * not a phone number at all.
 *
 * People type the same Vietnamese number four ways — `0905 123 456`,
 * `+84 905 123 456`, `84905123456`, `(0905) 123-456` — and each would become a
 * separate account under a unique index on the raw string. Normalising on the
 * way in makes them one value.
 *
 * A null result is meaningful: the caller uses it to decide the input was a
 * handle or an email rather than a number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits === '') return null;

  // Anything left over after removing digits and the separators people type is
  // not a phone number — a handle like `my_khe_2` must not become one.
  if (/[^\d\s().+-]/.test(trimmed)) return null;

  let national = digits;
  if (hasPlus) {
    // Already international; keep the country code as given.
    return withinRange(digits) ? `+${digits}` : null;
  }
  if (national.startsWith('00')) {
    national = national.slice(2);
    return withinRange(national) ? `+${national}` : null;
  }
  if (national.startsWith('0')) {
    // Vietnamese national format: the trunk zero is dropped in E.164.
    national = `${VN_CODE}${national.slice(1)}`;
  } else if (!national.startsWith(VN_CODE)) {
    // A bare subscriber number with no trunk zero and no country code is
    // assumed Vietnamese, which is the only market this product serves.
    national = `${VN_CODE}${national}`;
  }

  return withinRange(national) ? `+${national}` : null;
}

function withinRange(digits: string): boolean {
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}
