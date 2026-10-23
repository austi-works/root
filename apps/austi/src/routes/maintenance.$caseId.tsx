import { createFileRoute } from '@tanstack/react-router';
import { ErrorView } from '@workspace/ui/components/app/error-view';

import { CaseDetail } from '#/features/maintenance/case-detail';
import { Route as MaintenanceIndexRoute } from '#/routes/maintenance.index';
import type { Id } from '#convex/_generated/dataModel';

export const Route = createFileRoute('/maintenance/$caseId')({
  staticData: { breadcrumb: 'Case details' },
  head: () => ({ meta: [{ title: 'Maintenance case · Austi' }] }),
  component: MaintenanceCasePage,
  notFoundComponent: () => <ErrorView title='Case not found' backPath={MaintenanceIndexRoute.to} />,
});

function MaintenanceCasePage() {
  const { caseId } = Route.useParams();
  return <CaseDetail key={caseId} id={caseId as Id<'austiCases'>} />;
}
