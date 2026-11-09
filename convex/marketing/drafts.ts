import { ConvexError, v } from 'convex/values';

import { internal } from '#convex/_generated/api';
import { mutation, query } from '#convex/_generated/server';
import {
  requireDraft,
  requireText,
  requireWorkspace,
  reserveGeneration,
} from '#convex/marketing/access';

const assertNotRevising = (draft: { revising?: boolean }) => {
  if (draft.revising) throw new ConvexError('Austi is still revising this draft.');
};

export const queue = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    return ctx.db
      .query('marketingDrafts')
      .withIndex('by_workspaceId_and_status', (q) =>
        q.eq('workspaceId', workspace._id).eq('status', 'pending'),
      )
      .order('desc')
      .take(100);
  },
});

export const get = query({
  args: { draftId: v.id('marketingDrafts') },
  handler: async (ctx, { draftId }) => {
    const { draft } = await requireDraft(ctx, draftId);
    const comments = await ctx.db
      .query('marketingDraftComments')
      .withIndex('by_draftId', (q) => q.eq('draftId', draftId))
      .take(100);
    return { draft, comments };
  },
});

export const decide = mutation({
  args: {
    draftId: v.id('marketingDrafts'),
    decision: v.union(v.literal('approved'), v.literal('held'), v.literal('pending')),
  },
  handler: async (ctx, { draftId, decision }) => {
    const { draft } = await requireDraft(ctx, draftId);
    assertNotRevising(draft);
    await ctx.db.patch(draft._id, { status: decision, updatedAt: Date.now() });
  },
});

/** Changing the words invalidates any earlier approval. */
export const edit = mutation({
  args: { draftId: v.id('marketingDrafts'), headline: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const { draft } = await requireDraft(ctx, args.draftId);
    assertNotRevising(draft);
    await ctx.db.patch(draft._id, {
      headline: requireText(args.headline, 'Headline', 200),
      body: requireText(args.body, 'Draft', 6000),
      status: 'pending',
      version: draft.version + 1,
      updatedAt: Date.now(),
    });
  },
});

export const requestRevision = mutation({
  args: { draftId: v.id('marketingDrafts'), note: v.string() },
  handler: async (ctx, args) => {
    const { workspace, draft } = await requireDraft(ctx, args.draftId);
    assertNotRevising(draft);
    const note = requireText(args.note, 'Your note', 1000);
    await reserveGeneration(ctx, workspace._id, 'revision');
    await ctx.db.insert('marketingDraftComments', {
      workspaceId: workspace._id,
      draftId: draft._id,
      author: 'you',
      body: note,
    });
    await ctx.db.patch(draft._id, {
      status: 'changes_requested',
      revising: true,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.marketing.generation.reviseDraft, {
      draftId: draft._id,
      note,
    });
  },
});
