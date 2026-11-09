import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@workspace/ui/components/ui/button';
import { useMutation } from 'convex/react';

import { Page } from '#/components/page';
import { DraftList } from '#/features/drafts/draft-list';
import { channelLabels } from '#/features/drafts/labels';
import { queries, type CampaignId } from '#/lib/queries';
import { useSubmit } from '#/lib/use-submit';
import { api } from '#convex/_generated/api';

export function CampaignDetail({ campaignId }: { campaignId: CampaignId }) {
  const {
    data: { campaign, drafts },
  } = useSuspenseQuery(queries.campaign(campaignId));
  const retry = useSubmit(useMutation(api.marketing.campaigns.retry));

  return (
    <Page>
      <Page.Header title={campaign.name} description={campaign.idea} />

      {campaign.status === 'generating' && (
        <Page.Notice>Austi is writing your drafts. They will appear here shortly…</Page.Notice>
      )}
      {campaign.status === 'failed' && (
        <div className='space-y-3'>
          <Page.Notice tone='danger'>{campaign.generationError}</Page.Notice>
          {retry.error && <Page.Notice tone='danger'>{retry.error}</Page.Notice>}
          <Button disabled={retry.pending} onClick={() => retry.submit({ campaignId })}>
            Try again
          </Button>
        </div>
      )}

      <dl className='grid max-w-2xl gap-4 sm:grid-cols-2'>
        <BriefItem label='Offer' value={campaign.offer || 'None'} />
        <BriefItem label='Who it is for' value={campaign.audience || 'Your brand audience'} />
      </dl>

      {campaign.angles.length > 0 && (
        <Page.Section title='Angles'>
          <ul className='max-w-2xl list-disc space-y-1 pl-5 text-muted-foreground'>
            {campaign.angles.map((angle) => (
              <li key={angle}>{angle}</li>
            ))}
          </ul>
        </Page.Section>
      )}

      {campaign.channels.map((channel) => {
        const channelDrafts = drafts.filter((draft) => draft.channel === channel);
        return channelDrafts.length ? (
          <Page.Section key={channel} title={channelLabels[channel]}>
            <DraftList>
              {channelDrafts.map((draft) => (
                <DraftList.Item key={draft._id} draft={draft} />
              ))}
            </DraftList>
          </Page.Section>
        ) : null;
      })}
    </Page>
  );
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-sm font-medium'>{label}</dt>
      <dd className='text-muted-foreground'>{value}</dd>
    </div>
  );
}
