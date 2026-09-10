'use client';

import { useState } from 'react';
import type { MyProfileResponseT, PublicProfileResponseT } from '@dnc/contracts';
import { nextTrustRequirement } from '@dnc/domain';

import { Avatar, Badge, Button, Card, TrustBadge } from '../../_components/ui';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { areaName, findAreaById } from '../../_lib/areas';
import { formatEventDate } from '../../_lib/datetime';
import { cn } from '../../_lib/cn';
import { ProfileEditor } from './profile-editor';

export interface ProfileViewProps {
  profile: PublicProfileResponseT | MyProfileResponseT;
  /** True when the viewer owns this profile, which is what unlocks editing. */
  isOwner: boolean;
  onUpdated?: (profile: MyProfileResponseT) => void;
}

function isMine(
  profile: PublicProfileResponseT | MyProfileResponseT,
): profile is MyProfileResponseT {
  return 'visibility' in profile;
}

/**
 * A member's page.
 *
 * The same component for your own profile and someone else's: the difference is
 * an edit button and a few extra fields the API already decided you may see.
 * Two components would drift, and the private fields would end up rendered from
 * the wrong shape.
 */
export function ProfileView({ profile, isOwner, onUpdated }: ProfileViewProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const [editing, setEditing] = useState(false);

  const area = profile.homeAreaId === null ? undefined : findAreaById(profile.homeAreaId);
  const mine = isMine(profile);

  if (editing && mine) {
    return (
      <ProfileEditor
        profile={profile}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          onUpdated?.(updated);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The header runs edge to edge and the avatar breaks out of it: a page
          that opens with a rectangle of text reads as a database record, not a
          person. */}
      <Card padding="none" className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-accent-subtle to-accent-line sm:h-32" />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <div className="rounded-full border-4 border-surface">
              <Avatar
                name={profile.displayName}
                size="lg"
                {...(profile.avatar === null ? {} : { src: profile.avatar.url })}
              />
            </div>
            {isOwner && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                {t('profile.action.edit')}
              </Button>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-fg">{profile.displayName}</h1>
              <TrustBadge level={profile.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} />
            </div>
            <p className="text-sm text-fg-muted">@{profile.handle}</p>
            {profile.headline !== null && (
              <p className="mt-2 text-md text-fg">{profile.headline}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            {area !== undefined && <span>📍 {areaName(area, locale)}</span>}
            {profile.nationalityCode !== null && <span>🌐 {profile.nationalityCode}</span>}
            {profile.inDaNangSince !== null && (
              <span>
                {t('profile.field.since', {
                  date: formatEventDate(`${profile.inDaNangSince}T00:00:00.000Z`, locale),
                })}
              </span>
            )}
            <span>
              {t('profile.field.memberSince', {
                date: formatEventDate(profile.memberSince, locale),
              })}
            </span>
          </div>

          {profile.spokenLanguages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.spokenLanguages.map((language) => (
                <Badge key={language.code} tone="neutral">
                  {t(`profile.language.${language.code}` as never)} ·{' '}
                  {t(`profile.level.${language.level}` as never)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Counts sit in their own row with weight contrast: the number is the
          content, the label is a caption. */}
      <Card padding="md">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {(
            [
              ['profile.stat.hosted', profile.eventsHostedCount],
              ['profile.stat.attended', profile.eventsAttendedCount],
              ['profile.stat.rating', profile.ratingAvg],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dd className="text-2xl font-bold text-fg">
                {value === null ? '—' : typeof value === 'number' ? value : value}
              </dd>
              <dt className="text-xs font-light tracking-wide text-fg-muted uppercase">
                {t(key)}
              </dt>
            </div>
          ))}
        </dl>
      </Card>

      {profile.bio !== null && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-fg">{t('profile.section.about')}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-md text-fg">{profile.bio}</p>
        </Card>
      )}

      {isOwner && mine && <TrustProgress profile={profile} />}
    </div>
  );
}

/**
 * What the owner still needs for the next rung of the ladder.
 *
 * Only shown to the owner: a trust level is public, but the list of what
 * someone has not done yet is not — it reads as a list of their shortcomings.
 */
function TrustProgress({ profile }: { profile: MyProfileResponseT }) {
  const t = useTranslate();
  const requirement = nextTrustRequirement(
    {
      hasVerifiedContact: profile.emailVerified,
      accountAgeDays: Math.floor(
        (Date.now() - new Date(profile.memberSince).getTime()) / 86_400_000,
      ),
      attendedCount: profile.eventsAttendedCount,
      hostedCount: profile.eventsHostedCount,
      // Not exposed to the owner and not needed to describe the next rung; the
      // recompute job owns both.
      noShowCount: 0,
      upheldReportsAgainst: 0,
    },
    // The stored level, not one recomputed here: the badge above reads from the
    // same number, and two answers on one screen is worse than either.
    profile.trustLevel,
  );

  if (requirement.nextLevel === null) return null;

  return (
    <Card padding="md">
      <h2 className="text-sm font-semibold text-fg">
        {t('profile.trust.next', { level: requirement.nextLevel })}
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {requirement.missingKeys.map((key) => (
          <li key={key} className={cn('flex items-start gap-2 text-sm text-fg-muted')}>
            <span aria-hidden className="mt-0.5 text-accent-text">
              ○
            </span>
            {t(key as never)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
