import { z } from 'zod';
import { cursorPage } from './common';
import { UserRole, UserStatus } from './auth';
import { EventStatus } from './event';
import { ExpatType, ProfileVisibility } from './profile';
import { PostKind } from './post';
import { RsvpStatus } from './rsvp';

/** Default and maximum page size of the admin user directory. */
export const ADMIN_USER_LIST_DEFAULT_LIMIT = 25;
export const ADMIN_USER_LIST_MAX_LIMIT = 100;

/** Splits `a,b` into `['a','b']`; arrays and undefined pass through. */
const csv = (value: unknown) =>
  typeof value === 'string' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value;

/** True when instant `a` is strictly earlier than `b` (compares time, not text). */
const before = (a: string, b: string) => Date.parse(a) < Date.parse(b);

/** True when the text carries no control character (NUL, C0, DEL, C1). */
export function hasNoControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return false;
  }
  return true;
}

/** Years every admin date filter accepts; the API cursor codec uses the same bounds. */
export const ADMIN_MIN_YEAR = 1970;
export const ADMIN_MAX_YEAR = 2200;

/** ISO instant inside the supported years: earlier ones overflow Postgres casts. */
export const queryInstant = z.iso.datetime().refine((value) => {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return false;
  const year = new Date(ms).getUTCFullYear();
  return year >= ADMIN_MIN_YEAR && year <= ADMIN_MAX_YEAR;
});

/** Query-string booleans arrive as text; anything but true/false is rejected. */
const queryBool = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);

/** Masked phone as produced by the server: `*** *** 123`. */
const PHONE_MASKED = /^\*{3} \*{3} \d{3}$/;

export const AdminUserSort = z.enum(['createdAt', 'lastActiveAt', 'trustLevel', 'handle']);
export type AdminUserSortT = z.infer<typeof AdminUserSort>;

export const AdminSortDirection = z.enum(['asc', 'desc']);
export type AdminSortDirectionT = z.infer<typeof AdminSortDirection>;

/**
 * Query of `GET /admin/users`. Strict: an unknown parameter is an error, not
 * silently ignored. Array filters accept CSV (`role=moderator,admin`).
 */
export const AdminUserListQuery = z
  .strictObject({
    q: z.string().trim().min(2).max(100).refine(hasNoControlChars).optional(),
    role: z.preprocess(csv, z.array(UserRole).min(1)).optional(),
    status: z.preprocess(csv, z.array(UserStatus).min(1)).optional(),
    trustMin: z.coerce.number().int().min(0).max(5).optional(),
    trustMax: z.coerce.number().int().min(0).max(5).optional(),
    joinedFrom: queryInstant.optional(),
    joinedTo: queryInstant.optional(),
    includeDeleted: queryBool.default(false),
    sort: AdminUserSort.default('createdAt'),
    dir: AdminSortDirection.default('desc'),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ADMIN_USER_LIST_MAX_LIMIT)
      .default(ADMIN_USER_LIST_DEFAULT_LIMIT),
  })
  .refine((q) => q.trustMin === undefined || q.trustMax === undefined || q.trustMin <= q.trustMax, {
    path: ['trustMin'],
    message: 'trustMin must not exceed trustMax',
  })
  .refine((q) => !q.joinedFrom || !q.joinedTo || before(q.joinedFrom, q.joinedTo), {
    path: ['joinedFrom'],
    message: 'joinedFrom must be before joinedTo',
  });
export type AdminUserListQueryT = z.infer<typeof AdminUserListQuery>;

/**
 * One directory row. Email and phone are masked by the server
 * (`a***@domain`, `*** *** 123`); the raw values never reach this contract.
 */
export const AdminUserListItem = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: UserRole,
  status: UserStatus,
  trustLevel: z.number().int().min(0).max(5),
  /** Null when the account has no email (phone-only or social sign-up). */
  emailMasked: z.string().regex(/^.\*{3}@.+$/).nullable(),
  emailVerified: z.boolean(),
  phoneMasked: z.string().regex(PHONE_MASKED).nullable(),
  phoneVerified: z.boolean(),
  createdAt: z.iso.datetime(),
  lastActiveAt: z.iso.datetime().nullable(),
  /** True for soft-deleted or anonymized accounts (only with `includeDeleted`). */
  deleted: z.boolean(),
});
export type AdminUserListItemT = z.infer<typeof AdminUserListItem>;

export const AdminUserListResponse = cursorPage(AdminUserListItem);
export type AdminUserListResponseT = z.infer<typeof AdminUserListResponse>;

/** A list block of the detail page: the newest items plus the full count. */
const block = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int().nonnegative() });

/** D-U7: profile block. No birthYear, no gender. */
export const AdminUserProfileBlock = z.object({
  handle: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  /** Truncated to 500 characters by the server. */
  bio: z.string().max(500).nullable(),
  nationalityCode: z.string().length(2).nullable(),
  expatType: ExpatType.nullable(),
  homeAreaId: z.uuid().nullable(),
  inDaNangSince: z.string().nullable(),
  visibility: ProfileVisibility,
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastActiveAt: z.iso.datetime().nullable(),
});
export type AdminUserProfileBlockT = z.infer<typeof AdminUserProfileBlock>;

/** D-U8: account block. Masked contact data only; legal hold is a date, not a reason. */
export const AdminUserAccountBlock = z.object({
  role: UserRole,
  status: UserStatus,
  suspendedUntil: z.iso.datetime().nullable(),
  suspensionReason: z.string().nullable(),
  /** Null when the account has no email (phone-only or social sign-up). */
  emailMasked: z.string().regex(/^.\*{3}@.+$/).nullable(),
  emailVerified: z.boolean(),
  phoneMasked: z.string().regex(PHONE_MASKED).nullable(),
  phoneVerified: z.boolean(),
  locale: z.enum(['en', 'vi']),
  deletionRequestedAt: z.iso.datetime().nullable(),
  anonymizedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
  legalHoldUntil: z.iso.datetime().nullable(),
});
export type AdminUserAccountBlockT = z.infer<typeof AdminUserAccountBlock>;

/** D-U9: one trust signal. No metadata, evidence reference or issuer. */
export const AdminUserTrustSignal = z.object({
  type: z.string(),
  status: z.string(),
  weight: z.number(),
  verifiedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
});
export type AdminUserTrustSignalT = z.infer<typeof AdminUserTrustSignal>;

export const AdminUserTrustBlock = z.object({
  trustLevel: z.number().int().min(0).max(5),
  trustLevelChangedAt: z.iso.datetime().nullable(),
  /** Newest 20 signals. */
  signals: z.array(AdminUserTrustSignal).max(20),
  eventsHostedCount: z.number().int().nonnegative(),
  eventsAttendedCount: z.number().int().nonnegative(),
  noShowCount: z.number().int().nonnegative(),
});
export type AdminUserTrustBlockT = z.infer<typeof AdminUserTrustBlock>;

/** D-U10 (a): hosted event, drafts excluded. */
export const AdminUserHostedEvent = z.object({
  id: z.uuid(),
  title: z.string(),
  status: EventStatus,
  /** Nearest upcoming start, else latest past one; null when no live occurrence remains. */
  startsAt: z.iso.datetime().nullable(),
});
export type AdminUserHostedEventT = z.infer<typeof AdminUserHostedEvent>;

/** D-U10 (b): RSVP of the user, RSVPs on draft events excluded. */
export const AdminUserRsvp = z.object({
  eventId: z.uuid(),
  eventTitle: z.string(),
  status: RsvpStatus,
  createdAt: z.iso.datetime(),
});
export type AdminUserRsvpT = z.infer<typeof AdminUserRsvp>;

/** D-U10 (c): post, hidden and removed included. */
export const AdminUserPost = z.object({
  id: z.uuid(),
  kind: PostKind,
  status: z.string(),
  createdAt: z.iso.datetime(),
  /** First 140 characters of the body. */
  excerpt: z.string().max(140),
});
export type AdminUserPostT = z.infer<typeof AdminUserPost>;

/** D-U11: one session. No IP, user agent, device id or token hash. */
export const AdminUserSession = z.object({
  platform: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().nullable(),
  revokedReason: z.string().nullable(),
});
export type AdminUserSessionT = z.infer<typeof AdminUserSession>;

export const AdminUserSessionsBlock = z.object({
  activeCount: z.number().int().nonnegative(),
  /** Newest 5 sessions. */
  recent: z.array(AdminUserSession).max(5),
});
export type AdminUserSessionsBlockT = z.infer<typeof AdminUserSessionsBlock>;

/**
 * `GET /admin/users/:id`. Every field is listed by hand; do not derive this
 * from a schema that carries email, phone, birthYear, gender or an IP.
 */
export const AdminUserDetailResponse = z.object({
  id: z.uuid(),
  profile: AdminUserProfileBlock,
  account: AdminUserAccountBlock,
  trust: AdminUserTrustBlock,
  hostedEvents: block(AdminUserHostedEvent),
  rsvps: block(AdminUserRsvp),
  posts: block(AdminUserPost),
  sessions: AdminUserSessionsBlock,
});
export type AdminUserDetailResponseT = z.infer<typeof AdminUserDetailResponse>;
