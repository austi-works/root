import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v, type Infer } from 'convex/values';

import { internal } from '../_generated/api';
import { action, internalMutation, internalQuery, mutation } from '../_generated/server';
import { getLink, notificationRecipientMatches, recipientFor, requireCase } from './model';
import { response, role, rolesFor, sharedFile } from './validators';

export const hash = async (token: string) => {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ConvexError('Invalid response link.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

export const mint = internalMutation({
  args: {
    id: v.id('austiRequests'),
    role,
    tokenHash: v.string(),
    notificationId: v.optional(v.id('austiNotifications')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request || request.state !== 'pending' || !rolesFor(request.kind).includes(args.role))
      throw new ConvexError('Request unavailable.');
    const item = await ctx.db.get(request.caseId);
    if (!item || item.pendingRequest !== request._id) throw new ConvexError('Request unavailable.');
    if (args.notificationId) {
      const notification = await ctx.db.get(args.notificationId);
      if (
        request.automaticLinksPaused ||
        notification?.state !== 'sending' ||
        notification.requestId !== request._id ||
        notification.role !== args.role
      )
        throw new ConvexError('Request delivery is unavailable.');
      if (!(await notificationRecipientMatches(ctx, item, notification)))
        throw new ConvexError('Request recipient has changed.');
    } else {
      await requireCase(ctx, request.caseId);
    }
    const recipient = await recipientFor(ctx, item, args.role);
    if (!recipient) throw new ConvexError('Recipient unavailable.');
    const existing = await ctx.db
      .query('austiLinks')
      .withIndex('by_requestId', (q) => q.eq('requestId', args.id))
      .take(100);
    if (existing.length >= 50) throw new ConvexError('Revoke existing links before creating more.');
    await ctx.db.insert('austiLinks', {
      requestId: args.id,
      role: args.role,
      recipientEmail: recipient.email,
      recipientVersion: recipient.version,
      tokenHash: args.tokenHash,
      expiresAt: Date.now() + 7 * 86400000,
    });
    return null;
  },
});
export const create = action({
  args: { id: v.id('austiRequests'), role },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const token = randomToken();
    await ctx.runMutation(internal.austi.links.mint, { ...args, tokenHash: await hash(token) });
    return token;
  },
});
export const revoke = mutation({
  args: { id: v.id('austiRequests') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const request = await ctx.db.get(id);
    if (!request) throw new ConvexError('Request unavailable.');
    await requireCase(ctx, request.caseId);
    const links = await ctx.db
      .query('austiLinks')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .take(100);
    for (const link of links) await ctx.db.delete(link._id);
    await ctx.db.patch(id, { automaticLinksPaused: true });
    const item = await ctx.db.get(request.caseId);
    if (item?.pendingRequest === id)
      await ctx.db.patch(item._id, {
        responsible: 'Coordinator',
        nextAction: 'Response links revoked. Share a new link manually or withdraw the request.',
        updatedAt: Date.now(),
      });
    return null;
  },
});
const externalView = v.object({
  title: v.string(),
  property: v.string(),
  unit: v.string(),
  report: v.string(),
  access: v.string(),
  presenceRequired: v.boolean(),
  kind: v.string(),
  role,
  body: v.string(),
  amount: v.union(v.number(), v.null()),
  appointmentAt: v.union(v.number(), v.null()),
  appointmentEnd: v.union(v.number(), v.null()),
  confirmed: v.boolean(),
  updates: v.array(v.object({ body: v.string(), time: v.number() })),
  files: v.array(sharedFile),
  filesCursor: v.string(),
  filesDone: v.boolean(),
});
export const read = action({
  args: { token: v.string() },
  returns: externalView,
  handler: async (ctx, { token }): Promise<Infer<typeof externalView>> => {
    return ctx.runQuery(internal.austi.requests.external, {
      tokenHash: await hash(token),
      now: Date.now(),
    });
  },
});
const sharedFilesPage = paginationResultValidator(sharedFile);
export const moreFiles = action({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  returns: sharedFilesPage,
  handler: async (ctx, args): Promise<Infer<typeof sharedFilesPage>> => {
    if (
      !Number.isInteger(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > 40
    )
      throw new ConvexError('Load between 1 and 40 files at a time.');
    return ctx.runQuery(internal.austi.requests.externalFiles, {
      tokenHash: await hash(args.token),
      now: Date.now(),
      paginationOpts: args.paginationOpts,
    });
  },
});
export const respond = action({
  args: { token: v.string(), response },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    return ctx.runMutation(internal.austi.requests.respond, {
      tokenHash: await hash(args.token),
      response: args.response,
    });
  },
});
export const validateUpload = internalQuery({
  args: { tokenHash: v.optional(v.string()), caseId: v.optional(v.id('austiCases')) },
  returns: v.id('austiCases'),
  handler: async (ctx, args) => {
    if (args.tokenHash) return (await getLink(ctx, args.tokenHash, Date.now())).item._id;
    if (!args.caseId) throw new ConvexError('Case required.');
    return (await requireCase(ctx, args.caseId))._id;
  },
});
