import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { notificationRecipientMatches, requireCase } from './model';
import { notificationFields, notificationState } from './validators';

export const list = query({
  args: { id: v.id('austiCases') },
  returns: v.array(
    v.object({
      id: v.id('austiNotifications'),
      to: v.string(),
      body: v.string(),
      state: notificationState,
      error: v.union(v.string(), v.null()),
      attempts: v.number(),
      time: v.number(),
    }),
  ),
  handler: async (ctx, { id }) => {
    await requireCase(ctx, id);
    return (
      await ctx.db
        .query('austiNotifications')
        .withIndex('by_caseId', (q) => q.eq('caseId', id))
        .order('desc')
        .take(100)
    ).map((n) => ({
      id: n._id,
      to: n.telegram ? `Telegram · ${n.to}` : n.to,
      body: n.body,
      state: n.state,
      error: n.error ?? null,
      attempts: n.attempts,
      time: n._creationTime,
    }));
  },
});
export const retry = mutation({
  args: { id: v.id('austiNotifications') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const notice = await ctx.db.get(id);
    if (!notice) throw new ConvexError('Notification unavailable.');
    await requireCase(ctx, notice.caseId);
    if (!['blocked', 'failed'].includes(notice.state))
      throw new ConvexError('Only failed or blocked notifications can be retried.');
    if (notice.telegram || (notice.payload && Date.now() - notice._creationTime < 23 * 3600000)) {
      // Keep the exact body and provider key when the previous outcome is uncertain.
      await ctx.db.patch(id, {
        state: 'queued',
        attempts: notice.telegram ? notice.attempts : 0,
        error: undefined,
      });
      await ctx.scheduler.runAfter(0, internal.austi.delivery.deliver, { id });
      return null;
    }
    if (notice.payload)
      throw new ConvexError(
        'The provider deduplication window has passed. Check delivery with the provider before sending a new update.',
      );
    const next = await ctx.db.insert('austiNotifications', {
      caseId: notice.caseId,
      requestId: notice.requestId,
      role: notice.role,
      telegram: notice.telegram,
      to: notice.to,
      subject: notice.subject,
      body: notice.body,
      state: 'queued',
      attempts: 0,
    });
    await ctx.db.patch(id, { state: 'cancelled', error: 'Replaced by a manual retry.' });
    await ctx.scheduler.runAfter(0, internal.austi.delivery.deliver, { id: next });
    return null;
  },
});
export const get = internalQuery({
  args: { id: v.id('austiNotifications') },
  returns: v.union(
    v.object({ ...notificationFields, _id: v.id('austiNotifications'), _creationTime: v.number() }),
    v.null(),
  ),
  handler: async (ctx, { id }) => ctx.db.get(id),
});
export const claim = internalMutation({
  args: { id: v.id('austiNotifications') },
  returns: v.boolean(),
  handler: async (ctx, { id }) => {
    const n = await ctx.db.get(id);
    if (!n || n.state !== 'queued') return false;
    const item = await ctx.db.get(n.caseId);
    if (!item || !(await notificationRecipientMatches(ctx, item, n))) {
      await ctx.db.patch(id, { state: 'cancelled', error: 'The recipient changed.' });
      return false;
    }
    if (n.requestId) {
      const request = await ctx.db.get(n.requestId);
      const alreadyConfirmed =
        request?.kind === 'scheduling' &&
        (n.role === 'resident' ? request.residentConfirmed : request.contractorConfirmed);
      if (
        request?.state !== 'pending' ||
        request.automaticLinksPaused ||
        item?.pendingRequest !== n.requestId ||
        alreadyConfirmed
      ) {
        await ctx.db.patch(id, { state: 'cancelled' });
        return false;
      }
    }
    await ctx.db.patch(id, { state: 'sending', attempts: n.attempts + 1 });
    await ctx.scheduler.runAfter(120000, internal.austi.notifications.recover, {
      id,
      attempt: n.attempts + 1,
    });
    return true;
  },
});
export const telegramRoute = internalQuery({
  args: { id: v.id('austiNotifications') },
  returns: v.union(v.null(), v.object({ token: v.string(), chatId: v.string() })),
  handler: async (ctx, { id }) => {
    const notice = await ctx.db.get(id);
    const item = notice ? await ctx.db.get(notice.caseId) : null;
    if (!notice?.telegram || !item || !(await notificationRecipientMatches(ctx, item, notice)))
      return null;
    const integration = await ctx.db.get(notice.telegram.integrationId);
    return integration ? { token: integration.token, chatId: notice.telegram.chatId } : null;
  },
});
export const recover = internalMutation({
  args: { id: v.id('austiNotifications'), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, attempt }) => {
    const n = await ctx.db.get(id);
    if (!n || n.state !== 'sending' || n.attempts !== attempt) return null;
    await ctx.db.patch(id, {
      state: !n.telegram && attempt < 3 ? 'queued' : 'failed',
      error: 'Delivery was interrupted. The provider may have accepted the message.',
    });
    if (!n.telegram && attempt < 3)
      await ctx.scheduler.runAfter(0, internal.austi.delivery.deliver, { id });
    return null;
  },
});
export const savePayload = internalMutation({
  args: { id: v.id('austiNotifications'), payload: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { payload: args.payload });
    return null;
  },
});
export const finish = internalMutation({
  args: {
    id: v.id('austiNotifications'),
    state: notificationState,
    error: v.optional(v.string()),
    providerId: v.optional(v.string()),
    retry: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { id, retry, ...value }) => {
    const n = await ctx.db.get(id);
    if (!n || n.state !== 'sending') return null;
    await ctx.db.patch(id, { ...value, state: retry && n.attempts < 3 ? 'queued' : value.state });
    if (retry && n.attempts < 3)
      await ctx.scheduler.runAfter(n.attempts * 60000, internal.austi.delivery.deliver, { id });
    return null;
  },
});
