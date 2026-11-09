import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { channelLabels, StatusBadge } from '#/features/drafts/labels';
import type { Doc } from '#convex/_generated/dataModel';

export function DraftList({ children }: { children: ReactNode }) {
  return <ul className='divide-y border-y'>{children}</ul>;
}

function DraftListItem({
  draft,
  showCampaign = false,
}: {
  draft: Doc<'marketingDrafts'>;
  showCampaign?: boolean;
}) {
  return (
    <li>
      <Link
        to='/review/$draftId'
        params={{ draftId: draft._id }}
        className='flex items-center justify-between gap-4 py-3 hover:bg-accent/40'
      >
        <span className='min-w-0'>
          <span className='block truncate font-medium'>{draft.headline}</span>
          {showCampaign && (
            <span className='block truncate text-sm text-muted-foreground'>
              {channelLabels[draft.channel]} · {draft.campaignName}
            </span>
          )}
        </span>
        <StatusBadge status={draft.status} />
      </Link>
    </li>
  );
}

DraftList.Item = DraftListItem;
