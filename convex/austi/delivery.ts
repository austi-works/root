import { v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { hash, randomToken } from './links';
import { telegramCall } from './telegramApi';

export const deliver = internalAction({
  args: { id: v.id('austiNotifications') },
  returns: v.null(),
  handler: async (ctx, { id }): Promise<null> => {
    if (!(await ctx.runMutation(internal.austi.notifications.claim, { id }))) return null;
    const n = await ctx.runQuery(internal.austi.notifications.get, { id });
    if (!n) return null;
    if (n.telegram) {
      try {
        const route = await ctx.runQuery(internal.austi.notifications.telegramRoute, { id });
        if (!route) throw new Error('Telegram integration unavailable.');
        let body = n.body.length > 3500 ? `${n.body.slice(0, 3500)}…` : n.body;
        if (n.requestId) {
          const origin = process.env.AUSTI_PUBLIC_URL;
          if (!origin || new URL(origin).protocol !== 'https:') {
            await ctx.runMutation(internal.austi.notifications.finish, {
              id,
              state: 'blocked',
              error: 'Configure AUSTI_PUBLIC_URL to send Telegram response links.',
              retry: false,
            });
            return null;
          }
          if (n.payload) body = n.payload;
          else {
            const token = randomToken();
            await ctx.runMutation(internal.austi.links.mint, {
              id: n.requestId,
              role: n.role,
              tokenHash: await hash(token),
              notificationId: id,
            });
            body += `\n\nView and respond (expires in seven days): ${new URL(origin).origin}/respond#${token}`;
            await ctx.runMutation(internal.austi.notifications.savePayload, { id, payload: body });
          }
        }
        await telegramCall(route.token, 'sendMessage', {
          chat_id: route.chatId,
          text: body.slice(0, 4096),
        });
        await ctx.runMutation(internal.austi.notifications.finish, {
          id,
          state: 'accepted',
          retry: false,
        });
      } catch {
        // Telegram has no sendMessage idempotency key; uncertain sends need a human check.
        await ctx.runMutation(internal.austi.notifications.finish, {
          id,
          state: 'failed',
          error: 'Telegram delivery failed. Check the conversation before retrying.',
          retry: false,
        });
      }
      return null;
    }
    const key = process.env.AUSTI_RESEND_API_KEY;
    const from = process.env.AUSTI_EMAIL_FROM;
    const origin = process.env.AUSTI_PUBLIC_URL;
    if (!key || !from || !origin) {
      await ctx.runMutation(internal.austi.notifications.finish, {
        id,
        state: 'blocked',
        error:
          'Email delivery is not configured. Share a response link manually or configure Austi email delivery.',
        retry: false,
      });
      return null;
    }
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:') throw new Error('AUSTI_PUBLIC_URL must use HTTPS.');
      let payload = n.payload;
      if (!payload) {
        let body = n.body;
        if (n.requestId) {
          const token = randomToken();
          await ctx.runMutation(internal.austi.links.mint, {
            id: n.requestId,
            role: n.role,
            tokenHash: await hash(token),
            notificationId: id,
          });
          body += `\n\nView and respond (link expires in seven days): ${url.origin}/respond#${token}`;
        }
        payload = JSON.stringify({ from, to: [n.to], subject: n.subject, text: body });
        await ctx.runMutation(internal.austi.notifications.savePayload, { id, payload });
      }
      const result = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `austi-${id}`,
        },
        body: payload,
        signal: AbortSignal.timeout(15000),
      });
      if (!result.ok) {
        await ctx.runMutation(internal.austi.notifications.finish, {
          id,
          state: 'failed',
          error: `Email provider returned HTTP ${result.status}.`,
          retry: result.status === 429 || result.status >= 500,
        });
        return null;
      }
      const data = (await result.json()) as { id?: string };
      await ctx.runMutation(internal.austi.notifications.finish, {
        id,
        state: 'accepted',
        providerId: data.id,
        retry: false,
      });
    } catch {
      await ctx.runMutation(internal.austi.notifications.finish, {
        id,
        state: 'failed',
        error: 'Could not send the email. Check delivery configuration or retry.',
        retry: true,
      });
    }
    return null;
  },
});
