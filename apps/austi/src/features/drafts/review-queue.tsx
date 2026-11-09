import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/ui/button';

import { Page } from '#/components/page';
import { DraftList } from '#/features/drafts/draft-list';
import { queries } from '#/lib/queries';

export function ReviewQueue() {
  const { data: drafts } = useSuspenseQuery(queries.reviewQueue);

  return (
    <Page>
      <Page.Header
        title='Review'
        description='Nothing is approved until you say so. Read each draft, then approve, hold or ask for changes.'
      />
      {drafts.length ? (
        <DraftList>
          {drafts.map((draft) => (
            <DraftList.Item key={draft._id} draft={draft} showCampaign />
          ))}
        </DraftList>
      ) : (
        <Page.Empty title='Nothing is waiting for your review.'>
          <Button nativeButton={false} render={<Link to='/campaigns/new' />}>
            New campaign
          </Button>
        </Page.Empty>
      )}
    </Page>
  );
}
