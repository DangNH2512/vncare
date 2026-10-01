import { Suspense } from 'react';
import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../_components/require-role';
import { UsersScreen } from './_components/users-screen';

/**
 * User directory. Restricted to `user.directory.view` (admin, super_admin):
 * `RequireRole` keeps other roles from rendering it or calling the API, and the
 * endpoint enforces the same rule with 403.
 */
export default function UsersPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('user.directory.view')}>
      {/* `useSearchParams` in the list hook needs a Suspense boundary at build. */}
      <Suspense fallback={null}>
        <UsersScreen />
      </Suspense>
    </RequireRole>
  );
}
