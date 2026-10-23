import { ConvexError, v } from 'convex/values';

import { mutation, query } from '../_generated/server';
import { verifyIdentity } from '../utils';
import { email, requireWorkspace } from './model';

export const list = query({
  args: {},
  returns: v.array(v.object({ id: v.string(), label: v.string(), owned: v.boolean() })),
  handler: async (ctx) => {
    const identity = await verifyIdentity(ctx);
    const memberships =
      identity.email && identity.emailVerified === true
        ? await ctx.db
            .query('austiMembers')
            .withIndex('by_email', (q) => q.eq('email', identity.email!.toLowerCase()))
            .take(100)
        : [];
    return [
      { id: identity.tokenIdentifier, label: 'My portfolio', owned: true },
      ...memberships
        .filter((m) => m.workspace !== identity.tokenIdentifier)
        .map((m, i) => ({ id: m.workspace, label: `Shared portfolio ${i + 1}`, owned: false })),
    ];
  },
});
export const members = query({
  args: { workspace: v.string() },
  returns: v.array(v.object({ id: v.id('austiMembers'), email: v.string() })),
  handler: async (ctx, { workspace }) => {
    await requireWorkspace(ctx, workspace);
    return (
      await ctx.db
        .query('austiMembers')
        .withIndex('by_workspace', (q) => q.eq('workspace', workspace))
        .take(100)
    ).map((m) => ({ id: m._id, email: m.email }));
  },
});
export const grant = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await verifyIdentity(ctx);
    const address = email(args.email);
    const existing = await ctx.db
      .query('austiMembers')
      .withIndex('by_workspace_and_email', (q) =>
        q.eq('workspace', identity.tokenIdentifier).eq('email', address),
      )
      .unique();
    if (!existing)
      await ctx.db.insert('austiMembers', { workspace: identity.tokenIdentifier, email: address });
    return null;
  },
});
export const revoke = mutation({
  args: { id: v.id('austiMembers') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const identity = await verifyIdentity(ctx);
    const member = await ctx.db.get(id);
    if (!member || member.workspace !== identity.tokenIdentifier)
      throw new ConvexError('Only the portfolio owner can revoke access.');
    await ctx.db.delete(id);
    return null;
  },
});
