'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MyProfileResponseT, PublicProfileResponseT } from '@dnc/contracts';

import { Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { useTranslate } from '../../../_components/locale-provider';
import { useAuth } from '../../../_components/auth-provider';
import { myProfile, publicProfile } from '../../../_lib/api';
import { ProfileView } from '../../_components/profile-view';

/**
 * The one profile screen, addressed by handle.
 *
 * Your own profile is not a separate route: it is this page at your own handle,
 * with the edit and sign-out controls added. Two screens rendering the same
 * person differed in small ways and drifted; one screen cannot.
 *
 * Readable without an account, because a profile link shared into a group chat
 * has to work for the person who has not signed up yet — that is how they find
 * out this community exists.
 */
export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const t = useTranslate();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [profile, setProfile] = useState<PublicProfileResponseT | MyProfileResponseT | null>(
    null,
  );
  const [missing, setMissing] = useState(false);

  const isOwner = user !== null && user.handle === handle;

  useEffect(() => {
    // Wait for the session to settle: asking too early would fetch the public
    // shape for your own page and hide the edit button from you.
    if (loading) return;

    let cancelled = false;
    setMissing(false);
    // The owner's endpoint carries the private fields the editor needs; the
    // public one is what everyone else is allowed to see.
    const request = isOwner ? myProfile() : publicProfile(handle);
    request
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handle, isOwner, loading]);

  const handleUpdated = useCallback(
    (updated: MyProfileResponseT) => {
      setProfile(updated);
      // The handle can change with an edit; keep the URL pointing at the person.
      if (updated.handle !== handle) router.replace(`/u/${updated.handle}`);
    },
    [handle, router],
  );

  if (missing) {
    return (
      <div className="px-4 py-6 md:px-0 md:py-8">
        <Card padding="lg">
          <EmptyState
            icon={<span className="text-4xl">🔍</span>}
            title={t('profile.missing.title')}
            description={t('profile.missing.body')}
          />
        </Card>
      </div>
    );
  }

  if (loading || profile === null) {
    return (
      <div className="px-4 py-6 md:px-0 md:py-8">
        <Card padding="lg">
          <SkeletonText lines={4} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-0 md:py-8">
      <ProfileView profile={profile} isOwner={isOwner} onUpdated={handleUpdated} />
      {isOwner && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={() => {
              void signOut().then(() => router.push('/'));
            }}
          >
            {t('auth.action.signOut')}
          </Button>
        </div>
      )}
    </div>
  );
}
