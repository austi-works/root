import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/ui/button';

import { Page } from '#/components/page';
import { CampaignList } from '#/features/campaigns/campaign-list';
import { statusLabels } from '#/features/drafts/labels';
import { Board } from '#/features/workspace/board';
import { queries } from '#/lib/queries';

export function WorkspaceHome() {
  const { data: workspace } = useSuspenseQuery(queries.workspace);
  const {
    data: { campaigns, columns },
  } = useSuspenseQuery(queries.overview);

  return (
    <Page>
      <Page.Header title={workspace?.name ?? 'Workspace'}>
        <Button nativeButton={false} render={<Link to='/campaigns/new' />}>
          New campaign
        </Button>
      </Page.Header>

      {workspace?.learnStatus === 'learning' && (
        <Page.Notice>Austi is reading your website and learning your brand…</Page.Notice>
      )}

      {campaigns.length ? (
        <>
          <Page.Section title='Drafts'>
            <Board>
              {columns.map(({ status, total, drafts }) => (
                <Board.Column key={status} title={statusLabels[status]} total={total}>
                  {drafts.length ? (
                    drafts.map((draft) => <Board.Card key={draft._id} draft={draft} />)
                  ) : (
                    <Board.Empty />
                  )}
                </Board.Column>
              ))}
            </Board>
          </Page.Section>
          <Page.Section title='Recent campaigns'>
            <CampaignList campaigns={campaigns} />
          </Page.Section>
        </>
      ) : (
        <Page.Empty title='Start with one idea. Austi will turn it into drafts for every channel.'>
          <Button nativeButton={false} render={<Link to='/campaigns/new' />}>
            Create your first campaign
          </Button>
        </Page.Empty>
      )}
    </Page>
  );
}
