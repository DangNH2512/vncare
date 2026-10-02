'use client';

import { useEffect, useRef, useState } from 'react';

import { FollowButton } from '../../../_components/follow-button';

export interface ProfileFollowActionProps {
  userId: string;
  displayName: string;
  /** What the profile response said for the current viewer. */
  serverFollowing: boolean;
}

/**
 * Follow button with the state a profile page needs around it.
 *
 * The parent keys this by viewer scope and profile, so nothing here survives a
 * sign-out or a move to another member. Until the member taps, the server value
 * wins (the profile is refetched after sign-in); after a tap, the member's own
 * state wins so a late refetch cannot overwrite it.
 */
export function ProfileFollowAction({
  userId,
  displayName,
  serverFollowing,
}: ProfileFollowActionProps) {
  const [following, setFollowing] = useState(serverFollowing);
  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) setFollowing(serverFollowing);
  }, [serverFollowing]);

  return (
    <FollowButton
      userId={userId}
      displayName={displayName}
      following={following}
      onChange={(next) => {
        touched.current = true;
        setFollowing(next);
      }}
    />
  );
}
