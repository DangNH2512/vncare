/**
 * Joins class name fragments, dropping falsy ones.
 *
 * It performs no Tailwind conflict resolution: a `className` passed by a caller
 * is appended, not merged, so overriding a base utility requires a variant prop
 * rather than a competing class.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: readonly ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
