import { NO_VALUE } from '../../../_components/labels/format';
import type { MessageKey, Translate } from '../../../_lib/i18n';

/** Label for an API string that may be outside the known set; an unknown value reads as a dash, never a raw code. */
export function labelFor(
  map: Readonly<Record<string, MessageKey>>,
  value: string,
  t: Translate,
): string {
  const key = map[value];
  return key === undefined ? NO_VALUE : t(key);
}

/** Why a session was revoked: the codes the auth module writes to `auth_sessions.revoked_reason`. */
export const REVOKED_REASON_KEY: Readonly<Record<string, MessageKey>> = {
  rotation: 'admin.users.detail.session.revoked.rotation',
  rotation_reuse: 'admin.users.detail.session.revoked.rotation_reuse',
  logout: 'admin.users.detail.session.revoked.logout',
  suspended: 'admin.users.detail.session.revoked.suspended',
  role_changed: 'admin.users.detail.session.revoked.role_changed',
};

export const SIGNAL_TYPE_KEY: Readonly<Record<string, MessageKey>> = {
  email_verified: 'admin.users.detail.signal.type.email_verified',
  phone_verified: 'admin.users.detail.signal.type.phone_verified',
  social_google: 'admin.users.detail.signal.type.social_google',
  social_facebook: 'admin.users.detail.signal.type.social_facebook',
  social_apple: 'admin.users.detail.signal.type.social_apple',
  id_document: 'admin.users.detail.signal.type.id_document',
  profile_completed: 'admin.users.detail.signal.type.profile_completed',
  attended_event: 'admin.users.detail.signal.type.attended_event',
  hosted_event_completed: 'admin.users.detail.signal.type.hosted_event_completed',
  positive_review: 'admin.users.detail.signal.type.positive_review',
  community_vouch: 'admin.users.detail.signal.type.community_vouch',
  staff_endorsement: 'admin.users.detail.signal.type.staff_endorsement',
  penalty_no_show: 'admin.users.detail.signal.type.penalty_no_show',
  penalty_report_upheld: 'admin.users.detail.signal.type.penalty_report_upheld',
};

export const SIGNAL_STATUS_KEY: Readonly<Record<string, MessageKey>> = {
  pending: 'admin.users.detail.signal.status.pending',
  verified: 'admin.users.detail.signal.status.verified',
  rejected: 'admin.users.detail.signal.status.rejected',
  expired: 'admin.users.detail.signal.status.expired',
  revoked: 'admin.users.detail.signal.status.revoked',
};

export const EXPAT_KEY: Readonly<Record<string, MessageKey>> = {
  digital_nomad: 'admin.users.detail.expat.digital_nomad',
  long_term_resident: 'admin.users.detail.expat.long_term_resident',
  student: 'admin.users.detail.expat.student',
  teacher: 'admin.users.detail.expat.teacher',
  business_owner: 'admin.users.detail.expat.business_owner',
  short_stay: 'admin.users.detail.expat.short_stay',
  local_host: 'admin.users.detail.expat.local_host',
};

export const POST_STATUS_KEY: Readonly<Record<string, MessageKey>> = {
  visible: 'admin.users.detail.postStatus.visible',
  pending_review: 'admin.users.detail.postStatus.pending_review',
  hidden: 'admin.users.detail.postStatus.hidden',
  removed: 'admin.users.detail.postStatus.removed',
};

export const PLATFORM_KEY: Readonly<Record<string, MessageKey>> = {
  ios: 'admin.users.detail.platform.ios',
  android: 'admin.users.detail.platform.android',
  web: 'admin.users.detail.platform.web',
};

export const POST_KIND_KEY: Readonly<Record<string, MessageKey>> = {
  question: 'post.kind.question',
  recommendation: 'post.kind.recommendation',
  notice: 'post.kind.notice',
  looking_for: 'post.kind.lookingFor',
};

export const RSVP_STATUS_KEY: Readonly<Record<string, MessageKey>> = {
  confirmed: 'admin.events.detail.counts.confirmed',
  held: 'admin.events.detail.counts.held',
  waitlisted: 'admin.events.detail.counts.waitlisted',
  cancelled: 'admin.events.detail.counts.cancelled',
  attended: 'admin.events.detail.counts.attended',
  no_show: 'admin.events.detail.counts.noShow',
};

export const VISIBILITY_KEY: Readonly<Record<string, MessageKey>> = {
  public: 'profile.visibility.public',
  members_only: 'profile.visibility.members_only',
  private: 'profile.visibility.private',
};

export const LOCALE_KEY: Readonly<Record<string, MessageKey>> = {
  en: 'profile.language.en',
  vi: 'profile.language.vi',
};
