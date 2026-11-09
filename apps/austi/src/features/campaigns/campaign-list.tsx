import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/ui/button';

import { Page } from '#/components/page';
import { queries } from '#/lib/queries';
import type { Doc } from '#convex/_generated/dataModel';

const campaignStates: Record<Doc<'marketingCampaigns'>['status'], string> = {
  generating: 'Writing drafts…',
  ready: 'Drafts ready',
  failed: 'Needs a retry',
};

export function CampaignList({ campaigns }: { campaigns: Doc<'marketingCampaigns'>[] }) {
  return (
    <ul className='divide-y border-y'>
      {campaigns.map((campaign) => (
        <li key={campaign._id}>
          <Link
            to='/campaigns/$campaignId'
            params={{ campaignId: campaign._id }}
            className='flex items-center justify-between gap-4 py-3 hover:bg-accent/40'
          >
            <span className='min-w-0'>
              <span className='block truncate font-medium'>{campaign.name}</span>
              <span className='block truncate text-sm text-muted-foreground'>{campaign.idea}</span>
            </span>
            <span className='shrink-0 text-sm text-muted-foreground'>
              {campaignStates[campaign.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CampaignsPage() {
  const { data: campaigns } = useSuspenseQuery(queries.campaigns);

  return (
    <Page>
      <Page.Header
        title='Campaigns'
        description='Each campaign is one idea carried across channels.'
      >
        <Button nativeButton={false} render={<Link to='/campaigns/new' />}>
          New campaign
        </Button>
      </Page.Header>
      {campaigns.length ? (
        <CampaignList campaigns={campaigns} />
      ) : (
        <Page.Empty title='You have no campaigns yet.' />
      )}
    </Page>
  );
}
