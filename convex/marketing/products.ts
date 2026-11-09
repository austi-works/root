import { ConvexError, v } from 'convex/values';

import { mutation, query } from '#convex/_generated/server';
import { optionalText, requireText, requireWorkspace } from '#convex/marketing/access';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    return ctx.db
      .query('marketingProducts')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspace._id))
      .take(100);
  },
});

export const add = mutation({
  args: { name: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    return ctx.db.insert('marketingProducts', {
      workspaceId: workspace._id,
      name: requireText(args.name, 'Product name', 120),
      description: optionalText(args.description, 'Description', 400),
      source: 'manual',
    });
  },
});

export const remove = mutation({
  args: { productId: v.id('marketingProducts') },
  handler: async (ctx, { productId }) => {
    const workspace = await requireWorkspace(ctx);
    const product = await ctx.db.get(productId);
    if (!product || product.workspaceId !== workspace._id)
      throw new ConvexError('Product not found.');
    await ctx.db.delete(productId);
  },
});
