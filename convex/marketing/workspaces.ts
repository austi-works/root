import { ConvexError, v } from 'convex/values';

import { internal } from '#convex/_generated/api';
import { mutation, query } from '#convex/_generated/server';
import {
  findWorkspace,
  optionalText,
  requireText,
  requireWorkspace,
  reserveGeneration,
} from '#convex/marketing/access';
import { normalizeWebsiteUrl } from '#convex/marketing/ai';
import { DRAFT_STATUSES } from '#convex/marketing/validators';
import { verifyIdentity } from '#convex/utils';

const MAX_DRAFTS_COUNTED = 100;
const MAX_DRAFTS_SHOWN = 12;

export const get = query({
  args: {},
  handler: async (ctx) => findWorkspace(ctx),
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    const [campaigns, ...columns] = await Promise.all([
      ctx.db
        .query('marketingCampaigns')
        .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspace._id))
        .order('desc')
        .take(6),
      ...DRAFT_STATUSES.map((status) =>
        ctx.db
          .query('marketingDrafts')
          .withIndex('by_workspaceId_and_status', (q) =>
            q.eq('workspaceId', workspace._id).eq('status', status),
          )
          .order('desc')
          .take(MAX_DRAFTS_COUNTED),
      ),
    ]);
    return {
      campaigns,
      columns: DRAFT_STATUSES.map((status, index) => ({
        status,
        total: columns[index]!.length,
        drafts: columns[index]!.slice(0, MAX_DRAFTS_SHOWN),
      })),
    };
  },
});

export const create = mutation({
  args: { name: v.string(), websiteUrl: v.string() },
  handler: async (ctx, args) => {
    const { subject } = await verifyIdentity(ctx);
    const existing = await findWorkspace(ctx);
    if (existing) return existing._id;

    const websiteUrl = args.websiteUrl.trim() ? normalizeWebsiteUrl(args.websiteUrl) : '';
    const workspaceId = await ctx.db.insert('marketingWorkspaces', {
      ownerId: subject,
      name: requireText(args.name, 'Business name', 120),
      websiteUrl,
      summary: '',
      audience: '',
      voice: '',
      learnStatus: websiteUrl ? 'learning' : 'idle',
      updatedAt: Date.now(),
    });
    if (websiteUrl) {
      await reserveGeneration(ctx, workspaceId, 'learn');
      await ctx.scheduler.runAfter(0, internal.marketing.generation.learnBrand, { workspaceId });
    }
    return workspaceId;
  },
});

export const updateBrand = mutation({
  args: {
    name: v.string(),
    websiteUrl: v.string(),
    summary: v.string(),
    audience: v.string(),
    voice: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    await ctx.db.patch(workspace._id, {
      name: requireText(args.name, 'Business name', 120),
      websiteUrl: args.websiteUrl.trim() ? normalizeWebsiteUrl(args.websiteUrl) : '',
      summary: optionalText(args.summary, 'Summary', 1200),
      audience: optionalText(args.audience, 'Audience', 800),
      voice: optionalText(args.voice, 'Voice', 800),
      updatedAt: Date.now(),
    });
  },
});

export const relearn = mutation({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    if (!workspace.websiteUrl) throw new ConvexError('Add your website address first.');
    if (workspace.learnStatus === 'learning') return;
    await reserveGeneration(ctx, workspace._id, 'learn');
    await ctx.db.patch(workspace._id, {
      learnStatus: 'learning',
      learnError: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.marketing.generation.learnBrand, {
      workspaceId: workspace._id,
    });
  },
});
