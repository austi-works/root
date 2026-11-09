import { createFileRoute } from '@tanstack/react-router';

import { CampaignsPage } from '#/features/campaigns/campaign-list';
import { queries } from '#/lib/queries';

export const Route = createFileRoute('/_app/campaigns/')({
  head: () => ({ meta: [{ title: 'Campaigns · Austi' }] }),
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(queries.campaigns);
  },
  component: CampaignsPage,
});
