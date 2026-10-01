import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../../_components/require-role';
import { EventDetailScreen } from '../_components/event-detail-screen';

/** Read-only event detail; same role gate as the directory (`event.directory.view`). */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole allowedRoles={allowedRolesFor('event.directory.view')}>
      <EventDetailScreen id={id} />
    </RequireRole>
  );
}
