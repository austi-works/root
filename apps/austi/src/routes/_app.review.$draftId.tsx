import { createFileRoute } from '@tanstack/react-router';

import { ReviewDetail } from '#/features/drafts/review-detail';
import { queries, type DraftId } from '#/lib/queries';

export const Route = createFileRoute('/_app/review/$draftId')({
  staticData: { breadcrumb: 'Draft' },
  head: () => ({ meta: [{ title: 'Draft · Austi' }] }),
  beforeLoad: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(queries.draft(params.draftId as DraftId));
  },
  component: DraftRoute,
});

function DraftRoute() {
  const { draftId } = Route.useParams();
  return <ReviewDetail draftId={draftId as DraftId} />;
}
