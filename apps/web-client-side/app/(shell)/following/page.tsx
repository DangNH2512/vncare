'use client';

import { useAuth } from '../../_components/auth-provider';
import { useTranslate } from '../../_components/locale-provider';
import { Button, Card, EmptyState, SkeletonText } from '../../_components/ui';
import { FollowingList } from './_components/following-list';

/**
 * The people the signed-in member follows.
 *
 * Private by design: the list is only ever the viewer's own, so a guest gets
 * the sign-in prompt instead of an empty page, and there is no variant of
 * this route for reading someone else's follows.
 */
export default function FollowingPage() {
  const t = useTranslate();
  const { user, loading, requireAuth } = useAuth();

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-0 md:py-8">
      <h1 className="text-2xl font-bold text-fg">{t('profile.following.title')}</h1>
      {loading ? (
        <Card padding="lg">
          <SkeletonText lines={4} />
        </Card>
      ) : user === null ? (
        <Card padding="lg">
          <EmptyState
            icon={<span aria-hidden className="text-3xl">👥</span>}
            title={t('auth.prompt.title')}
            description={t('auth.prompt.body')}
            action={<Button onClick={() => requireAuth()}>{t('auth.action.signIn')}</Button>}
          />
        </Card>
      ) : (
        <FollowingList key={user.id} />
      )}
    </div>
  );
}
