import { allowedRolesFor } from '@dnc/domain';

import { RequireRole } from '../../../_components/require-role';
import { CaseDetailScreen } from '../_components/case-detail-screen';

/** One case; same role gate as the queue (`moderation.queue.view`). */
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;
  return (
    <RequireRole allowedRoles={allowedRolesFor('moderation.queue.view')}>
      <CaseDetailScreen rawCaseNumber={caseNumber} />
    </RequireRole>
  );
}
