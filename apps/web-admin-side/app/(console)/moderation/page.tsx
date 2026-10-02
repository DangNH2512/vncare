import { Suspense } from 'react';
import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../_components/require-role';
import { ModerationScreen } from './_components/moderation-screen';

/**
 * Moderation queue. Restricted to `moderation.queue.view` (moderator, admin,
 * super_admin): `RequireRole` keeps other roles from rendering it or calling
 * the API, and the endpoint enforces the same rule with 403.
 */
export default function ModerationPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('moderation.queue.view')}>
      {/* `useSearchParams` in the list hook needs a Suspense boundary at build. */}
      <Suspense fallback={null}>
        <ModerationScreen />
      </Suspense>
    </RequireRole>
  );
}
