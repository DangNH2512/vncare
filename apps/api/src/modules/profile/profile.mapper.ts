import type {
  MediaResponseT,
  MyProfileResponseT,
  PublicProfileResponseT,
} from '@dnc/contracts';
import type { ProfileRow } from './profile.repository.js';

/** Ratings mean nothing below this many; showing "5.0 from one review" is noise. */
const MIN_RATINGS_TO_SHOW = 3;

/**
 * The shape any reader may see.
 *
 * `homeAreaId` is withheld when the member turned off public area display, and
 * the rating average is withheld until it is based on enough reviews.
 */
export function toPublicProfile(
  row: ProfileRow,
  avatar: MediaResponseT | null,
): PublicProfileResponseT {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    avatar,
    nationalityCode: row.nationality_code,
    spokenLanguages: row.spoken_languages,
    expatType: row.expat_type,
    homeAreaId: row.show_area_publicly ? row.home_area_id : null,
    inDaNangSince: row.in_da_nang_since?.toISOString().slice(0, 10) ?? null,
    trustLevel: row.trust_level,
    eventsHostedCount: row.events_hosted_count,
    eventsAttendedCount: row.events_attended_count,
    ratingAvg:
      row.rating_count >= MIN_RATINGS_TO_SHOW && row.rating_avg !== null
        ? Number(row.rating_avg)
        : null,
    ratingCount: row.rating_count,
    memberSince: row.member_since.toISOString(),
  };
}

/**
 * The owner's own view.
 *
 * Built on top of the public shape rather than beside it, so the two can never
 * disagree about a shared field; the private additions are listed explicitly.
 */
export function toMyProfile(
  row: ProfileRow,
  avatar: MediaResponseT | null,
): MyProfileResponseT {
  return {
    ...toPublicProfile(row, avatar),
    // The owner always sees their own area, whatever the public setting says.
    homeAreaId: row.home_area_id,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    birthYear: row.birth_year,
    gender: row.gender,
    visibility: row.visibility,
    showAreaPublicly: row.show_area_publicly,
    locale: row.locale,
  };
}
