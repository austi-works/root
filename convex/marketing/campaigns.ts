import { ConvexError, v } from 'convex/values';

import { internal } from '#convex/_generated/api';
import { mutation, query } from '#convex/_generated/server';
import {
  optionalText,
  requireCampaign,
  requireText,
  requireWorkspace,
  reserveGeneration,
} from '#convex/marketing/access';
import { orderedChannels } from '#convex/marketing/ai';
import { channelValidator } from '#convex/marketing/validators';

const STALE_GENERATION_MS = 10 * 60 * 1000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    return ctx.db
      .query('marketingCampaigns')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspace._id))
      .order('desc')
      .take(100);
  },
});

export const get = query({
  args: { campaignId: v.id('marketingCampaigns') },
  handler: async (ctx, { campaignId }) => {
    const { campaign } = await requireCampaign(ctx, campaignId);
    const drafts = await ctx.db
      .query('marketingDrafts')
      .withIndex('by_campaignId', (q) => q.eq('campaignId', campaignId))
      .take(50);
    return { campaign, drafts };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    idea: v.string(),
    offer: v.string(),
    audience: v.string(),
    channels: v.array(channelValidator),
  },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    const channels = orderedChannels(args.channels);
    if (!channels.length) throw new ConvexError('Choose at least one channel.');
    await reserveGeneration(ctx, workspace._id, 'campaign');

    const campaignId = await ctx.db.insert('marketingCampaigns', {
      workspaceId: workspace._id,
      name: requireText(args.name, 'Campaign name', 120),
      idea: requireText(args.idea, 'Campaign idea', 1200),
      offer: optionalText(args.offer, 'Offer', 400),
      audience: optionalText(args.audience, 'Audience', 400),
      channels,
      angles: [],
      status: 'generating',
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.marketing.generation.generateCampaign, { campaignId });
    return campaignId;
  },
});

export const retry = mutation({
  args: { campaignId: v.id('marketingCampaigns') },
  handler: async (ctx, { campaignId }) => {
    const { workspace, campaign } = await requireCampaign(ctx, campaignId);
    const stuck =
      campaign.status === 'generating' && Date.now() - campaign.updatedAt > STALE_GENERATION_MS;
    if (campaign.status !== 'failed' && !stuck)
      throw new ConvexError('This campaign is not stuck.');
    await reserveGeneration(ctx, workspace._id, 'campaign');
    await ctx.db.patch(campaignId, {
      status: 'generating',
      generationError: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.marketing.generation.generateCampaign, { campaignId });
  },
});
