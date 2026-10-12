import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { action, internalMutation, internalQuery, query } from '../_generated/server';
import { integrationStatus, intakeModel } from './intakeValidators';
import { randomToken } from './links';
import { email, requireWorkspace, text } from './model';
import { telegramCall } from './telegramApi';
import { contact } from './validators';

export const list = query({
  args: { workspace: v.string() },
  returns: v.array(
    v.object({
      id: v.id('austiIntegrations'),
      username: v.string(),
      status: integrationStatus,
      owner: contact,
      property: v.string(),
      model: intakeModel,
      error: v.union(v.string(), v.null()),
      lastReceivedAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, { workspace }) => {
    await requireWorkspace(ctx, workspace);
    const integrations = await ctx.db
      .query('austiIntegrations')
      .withIndex('by_workspace', (q) => q.eq('workspace', workspace))
      .take(20);
    return integrations.map((i) => ({
      id: i._id,
      username: i.username,
      status: i.status,
      owner: i.owner,
      property: i.property,
      model: i.model,
      error: i.error ?? null,
      lastReceivedAt: i.lastReceivedAt ?? null,
    }));
  },
});

export const reserve = internalMutation({
  args: {
    workspace: v.string(),
    botId: v.string(),
    username: v.string(),
    token: v.string(),
    secret: v.string(),
    owner: contact,
    property: v.string(),
    model: intakeModel,
  },
  returns: v.id('austiIntegrations'),
  handler: async (ctx, args) => {
    const identity = await requireWorkspace(ctx, args.workspace);
    if (identity.tokenIdentifier !== args.workspace)
      throw new ConvexError('Only the portfolio owner can manage integrations.');
    const bot = await ctx.db
      .query('austiIntegrations')
      .withIndex('by_botId', (q) => q.eq('botId', args.botId))
      .unique();
    if (bot && bot.workspace !== args.workspace)
      throw new ConvexError('This bot belongs to another portfolio.');
    if (bot?.status === 'connecting')
      throw new ConvexError('This bot is already being connected. Try again shortly.');
    const value = {
      ...args,
      provider: 'telegram' as const,
      status: 'connecting' as const,
      error: undefined,
    };
    const id = bot?._id ?? (await ctx.db.insert('austiIntegrations', value));
    if (bot) await ctx.db.patch(id, value);
    await ctx.scheduler.runAfter(60000, internal.austi.integrations.expireConnection, {
      id,
      secret: args.secret,
    });
    return id;
  },
});

export const finish = internalMutation({
  args: { id: v.id('austiIntegrations'), secret: v.string(), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.id);
    if (integration?.secret === args.secret && integration.status === 'connecting') {
      await ctx.db.patch(args.id, {
        status: args.error ? 'failed' : 'connected',
        error: args.error,
      });
      if (!args.error) {
        const queued = await ctx.db
          .query('austiIntakeMessages')
          .withIndex('by_integrationId_and_state', (q) =>
            q.eq('integrationId', args.id).eq('state', 'queued'),
          )
          .take(100);
        for (const id of new Set(queued.map((m) => m.conversationId)))
          await ctx.scheduler.runAfter(0, internal.austi.intakeProcessing.process, { id });
      }
    }
    return null;
  },
});
export const expireConnection = internalMutation({
  args: { id: v.id('austiIntegrations'), secret: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const i = await ctx.db.get(args.id);
    if (i?.secret === args.secret && i.status === 'connecting')
      await ctx.db.patch(args.id, {
        status: 'failed',
        error: 'Connection was interrupted. Reconnect this bot.',
      });
    return null;
  },
});

export const connect = action({
  args: {
    workspace: v.string(),
    token: v.string(),
    owner: contact,
    property: v.string(),
    model: intakeModel,
  },
  returns: v.id('austiIntegrations'),
  handler: async (ctx, args): Promise<Id<'austiIntegrations'>> => {
    // Check ownership before using the supplied credentials against an external service.
    await ctx.runQuery(internal.austi.integrations.requireOwner, { workspace: args.workspace });
    const token = args.token.trim();
    if (!/^\d+:[\w-]{20,}$/.test(token))
      throw new ConvexError('Enter a valid Telegram bot token from BotFather.');
    if (token.split(':')[0] === process.env.TELEGRAM_BOT_TOKEN?.split(':')[0])
      throw new ConvexError(
        'This bot is already used by the existing chat integration. Use a dedicated maintenance bot.',
      );
    const owner = {
      name: text(args.owner.name, 'Repair contact', 200),
      email: email(args.owner.email),
    };
    const origin = process.env.CONVEX_SITE_URL;
    if (!origin || !process.env.AI_GATEWAY_API_KEY)
      throw new ConvexError(
        'AI intake is not configured. Ask your administrator to enable it before connecting Telegram.',
      );
    const me = await telegramCall(token, 'getMe', {});
    if (
      !me ||
      typeof me !== 'object' ||
      !('id' in me) ||
      typeof me.id !== 'number' ||
      !Number.isSafeInteger(me.id) ||
      me.id <= 0 ||
      !('username' in me) ||
      typeof me.username !== 'string' ||
      !/^[a-zA-Z0-9_]{5,32}$/.test(me.username) ||
      !('is_bot' in me) ||
      me.is_bot !== true
    )
      throw new ConvexError('Telegram did not return a valid bot.');
    const secret = randomToken();
    const id = await ctx.runMutation(internal.austi.integrations.reserve, {
      ...args,
      token,
      owner,
      botId: String(me.id),
      username: me.username,
      secret,
      property: args.property.trim().slice(0, 300),
    });
    try {
      const url = new URL('/austi/telegram/webhook', origin);
      url.searchParams.set('integration', id);
      await telegramCall(token, 'setWebhook', {
        url: url.href,
        secret_token: secret,
        allowed_updates: ['message'],
        max_connections: 1,
      });
      await ctx.runMutation(internal.austi.integrations.finish, { id, secret });
      return id;
    } catch {
      const error = 'Telegram webhook registration failed. Check the bot token and reconnect.';
      await ctx.runMutation(internal.austi.integrations.finish, { id, secret, error });
      throw new ConvexError(error);
    }
  },
});

export const requireOwner = internalQuery({
  args: { workspace: v.string() },
  returns: v.null(),
  handler: async (ctx, { workspace }) => {
    const identity = await requireWorkspace(ctx, workspace);
    if (identity.tokenIdentifier !== workspace)
      throw new ConvexError('Only the portfolio owner can manage integrations.');
    return null;
  },
});
export const disable = internalMutation({
  args: { id: v.id('austiIntegrations') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const i = await ctx.db.get(id);
    if (!i) throw new ConvexError('Integration unavailable.');
    const identity = await requireWorkspace(ctx, i.workspace);
    if (identity.tokenIdentifier !== i.workspace)
      throw new ConvexError('Only the portfolio owner can manage integrations.');
    if (i.status === 'connecting')
      throw new ConvexError('Wait for the connection attempt to finish.');
    await ctx.db.patch(id, { status: 'disconnected', token: '', secret: '', error: undefined });
    return null;
  },
});
export const disconnect = action({
  args: { id: v.id('austiIntegrations') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Stop intake locally even if Telegram is temporarily unavailable.
    await ctx.runMutation(internal.austi.integrations.disable, args);
    // Do not delete the webhook remotely: that could delete a concurrent reconnect's webhook.
    return null;
  },
});
