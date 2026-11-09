import { createFileRoute } from '@tanstack/react-router';

import { CampaignDetail } from '#/features/campaigns/campaign-detail';
import { queries, type CampaignId } from '#/lib/queries';

export const Route = createFileRoute('/_app/campaigns/$campaignId')({
  staticData: { breadcrumb: 'Campaign' },
  head: () => ({ meta: [{ title: 'Campaign · Austi' }] }),
  beforeLoad: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(queries.campaign(params.campaignId as CampaignId));
  },
  component: CampaignRoute,
});

function CampaignRoute() {
  const { campaignId } = Route.useParams();
  return <CampaignDetail campaignId={campaignId as CampaignId} />;
}
