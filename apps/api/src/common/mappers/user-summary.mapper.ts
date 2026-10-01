import type { UserSummaryT } from '@dnc/contracts';

/** Identity columns as a join on `users`/`profiles` yields them; all null when the join found nothing. */
export interface UserSummaryColumns {
  handle: string | null;
  displayName: string | null;
  trustLevel: number | null;
}

/**
 * Builds the public identity shown next to a member's content.
 *
 * Returns null when the account is gone (anonymized, deleted or never had a
 * profile): the caller renders "former member" rather than a half-filled
 * identity. Fields are named one by one so a column added to `users` never
 * reaches a stranger through this path.
 */
export function toUserSummary(
  userId: string | null,
  columns: UserSummaryColumns,
): UserSummaryT | null {
  if (
    userId === null ||
    columns.handle === null ||
    columns.displayName === null ||
    columns.trustLevel === null
  ) {
    return null;
  }
  return {
    userId,
    handle: columns.handle,
    displayName: columns.displayName,
    trustLevel: columns.trustLevel,
  };
}
