import { createFileRoute } from '@tanstack/react-router';

import { ReviewQueue } from '#/features/drafts/review-queue';
import { queries } from '#/lib/queries';

export const Route = createFileRoute('/_app/review/')({
  head: () => ({ meta: [{ title: 'Review · Austi' }] }),
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(queries.reviewQueue);
  },
  component: ReviewQueue,
});
