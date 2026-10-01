import { Suspense } from 'react';
import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../_components/require-role';
import { AuditScreen } from './_components/audit-screen';

/**
 * Audit log viewer. Restricted to `audit_log.view` (moderator, admin,
 * super_admin). `RequireRole` keeps other roles from rendering it or calling
 * the API; the endpoint enforces the same rule with 403 and filters the rows
 * by role itself. Read-only: nothing here edits or deletes a record.
 */
export default function AuditLogPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('audit_log.view')}>
      {/* `useSearchParams` in the list hook needs a Suspense boundary at build. */}
      <Suspense fallback={null}>
        <AuditScreen />
      </Suspense>
    </RequireRole>
  );
}
