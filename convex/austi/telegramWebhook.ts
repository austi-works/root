import type { Infer } from 'convex/values';

import { internal } from '../_generated/api';
import { httpAction } from '../_generated/server';
import type { inbound } from './intakeValidators';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
export const parseUpdate = (update: unknown): Infer<typeof inbound> | null => {
  if (!object(update) || !Number.isSafeInteger(update.update_id) || Number(update.update_id) < 0)
    throw new Error('Invalid update.');
  if (!('message' in update)) return null;
  const m = update.message;
  if (!object(m) || !Number.isSafeInteger(m.message_id) || !object(m.chat))
    throw new Error('Invalid message.');
  if (m.chat.type !== 'private') return null;
  if (!object(m.from) || m.from.is_bot === true) return null;
  if (
    m.from.is_bot !== false ||
    !Number.isSafeInteger(m.from.id) ||
    m.from.id !== m.chat.id ||
    Number(m.chat.id) <= 0
  )
    throw new Error('Invalid private chat.');
  const body = m.text ?? m.caption ?? '';
  if (typeof body !== 'string' || body.length > 5000) throw new Error('Invalid text.');
  let file: Infer<typeof inbound>['file'];
  if (Array.isArray(m.photo)) {
    const photo = m.photo.at(-1);
    if (!object(photo) || typeof photo.file_id !== 'string') throw new Error('Invalid photo.');
    file = { id: photo.file_id, name: 'Telegram photo.jpg' };
  } else if (object(m.document) && typeof m.document.file_id === 'string') {
    file = {
      id: m.document.file_id,
      name:
        typeof m.document.file_name === 'string'
          ? m.document.file_name.trim().slice(0, 200) || 'Telegram document'
          : 'Telegram document',
    };
  }
  if (file && (file.id.length > 500 || !file.id)) throw new Error('Invalid file.');
  const unsupported = ['voice', 'audio', 'video', 'sticker', 'animation', 'video_note'].some(
    (key) => key in m,
  );
  if (!body && !file && !unsupported) return null;
  return {
    updateId: String(update.update_id),
    chatId: String(m.chat.id),
    senderName:
      [m.from.first_name, m.from.last_name]
        .filter((v) => typeof v === 'string')
        .join(' ')
        .trim()
        .slice(0, 200) || 'Telegram resident',
    text:
      body ||
      (file ? '[Attachment]' : '[Unsupported attachment: please send text, photos, or a PDF]'),
    file,
  };
};

export const webhook = httpAction(async (ctx, request) => {
  const id = new URL(request.url).searchParams.get('integration');
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!id || !secret) return new Response('Unauthorized', { status: 401 });
  const valid = await ctx.runQuery(internal.austi.intake.authenticate, { id, secret });
  if (!valid) return new Response('Unauthorized', { status: 401 });
  let message;
  try {
    if (Number(request.headers.get('content-length')) > 64000)
      return new Response('Update too large', { status: 413 });
    const body = await request.text();
    if (body.length > 64000) return new Response('Update too large', { status: 413 });
    message = parseUpdate(JSON.parse(body));
  } catch {
    return new Response('Invalid update', { status: 400 });
  }
  if (message) await ctx.runMutation(internal.austi.intake.receive, { id: valid, secret, message });
  return new Response('OK');
});
