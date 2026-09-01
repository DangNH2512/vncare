import { z } from 'zod';
import { MediaResponse } from './media';

export const ExpatType = z.enum([
  'digital_nomad',
  'long_term_resident',
  'student',
  'teacher',
  'business_owner',
  'short_stay',
  'local_host',
]);
export type ExpatTypeT = z.infer<typeof ExpatType>;

export const Gender = z.enum(['female', 'male', 'non_binary', 'prefer_not_to_say']);
export type GenderT = z.infer<typeof Gender>;

export const ProfileVisibility = z.enum(['public', 'members_only', 'private']);
export type ProfileVisibilityT = z.infer<typeof ProfileVisibility>;

export const SpokenLanguage = z.object({
  code: z.enum(['en', 'vi', 'ko', 'ja', 'zh', 'ru', 'fr', 'de', 'es', 'other']),
  level: z.enum(['basic', 'conversational', 'fluent', 'native']),
});
export type SpokenLanguageT = z.infer<typeof SpokenLanguage>;

/**
 * A profile as anyone may see it.
 *
 * Declared field by field rather than derived from the owner's view by
 * omission. At a privacy boundary an allow-list fails closed: a column added to
 * the owner's shape stays invisible here until someone adds it deliberately,
 * whereas an omit-list would publish it the moment they forget.
 *
 * Absent by design: email, phone, birth year, gender, exact counts of no-shows,
 * and the raw trust points. Trust reaches the reader as the ladder level only.
 */
export const PublicProfileResponse = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: MediaResponse.nullable(),
  nationalityCode: z.string().length(2).nullable(),
  spokenLanguages: z.array(SpokenLanguage),
  expatType: ExpatType.nullable(),
  /** Null when the member chose not to show their area publicly. */
  homeAreaId: z.uuid().nullable(),
  inDaNangSince: z.string().nullable(),
  trustLevel: z.number().int().min(0).max(5),
  eventsHostedCount: z.number().int().nonnegative(),
  eventsAttendedCount: z.number().int().nonnegative(),
  /** Withheld until there are enough ratings for an average to mean anything. */
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int().nonnegative(),
  memberSince: z.iso.datetime(),
});
export type PublicProfileResponseT = z.infer<typeof PublicProfileResponse>;

/** The owner's own view: the public shape plus what only they may read. */
export const MyProfileResponse = PublicProfileResponse.extend({
  email: z.email().nullable(),
  emailVerified: z.boolean(),
  birthYear: z.number().int().nullable(),
  gender: Gender.nullable(),
  visibility: ProfileVisibility,
  showAreaPublicly: z.boolean(),
  locale: z.enum(['en', 'vi']),
});
export type MyProfileResponseT = z.infer<typeof MyProfileResponse>;

export const ProfileUpdateRequest = z
  .object({
    displayName: z.string().trim().min(1).max(60),
    headline: z.string().trim().max(120).nullable(),
    bio: z.string().trim().max(1000).nullable(),
    bioLocale: z.enum(['en', 'vi']).nullable(),
    avatarMediaId: z.uuid().nullable(),
    nationalityCode: z.string().length(2).nullable(),
    spokenLanguages: z.array(SpokenLanguage).max(10),
    expatType: ExpatType.nullable(),
    homeAreaId: z.uuid().nullable(),
    inDaNangSince: z.iso.date().nullable(),
    birthYear: z.number().int().min(1900).max(2100).nullable(),
    gender: Gender.nullable(),
    visibility: ProfileVisibility,
    showAreaPublicly: z.boolean(),
  })
  .partial();
export type ProfileUpdateRequestT = z.infer<typeof ProfileUpdateRequest>;
