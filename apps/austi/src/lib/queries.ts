import { convexQuery } from '@convex-dev/react-query';

import { api } from '#convex/_generated/api';
import type { Id } from '#convex/_generated/dataModel';

export type CampaignId = Id<'marketingCampaigns'>;
export type DraftId = Id<'marketingDrafts'>;

export const queries = {
  workspace: convexQuery(api.marketing.workspaces.get, {}),
  overview: convexQuery(api.marketing.workspaces.overview, {}),
  products: convexQuery(api.marketing.products.list, {}),
  campaigns: convexQuery(api.marketing.campaigns.list, {}),
  campaign: (campaignId: CampaignId) => convexQuery(api.marketing.campaigns.get, { campaignId }),
  reviewQueue: convexQuery(api.marketing.drafts.queue, {}),
  draft: (draftId: DraftId) => convexQuery(api.marketing.drafts.get, { draftId }),
};
