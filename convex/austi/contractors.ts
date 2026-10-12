import { ConvexError, v } from 'convex/values';

import { mutation, query } from '../_generated/server';
import { email, requireWorkspace, text } from './model';
import { contractorDoc, contractorInput } from './validators';

export const list = query({
  args: { workspace: v.string() },
  returns: v.array(contractorDoc),
  handler: async (ctx, { workspace }) => {
    await requireWorkspace(ctx, workspace);
    return ctx.db
      .query('austiContractors')
      .withIndex('by_workspace', (q) => q.eq('workspace', workspace))
      .take(200);
  },
});
export const save = mutation({
  args: { workspace: v.string(), id: v.optional(v.id('austiContractors')), ...contractorInput },
  returns: v.id('austiContractors'),
  handler: async (ctx, { id, ...args }) => {
    await requireWorkspace(ctx, args.workspace);
    if (
      !args.trades.length ||
      args.trades.length > 4 ||
      !Number.isInteger(args.priority) ||
      args.priority < 1 ||
      !Number.isFinite(args.timeoutHours) ||
      args.timeoutHours < 1 ||
      args.timeoutHours > 168
    )
      throw new ConvexError(
        'Select a trade, a positive priority, and a timeout between 1 and 168 hours.',
      );
    const value = {
      ...args,
      company: text(args.company, 'Company', 200),
      contact: text(args.contact, 'Contact', 200),
      email: email(args.email),
      phone: args.phone.trim().slice(0, 80),
      area: args.area.trim().slice(0, 500),
      properties: args.properties.trim().slice(0, 2000),
    };
    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.workspace !== args.workspace)
        throw new ConvexError('Contractor unavailable.');
      await ctx.db.patch(id, {
        ...value,
        recipientVersion:
          existing.email !== value.email || existing.active !== value.active
            ? existing.recipientVersion + 1
            : existing.recipientVersion,
      });
      return id;
    }
    return ctx.db.insert('austiContractors', { ...value, recipientVersion: 0 });
  },
});
