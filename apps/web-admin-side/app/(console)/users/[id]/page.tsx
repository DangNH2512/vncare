import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../../_components/require-role';
import { UserDetailScreen } from '../_components/user-detail-screen';

/** Read-only user detail; same role gate as the directory (`user.directory.view`). */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole allowedRoles={allowedRolesFor('user.directory.view')}>
      <UserDetailScreen id={id} />
    </RequireRole>
  );
}
