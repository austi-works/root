import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { isNewCommand, isStartCommand } from './intakeCommands';
import { extraction, inbound, integrationFields, intakeMessageFields } from './intakeValidators';
import { closed, createCaseRecord, event, recordStage, requireWorkspace } from './model';
import { caseDoc } from './validators';

const help =
  'Tell me what needs repairing, the property address, and the unit. You can attach photos or a PDF (up to 2 MB). Send /new before reporting a separate issue.';

export const authenticate = internalQuery({
  args: { id: v.string(), secret: v.string() },
  returns: v.union(v.id('austiIntegrations'), v.null()),
  handler: async (ctx, { id, secret }) => {
    const normalized = ctx.db.normalizeId('austiIntegrations', id);
    const integration = normalized ? await ctx.db.get(normalized) : null;
    return integration?.status === 'connected' && integration.secret === secret ? normalized : null;
  },
});
export const receive = internalMutation({
  args: { id: v.id('austiIntegrations'), secret: v.string(), message: inbound },
  returns: v.null(),
  handler: async (ctx, { id, secret, message }) => {
    const integration = await ctx.db.get(id);
    if (integration?.status !== 'connected' || integration.secret !== secret) return null;
    const duplicate = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_integrationId_and_updateId', (q) =>
        q.eq('integrationId', id).eq('updateId', message.updateId),
      )
      .unique();
    if (duplicate) return null;
    let conversation = await ctx.db
      .query('austiIntakeConversations')
      .withIndex('by_integrationId_and_chatId', (q) =>
        q.eq('integrationId', id).eq('chatId', message.chatId),
      )
      .unique();
    if (!conversation) {
      const conversationId = await ctx.db.insert('austiIntakeConversations', {
        integrationId: id,
        chatId: message.chatId,
        startedAt: Date.now(),
      });
      conversation = (await ctx.db.get(conversationId))!;
    }
    await ctx.db.insert('austiIntakeMessages', {
      integrationId: id,
      conversationId: conversation._id,
      ...message,
      state: 'queued',
      attempts: 0,
    });
    await ctx.db.patch(id, { lastReceivedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.process, {
      id: conversation._id,
    });
    return null;
  },
});

export const claim = internalMutation({
  args: { id: v.id('austiIntakeConversations') },
  returns: v.union(
    v.null(),
    v.object({
      message: v.object({
        ...intakeMessageFields,
        _id: v.id('austiIntakeMessages'),
        _creationTime: v.number(),
      }),
      integration: v.object({
        ...integrationFields,
        _id: v.id('austiIntegrations'),
        _creationTime: v.number(),
      }),
      currentCase: v.union(caseDoc, v.null()),
      history: v.array(v.string()),
    }),
  ),
  handler: async (ctx, { id }) => {
    const conversation = await ctx.db.get(id);
    if (!conversation || conversation.activeMessage) return null;
    const integration = await ctx.db.get(conversation.integrationId);
    if (integration?.status !== 'connected') return null;
    // A failed message blocks later messages until retry, preserving conversation order.
    const failed = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_conversationId_and_state', (q) =>
        q.eq('conversationId', id).eq('state', 'failed'),
      )
      .first();
    const message = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_conversationId_and_state', (q) =>
        q.eq('conversationId', id).eq('state', 'queued'),
      )
      .first();
    if (!message || (failed && failed._creationTime <= message._creationTime)) return null;
    await ctx.db.patch(id, { activeMessage: message._id });
    await ctx.db.patch(message._id, {
      state: 'processing',
      attempts: message.attempts + 1,
      error: undefined,
    });
    await ctx.scheduler.runAfter(120000, internal.austi.intake.recover, {
      id: message._id,
      attempt: message.attempts + 1,
    });
    const previous = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_conversationId', (q) =>
        q.eq('conversationId', id).lte('_creationTime', message._creationTime),
      )
      .order('desc')
      .take(40);
    const history: string[] = [];
    for (const m of previous) {
      if (isNewCommand(m.text)) break;
      if (isStartCommand(m.text)) continue;
      history.push(m.text);
    }
    const currentCase =
      !isNewCommand(message.text) && conversation.caseId
        ? await ctx.db.get(conversation.caseId)
        : null;
    return {
      message: { ...message, state: 'processing' as const, attempts: message.attempts + 1 },
      integration,
      currentCase,
      history: history.reverse(),
    };
  },
});

export const complete = internalMutation({
  args: {
    id: v.id('austiIntakeMessages'),
    attempt: v.number(),
    data: v.optional(extraction),
    storageId: v.optional(v.id('_storage')),
    attachmentError: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message || message.state !== 'processing' || message.attempts !== args.attempt)
      return false;
    const conversation = await ctx.db.get(message.conversationId);
    const integration = await ctx.db.get(message.integrationId);
    if (
      !conversation ||
      conversation.activeMessage !== args.id ||
      integration?.status !== 'connected'
    )
      return false;
    let caseId = conversation.caseId;
    let reply = help;
    if (isNewCommand(message.text)) {
      caseId = undefined;
      await ctx.db.patch(conversation._id, { caseId: undefined, startedAt: message._creationTime });
    } else if (!isStartCommand(message.text) && args.data) {
      const data = args.data;
      if (data.isReport || message.file || caseId) {
        const missing = [
          !data.property && !integration.property ? 'property address' : '',
          !data.unit ? 'unit' : '',
          !data.report ? 'description of the problem' : '',
        ].filter(Boolean);
        const emergency = data.urgency === 'Emergency';
        if (!caseId) {
          caseId = await createCaseRecord(
            ctx,
            {
              workspace: integration.workspace,
              title: data.title || 'Maintenance report',
              property: data.property || integration.property || 'Not provided',
              unit: data.unit || 'Not provided',
              report:
                data.report ||
                (message.file ? 'Attachment supplied; repair details needed.' : message.text),
              category: data.category,
              urgency: data.urgency,
              access: data.access,
              resident: { name: message.senderName, email: '' },
              owner: integration.owner,
            },
            'Austi',
            { provider: 'telegram', integrationId: integration._id, chatId: message.chatId },
          );
          await ctx.db.patch(conversation._id, { caseId });
          if (missing.length && !emergency)
            await ctx.db.patch(caseId, {
              status: 'Needs information',
              responsible: 'Resident',
              nextAction: `Provide ${missing.join(', ')}`,
            });
          reply = `Your maintenance case has been created.${missing.length ? ` Please send the ${missing.join(', ')}.` : ' Your property manager will review it.'}`;
        } else {
          const item = await ctx.db.get(caseId);
          if (!item || item.workspace !== integration.workspace)
            throw new Error('Case unavailable.');
          await ctx.db.patch(caseId, { updatedAt: Date.now() });
          // Intake can enrich an unreviewed case. It cannot replace an approval, appointment, or work decision.
          if (
            !item.pendingRequest &&
            ['New', 'Needs information', 'Needs review'].includes(item.status)
          ) {
            await ctx.db.patch(caseId, {
              title: data.title || item.title,
              property: data.property || integration.property || item.property,
              unit: data.unit || item.unit,
              report: data.report || item.report,
              access: data.access || item.access,
              category: data.category,
              urgency: emergency
                ? 'Emergency'
                : item.urgency === 'Emergency'
                  ? 'Emergency'
                  : data.urgency,
              ...(item.urgency === 'Emergency' || emergency
                ? {
                    status: 'Needs review' as const,
                    automation: false,
                    overdue: true,
                    responsible: 'Coordinator',
                    dueAt: Date.now(),
                    nextAction: 'Review emergency immediately',
                  }
                : item.status !== 'Needs review'
                  ? {
                      status: missing.length ? ('Needs information' as const) : ('New' as const),
                      responsible: missing.length ? 'Resident' : 'Coordinator',
                      nextAction: missing.length
                        ? `Provide ${missing.join(', ')}`
                        : 'Review report and choose the next action',
                    }
                  : {}),
              updatedAt: Date.now(),
            });
            const updated = (await ctx.db.get(caseId))!;
            if (updated.status !== item.status) {
              await recordStage(ctx, item, updated.status, updated.nextAction, 'Austi');
              await ctx.db.patch(caseId, { stageStartedAt: Date.now() });
            }
          }
          reply = `Your message has been added to the case.${closed(item) ? ' Send /new to report a separate issue.' : missing.length && !item.pendingRequest ? ` Please send the ${missing.join(', ')}.` : ' Your property manager can see the update.'}`;
          if (emergency && !closed(item))
            await ctx.db.patch(caseId, {
              urgency: 'Emergency',
              automation: false,
              overdue: true,
              responsible: 'Coordinator',
              dueAt: Date.now(),
              nextAction: 'Review emergency report immediately',
            });
        }
        await event(ctx, caseId, `Telegram: ${message.text}`, message.senderName, 'resident');
        if (emergency)
          reply +=
            ' If there is immediate danger, contact local emergency services and your property emergency contact now. Do not wait for a bot response.';
        if (args.storageId && message.file)
          await ctx.db.insert('austiFiles', {
            caseId,
            storageId: args.storageId,
            name: message.file.name,
            visibility: 'resident',
          });
      }
    }
    if (args.attachmentError) reply += ` ${args.attachmentError}`;
    await ctx.db.patch(args.id, {
      state: 'processed',
      caseId,
      reply,
      storageId: args.storageId,
      attachmentError: args.attachmentError,
      error: args.attachmentError,
    });
    await ctx.db.patch(conversation._id, { activeMessage: undefined });
    await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.reply, { id: args.id });
    await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.process, {
      id: conversation._id,
    });
    return true;
  },
});

export const registerAttachment = internalMutation({
  args: { id: v.id('austiIntakeMessages'), attempt: v.number(), storageId: v.id('_storage') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message || message.state !== 'processing' || message.attempts !== args.attempt)
      return false;
    if (message.storageId) await ctx.storage.delete(message.storageId);
    await ctx.db.patch(args.id, { storageId: args.storageId });
    await ctx.scheduler.runAfter(86400000, internal.austi.intake.cleanupAttachment, {
      id: args.id,
      storageId: args.storageId,
    });
    return true;
  },
});
export const cleanupAttachment = internalMutation({
  args: { id: v.id('austiIntakeMessages'), storageId: v.id('_storage') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (
      message?.storageId === args.storageId &&
      !(message.state === 'processed' && message.caseId)
    ) {
      await ctx.storage.delete(args.storageId);
      await ctx.db.patch(args.id, { storageId: undefined });
    }
    return null;
  },
});

export const fail = internalMutation({
  args: { id: v.id('austiIntakeMessages'), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, attempt }) => {
    const message = await ctx.db.get(id);
    if (!message || message.state !== 'processing' || message.attempts !== attempt) return null;
    await ctx.db.patch(id, {
      state: 'failed',
      error: 'AI intake failed. The original message is saved; retry processing.',
    });
    const conversation = await ctx.db.get(message.conversationId);
    if (conversation?.activeMessage === id)
      await ctx.db.patch(conversation._id, { activeMessage: undefined });
    return null;
  },
});
export const recover = internalMutation({
  args: { id: v.id('austiIntakeMessages'), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message || message.state !== 'processing' || message.attempts !== args.attempt)
      return null;
    await ctx.db.patch(args.id, {
      state: args.attempt < 3 ? 'queued' : 'failed',
      error: 'Processing was interrupted.',
    });
    const conversation = await ctx.db.get(message.conversationId);
    if (conversation?.activeMessage === args.id)
      await ctx.db.patch(conversation._id, { activeMessage: undefined });
    if (args.attempt < 3)
      await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.process, {
        id: message.conversationId,
      });
    return null;
  },
});

export const recent = query({
  args: { integrationId: v.id('austiIntegrations') },
  returns: v.array(
    v.object({
      id: v.id('austiIntakeMessages'),
      senderName: v.string(),
      text: v.string(),
      state: v.string(),
      caseId: v.union(v.id('austiCases'), v.null()),
      error: v.union(v.string(), v.null()),
      replyState: v.union(v.string(), v.null()),
      time: v.number(),
    }),
  ),
  handler: async (ctx, { integrationId }) => {
    const i = await ctx.db.get(integrationId);
    if (!i) throw new ConvexError('Integration unavailable.');
    await requireWorkspace(ctx, i.workspace);
    const messages = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_integrationId', (q) => q.eq('integrationId', integrationId))
      .order('desc')
      .take(20);
    const failures = await ctx.db
      .query('austiIntakeMessages')
      .withIndex('by_integrationId_and_state', (q) =>
        q.eq('integrationId', integrationId).eq('state', 'failed'),
      )
      .take(20);
    const visible = [
      ...failures,
      ...messages.filter((m) => !failures.some((f) => f._id === m._id)),
    ];
    return visible.map((m) => ({
      id: m._id,
      senderName: m.senderName,
      text: m.text,
      state: m.state,
      caseId: m.caseId ?? null,
      error: m.error ?? null,
      replyState: m.replyState ?? null,
      time: m._creationTime,
    }));
  },
});
export const retry = mutation({
  args: { id: v.id('austiIntakeMessages') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const m = await ctx.db.get(id);
    const i = m ? await ctx.db.get(m.integrationId) : null;
    if (!m || !i) throw new ConvexError('Message unavailable.');
    await requireWorkspace(ctx, i.workspace);
    if (i.status !== 'connected') throw new ConvexError('Reconnect Telegram before retrying.');
    if (m.state === 'failed' || m.state === 'queued') {
      await ctx.db.patch(id, { state: 'queued', error: undefined });
      await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.process, {
        id: m.conversationId,
      });
    } else if (m.state === 'processed' && m.replyState === 'failed') {
      await ctx.db.patch(id, { replyState: undefined, error: undefined });
      await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.reply, { id });
    } else
      throw new ConvexError(
        'Only queued messages, failed processing, or failed replies can be retried.',
      );
    return null;
  },
});

export const claimReply = internalMutation({
  args: { id: v.id('austiIntakeMessages') },
  returns: v.union(
    v.null(),
    v.object({ token: v.string(), chatId: v.string(), text: v.string(), attempt: v.number() }),
  ),
  handler: async (ctx, { id }) => {
    const m = await ctx.db.get(id);
    const i = m ? await ctx.db.get(m.integrationId) : null;
    if (!m || m.state !== 'processed' || m.replyState || !m.reply || i?.status !== 'connected')
      return null;
    const attempt = (m.replyAttempts ?? 0) + 1;
    await ctx.db.patch(id, { replyState: 'sending', replyAttempts: attempt });
    await ctx.scheduler.runAfter(60000, internal.austi.intake.finishReply, {
      id,
      attempt,
      error: 'Reply delivery was interrupted. Check Telegram before retrying.',
    });
    return { token: i.token, chatId: m.chatId, text: m.reply, attempt };
  },
});
export const finishReply = internalMutation({
  args: { id: v.id('austiIntakeMessages'), attempt: v.number(), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, attempt, error }) => {
    const m = await ctx.db.get(id);
    if (m?.replyState === 'sending' && m.replyAttempts === attempt)
      await ctx.db.patch(id, {
        replyState: error ? 'failed' : 'sent',
        error: error ?? m.attachmentError,
      });
    return null;
  },
});
