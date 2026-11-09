import { ConvexError } from 'convex/values';

import type { Id } from '#convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex/_generated/server';
import type { GenerationKind } from '#convex/marketing/validators';
import { verifyIdentity } from '#convex/utils';

type Ctx = QueryCtx | MutationCtx;

export const MAX_GENERATIONS_PER_DAY = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const findWorkspace = async (ctx: Ctx) => {
  const { subject } = await verifyIdentity(ctx);
  return ctx.db
    .query('marketingWorkspaces')
    .withIndex('by_ownerId', (q) => q.eq('ownerId', subject))
    .unique();
};

export const requireWorkspace = async (ctx: Ctx) => {
  const workspace = await findWorkspace(ctx);
  if (!workspace) throw new ConvexError('Set up your workspace first.');
  return workspace;
};

export const requireCampaign = async (ctx: Ctx, campaignId: Id<'marketingCampaigns'>) => {
  const workspace = await requireWorkspace(ctx);
  const campaign = await ctx.db.get(campaignId);
  if (!campaign || campaign.workspaceId !== workspace._id)
    throw new ConvexError('Campaign not found.');
  return { workspace, campaign };
};

export const requireDraft = async (ctx: Ctx, draftId: Id<'marketingDrafts'>) => {
  const workspace = await requireWorkspace(ctx);
  const draft = await ctx.db.get(draftId);
  if (!draft || draft.workspaceId !== workspace._id) throw new ConvexError('Draft not found.');
  return { workspace, draft };
};

/** Every generation spends model credits, so each workspace gets a daily allowance. */
export const reserveGeneration = async (
  ctx: MutationCtx,
  workspaceId: Id<'marketingWorkspaces'>,
  kind: GenerationKind,
) => {
  const recent = await ctx.db
    .query('marketingGenerations')
    .withIndex('by_workspaceId', (q) =>
      q.eq('workspaceId', workspaceId).gt('_creationTime', Date.now() - DAY_MS),
    )
    .take(MAX_GENERATIONS_PER_DAY);
  if (recent.length >= MAX_GENERATIONS_PER_DAY)
    throw new ConvexError('You have reached today’s generation limit. Please try again tomorrow.');
  await ctx.db.insert('marketingGenerations', { workspaceId, kind });
};

export const requireText = (value: string, label: string, max: number) => {
  const text = value.trim();
  if (!text) throw new ConvexError(`${label} is required.`);
  if (text.length > max) throw new ConvexError(`${label} must be ${max} characters or fewer.`);
  return text;
};

export const optionalText = (value: string, label: string, max: number) =>
  value.trim() ? requireText(value, label, max) : '';
