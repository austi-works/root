import { v } from 'convex/values';

import { internalMutation, internalQuery } from '#convex/_generated/server';
import { channelValidator } from '#convex/marketing/validators';

const productFields = v.object({ name: v.string(), description: v.string() });
const draftFields = v.object({ channel: channelValidator, headline: v.string(), body: v.string() });

export const learnContext = internalQuery({
  args: { workspaceId: v.id('marketingWorkspaces') },
  handler: async (ctx, { workspaceId }) => ctx.db.get(workspaceId),
});

export const saveLearned = internalMutation({
  args: {
    workspaceId: v.id('marketingWorkspaces'),
    summary: v.string(),
    audience: v.string(),
    voice: v.string(),
    products: v.array(productFields),
  },
  handler: async (ctx, { workspaceId, products, ...brand }) => {
    const learned = await ctx.db
      .query('marketingProducts')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .take(100);
    await Promise.all(
      learned.filter((p) => p.source === 'website').map((p) => ctx.db.delete(p._id)),
    );
    await Promise.all(
      products.map((product) =>
        ctx.db.insert('marketingProducts', { workspaceId, ...product, source: 'website' }),
      ),
    );
    await ctx.db.patch(workspaceId, {
      ...brand,
      learnStatus: 'ready',
      learnError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const failLearn = internalMutation({
  args: { workspaceId: v.id('marketingWorkspaces'), error: v.string() },
  handler: async (ctx, { workspaceId, error }) => {
    await ctx.db.patch(workspaceId, {
      learnStatus: 'failed',
      learnError: error,
      updatedAt: Date.now(),
    });
  },
});

export const campaignContext = internalQuery({
  args: { campaignId: v.id('marketingCampaigns') },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return null;
    const workspace = await ctx.db.get(campaign.workspaceId);
    if (!workspace) return null;
    const products = await ctx.db
      .query('marketingProducts')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspace._id))
      .take(30);
    return { campaign, workspace, products };
  },
});

export const saveCampaign = internalMutation({
  args: {
    campaignId: v.id('marketingCampaigns'),
    angles: v.array(v.string()),
    drafts: v.array(draftFields),
  },
  handler: async (ctx, { campaignId, angles, drafts }) => {
    const campaign = await ctx.db.get(campaignId);
    if (campaign?.status !== 'generating') return;
    const now = Date.now();
    await Promise.all(
      drafts.map((draft) =>
        ctx.db.insert('marketingDrafts', {
          ...draft,
          workspaceId: campaign.workspaceId,
          campaignId,
          campaignName: campaign.name,
          status: 'pending',
          version: 1,
          updatedAt: now,
        }),
      ),
    );
    await ctx.db.patch(campaignId, { angles, status: 'ready', updatedAt: now });
  },
});

export const failCampaign = internalMutation({
  args: { campaignId: v.id('marketingCampaigns'), error: v.string() },
  handler: async (ctx, { campaignId, error }) => {
    await ctx.db.patch(campaignId, {
      status: 'failed',
      generationError: error,
      updatedAt: Date.now(),
    });
  },
});

export const revisionContext = internalQuery({
  args: { draftId: v.id('marketingDrafts') },
  handler: async (ctx, { draftId }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return null;
    const workspace = await ctx.db.get(draft.workspaceId);
    return workspace ? { draft, workspace } : null;
  },
});

export const saveRevision = internalMutation({
  args: {
    draftId: v.id('marketingDrafts'),
    headline: v.string(),
    body: v.string(),
    reply: v.string(),
  },
  handler: async (ctx, { draftId, reply, ...revision }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return;
    await ctx.db.patch(draftId, {
      ...revision,
      status: 'pending',
      revising: false,
      version: draft.version + 1,
      updatedAt: Date.now(),
    });
    await ctx.db.insert('marketingDraftComments', {
      workspaceId: draft.workspaceId,
      draftId,
      author: 'austi',
      body: reply || 'Updated the draft from your note.',
    });
  },
});

export const failRevision = internalMutation({
  args: { draftId: v.id('marketingDrafts'), error: v.string() },
  handler: async (ctx, { draftId, error }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return;
    await ctx.db.patch(draftId, { revising: false, updatedAt: Date.now() });
    await ctx.db.insert('marketingDraftComments', {
      workspaceId: draft.workspaceId,
      draftId,
      author: 'austi',
      body: error,
    });
  },
});
