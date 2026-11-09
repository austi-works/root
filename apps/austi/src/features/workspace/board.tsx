import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { channelLabels } from '#/features/drafts/labels';
import type { Doc } from '#convex/_generated/dataModel';

export function Board({ children }: { children: ReactNode }) {
  return <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>{children}</div>;
}

function BoardColumn({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className='min-w-0 space-y-3'>
      <h3 className='flex items-baseline justify-between text-sm font-medium'>
        {title}
        <span className='font-normal text-muted-foreground tabular-nums'>{total}</span>
      </h3>
      <ul className='divide-y border-t'>{children}</ul>
    </section>
  );
}

function BoardCard({ draft }: { draft: Doc<'marketingDrafts'> }) {
  return (
    <li>
      <Link
        to='/review/$draftId'
        params={{ draftId: draft._id }}
        className='block py-3 hover:bg-accent/40'
      >
        <span className='line-clamp-2 font-medium'>{draft.headline}</span>
        <span className='block truncate text-sm text-muted-foreground'>
          {channelLabels[draft.channel]} · {draft.campaignName}
        </span>
      </Link>
    </li>
  );
}

function BoardEmpty() {
  return <li className='py-3 text-sm text-muted-foreground'>Nothing here</li>;
}

Board.Column = BoardColumn;
Board.Card = BoardCard;
Board.Empty = BoardEmpty;
