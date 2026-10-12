'use node';

import { v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { extractIntake } from './intakeAi';
import { isNewCommand, isStartCommand } from './intakeCommands';
import { downloadAttachment, telegramCall } from './telegramApi';

export const process = internalAction({
  args: { id: v.id('austiIntakeConversations') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const work = await ctx.runMutation(internal.austi.intake.claim, { id });
    if (!work) return null;
    const { message, integration, currentCase, history } = work;
    let storageId;
    try {
      const command = isNewCommand(message.text) || isStartCommand(message.text);
      const data = command
        ? undefined
        : await extractIntake({
            model: integration.model,
            property: integration.property,
            messages: history,
            currentCase,
          });
      let attachmentError;
      if (message.file) {
        try {
          storageId = await ctx.storage.store(
            await downloadAttachment(integration.token, message.file.id),
          );
          const registered = await ctx.runMutation(internal.austi.intake.registerAttachment, {
            id: message._id,
            attempt: message.attempts,
            storageId,
          });
          if (!registered) {
            await ctx.storage.delete(storageId);
            return null;
          }
        } catch {
          if (storageId) await ctx.storage.delete(storageId);
          storageId = undefined;
          attachmentError =
            'The attachment could not be saved. Please resend a JPEG, PNG, WebP, or PDF up to 2 MB.';
        }
      }
      const attached = await ctx.runMutation(internal.austi.intake.complete, {
        id: message._id,
        attempt: message.attempts,
        data,
        storageId,
        attachmentError,
      });
      if (!attached && storageId) await ctx.storage.delete(storageId);
    } catch {
      if (storageId) await ctx.storage.delete(storageId);
      await ctx.runMutation(internal.austi.intake.fail, {
        id: message._id,
        attempt: message.attempts,
      });
    }
    return null;
  },
});
export const reply = internalAction({
  args: { id: v.id('austiIntakeMessages') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const work = await ctx.runMutation(internal.austi.intake.claimReply, { id });
    if (!work) return null;
    try {
      await telegramCall(work.token, 'sendMessage', { chat_id: work.chatId, text: work.text });
      await ctx.runMutation(internal.austi.intake.finishReply, { id, attempt: work.attempt });
    } catch {
      await ctx.runMutation(internal.austi.intake.finishReply, {
        id,
        attempt: work.attempt,
        error: 'Telegram reply failed. Check Telegram before retrying.',
      });
    }
    return null;
  },
});
