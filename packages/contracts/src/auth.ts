import { z } from 'zod';

/**
 * Global role. `guest` is deliberately absent: not being signed in is the
 * absence of a user, not a value one can hold. `organizer` is likewise absent —
 * it is a per-event relationship, not a global permission.
 */
export const UserRole = z.enum(['member', 'curator', 'moderator', 'admin', 'super_admin']);
export type UserRoleT = z.infer<typeof UserRole>;

export const UserStatus = z.enum([
  'pending',
  'active',
  'suspended',
  'deactivated',
  'deleted',
]);
export type UserStatusT = z.infer<typeof UserStatus>;

/**
 * Password rule: length only.
 *
 * Composition rules ("one symbol, one digit") push people toward `Passw0rd!`
 * and no further; length is what actually costs an attacker. Twelve is the
 * floor, and the top bound exists so a megabyte of text cannot be sent to the
 * hasher.
 */
export const Password = z.string().min(12).max(200);

export const RegisterRequest = z.object({
  email: z.email().max(254),
  password: Password,
  displayName: z.string().trim().min(1).max(60),
  /** Public URL segment. Lowercase so two handles cannot differ only by case. */
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, { error: 'errors.auth.handleFormat' }),
  locale: z.enum(['en', 'vi']).default('en'),
});
export type RegisterRequestT = z.infer<typeof RegisterRequest>;

/**
 * Sign-in credential.
 *
 * One field for three things a member may remember: their email, their handle,
 * or their phone number. Which one it is is decided server-side; asking the
 * member to pick first is a question they should not have to answer.
 */
export const LoginRequest = z.object({
  identifier: z.string().trim().min(1).max(254),
  /** Not `Password`: an old account may predate the current minimum length. */
  password: z.string().min(1).max(200),
});
export type LoginRequestT = z.infer<typeof LoginRequest>;

/**
 * The signed-in user as the client needs to know them.
 *
 * `email` appears here because this is the account holder reading their own
 * record. It never appears in any other response — see PublicProfileResponse.
 */
export const SessionUserResponse = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
  emailVerified: z.boolean(),
  phone: z.string().nullable(),
  phoneVerified: z.boolean(),
  role: UserRole,
  trustLevel: z.number().int().min(0).max(5),
  status: UserStatus,
  locale: z.enum(['en', 'vi']),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
});
export type SessionUserResponseT = z.infer<typeof SessionUserResponse>;

/**
 * What a successful sign-in returns.
 *
 * The refresh token is absent on purpose: it travels as an httpOnly cookie so
 * no script on the page can read it. The access token is short-lived and is
 * meant to be held in memory, never written to storage.
 */
export const AuthSessionResponse = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
  user: SessionUserResponse,
});
export type AuthSessionResponseT = z.infer<typeof AuthSessionResponse>;
