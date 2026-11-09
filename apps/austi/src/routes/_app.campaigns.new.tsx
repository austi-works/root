import { createFileRoute } from '@tanstack/react-router';

import { CampaignForm } from '#/features/campaigns/campaign-form';

export const Route = createFileRoute('/_app/campaigns/new')({
  staticData: { breadcrumb: 'New campaign' },
  head: () => ({ meta: [{ title: 'New campaign · Austi' }] }),
  component: CampaignForm,
});
