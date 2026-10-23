import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { action, internalMutation } from '../_generated/server';
import { hash } from './links';
import { getLink, requireCase, text } from './model';
import { fileType } from './telegramApi';

export const register = internalMutation({
  args: {
    tokenHash: v.optional(v.string()),
    caseId: v.id('austiCases'),
    storageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.tokenHash) {
      const { item } = await getLink(ctx, args.tokenHash, Date.now());
      if (item._id !== args.caseId) throw new ConvexError('Upload unavailable.');
    } else await requireCase(ctx, args.caseId);
    const id = await ctx.db.insert('austiUploads', {
      caseId: args.caseId,
      storageId: args.storageId,
    });
    await ctx.scheduler.runAfter(86400000, internal.austi.files.cleanup, { id });
    return null;
  },
});
export const cleanup = internalMutation({
  args: { id: v.id('austiUploads') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const upload = await ctx.db.get(id);
    if (upload) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete(id);
    }
    return null;
  },
});
export const upload = action({
  args: {
    token: v.optional(v.string()),
    caseId: v.optional(v.id('austiCases')),
    name: v.string(),
    base64: v.string(),
  },
  returns: v.object({ storageId: v.id('_storage'), name: v.string() }),
  handler: async (ctx, args) => {
    const tokenHash = args.token ? await hash(args.token) : undefined;
    const caseId = await ctx.runQuery(internal.austi.links.validateUpload, {
      tokenHash,
      caseId: args.caseId,
    });
    if (args.base64.length > 2800000) throw new ConvexError('Files must be smaller than 2 MB.');
    const bytes = Uint8Array.from(atob(args.base64), (c) => c.charCodeAt(0));
    const type = fileType(bytes);
    if (!type || bytes.length > 2 * 1024 * 1024)
      throw new ConvexError('Upload a JPEG, PNG, WebP, or PDF smaller than 2 MB.');
    const name = text(args.name, 'File name', 200);
    const storageId = await ctx.storage.store(new Blob([bytes], { type }));
    try {
      await ctx.runMutation(internal.austi.files.register, { caseId, tokenHash, storageId });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    return { storageId, name };
  },
});
