import { ConvexError } from 'convex/values';

// Never surface fetch errors containing the bot token in its URL.
export const telegramCall = async (
  token: string,
  method: string,
  body: Record<string, unknown>,
) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const payload: unknown = await response.json();
    if (
      !response.ok ||
      !payload ||
      typeof payload !== 'object' ||
      !('ok' in payload) ||
      payload.ok !== true ||
      !('result' in payload)
    )
      throw new Error();
    return payload.result;
  } catch {
    throw new ConvexError(
      'Telegram could not complete the request. Check the bot token and try again.',
    );
  }
};

export const downloadAttachment = async (token: string, fileId: string) => {
  const info = await telegramCall(token, 'getFile', { file_id: fileId });
  if (
    !info ||
    typeof info !== 'object' ||
    !('file_path' in info) ||
    typeof info.file_path !== 'string' ||
    !/^[\w./-]+$/.test(info.file_path) ||
    info.file_path.includes('..')
  )
    throw new Error('Attachment unavailable.');
  if (
    'file_size' in info &&
    (typeof info.file_size !== 'number' || info.file_size > 2 * 1024 * 1024)
  )
    throw new Error('Attachment exceeds the 2 MB limit.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${info.file_path}`, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });
  if (!response.ok || Number(response.headers.get('content-length')) > 2 * 1024 * 1024)
    throw new Error('Attachment unavailable or too large.');
  // Bound reads even when Telegram does not supply Content-Length.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Attachment unavailable.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) throw new Error('Attachment exceeds the 2 MB limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const type = fileType(bytes);
  if (!type) throw new Error('Send a JPEG, PNG, WebP, or PDF.');
  return new Blob([bytes], { type });
};

export const fileType = (bytes: Uint8Array) => {
  const signature = Array.from(bytes.slice(0, 12));
  return signature[0] === 255 && signature[1] === 216 && signature[2] === 255
    ? 'image/jpeg'
    : signature.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
      ? 'image/png'
      : new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
        ? 'application/pdf'
        : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
            new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
          ? 'image/webp'
          : null;
};
