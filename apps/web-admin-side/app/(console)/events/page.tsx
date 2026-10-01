import { Suspense } from 'react';
import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../_components/require-role';
import { EventsScreen } from './_components/events-screen';

/**
 * Event directory. Restricted to `event.directory.view` (moderator, admin,
 * super_admin): `RequireRole` keeps other roles from rendering it or calling
 * the API, and the endpoint enforces the same rule with 403.
 */
export default function EventsPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('event.directory.view')}>
      {/* `useSearchParams` in the list hook needs a Suspense boundary at build. */}
      <Suspense fallback={null}>
        <EventsScreen />
      </Suspense>
    </RequireRole>
  );
}
