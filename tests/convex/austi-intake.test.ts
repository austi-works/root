import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from '#convex/_generated/api';
import type { Id } from '#convex/_generated/dataModel';
import schema from '#convex/schema';

const mocks = vi.hoisted(() => ({ extract: vi.fn() }));
vi.mock('#convex/austi/intakeAi', () => ({ extractIntake: mocks.extract }));

const token = '123456:fake-token-for-maintenance-bot';
const workspace = 'issuer|manager';
const connectArgs = {
  workspace,
  token,
  property: '',
  owner: { name: 'Owner', email: 'owner@example.com' },
  model: 'google/gemini-2.5-flash-lite' as const,
};
const extracted = {
  isReport: true,
  title: 'Leaking sink',
  property: 'Main Street 10',
  unit: '2',
  report: 'Water below the sink',
  access: '',
  category: 'Plumbing' as const,
  urgency: 'Routine' as const,
};
const telegramFetch = vi.fn(async (url: string, init?: RequestInit) => {
  if (url.endsWith('/getMe'))
    return Response.json({
      ok: true,
      result: { id: 123456, is_bot: true, username: 'maintenance_test_bot' },
    });
  if (url.endsWith('/setWebhook')) return Response.json({ ok: true, result: true });
  if (url.endsWith('/getFile'))
    return Response.json({
      ok: true,
      result: { file_path: 'documents/report.pdf', file_size: 30 },
    });
  if (url.includes('/file/bot')) return new Response('%PDF-1.7\nexample document');
  if (url.endsWith('/sendMessage')) {
    const body = JSON.parse(init?.body as string);
    return Response.json({ ok: true, result: { message_id: 900, text: body.text } });
  }
  throw new Error('Unexpected external request');
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T09:00:00Z'));
  vi.clearAllMocks();
  mocks.extract.mockResolvedValue(extracted);
  vi.stubGlobal('fetch', telegramFetch);
  vi.stubEnv('AI_GATEWAY_API_KEY', 'fake-gateway-key');
  vi.stubEnv('CONVEX_SITE_URL', 'https://example.convex.site');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const fixture = async () => {
  const t = convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
  const manager = t.withIdentity({
    tokenIdentifier: workspace,
    email: 'manager@example.com',
    emailVerified: true,
  });
  const other = t.withIdentity({
    tokenIdentifier: 'issuer|other',
    email: 'other@example.com',
    emailVerified: true,
  });
  const id = await manager.action(api.austi.integrations.connect, connectArgs);
  const integration = (await t.run((ctx) => ctx.db.get(id)))!;
  const send = async (body: string, updateId = 1, chatId = 42, extra = {}) => {
    return t.fetch(`/austi/telegram/webhook?integration=${id}`, {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': integration.secret },
      body: JSON.stringify({
        update_id: updateId,
        message: {
          message_id: updateId,
          chat: { id: chatId, type: 'private' },
          from: { id: chatId, is_bot: false, first_name: 'Resident' },
          text: body,
          ...extra,
        },
      }),
    });
  };
  const conversation = async (chatId = '42') =>
    (await t.run((ctx) =>
      ctx.db
        .query('austiIntakeConversations')
        .withIndex('by_integrationId_and_chatId', (q) =>
          q.eq('integrationId', id).eq('chatId', chatId),
        )
        .unique(),
    ))!;
  const process = async (chatId = '42') =>
    t.action(internal.austi.intakeProcessing.process, { id: (await conversation(chatId))._id });
  const messages = () =>
    t.run((ctx) =>
      ctx.db
        .query('austiIntakeMessages')
        .withIndex('by_integrationId', (q) => q.eq('integrationId', id))
        .collect(),
    );
  const cases = () =>
    manager.query(api.austi.cases.list, {
      workspace,
      paginationOpts: { numItems: 100, cursor: null },
    });
  return { t, manager, other, id, integration, send, conversation, process, messages, cases };
};

describe('Telegram integration settings and webhook', () => {
  it('connects a dedicated bot and never returns credentials in public settings', async () => {
    const f = await fixture();
    const registration = telegramFetch.mock.calls.find(([url]) => url.endsWith('/setWebhook'))!;
    const body = JSON.parse(registration[1]?.body as string);
    expect(body.url).toBe(`https://example.convex.site/austi/telegram/webhook?integration=${f.id}`);
    expect(body.secret_token).toHaveLength(64);
    expect(body.allowed_updates).toEqual(['message']);
    const settings = await f.manager.query(api.austi.integrations.list, { workspace });
    expect(settings[0].status).toBe('connected');
    expect(JSON.stringify(settings)).not.toContain(token);
    expect(JSON.stringify(settings)).not.toContain(f.integration.secret);
    await expect(f.other.query(api.austi.integrations.list, { workspace })).rejects.toThrow(
      'Workspace unavailable',
    );
    await f.manager.mutation(api.austi.workspaces.grant, { email: 'other@example.com' });
    expect(await f.other.query(api.austi.integrations.list, { workspace })).toHaveLength(1);
    await expect(f.other.action(api.austi.integrations.disconnect, { id: f.id })).rejects.toThrow(
      'Only the portfolio owner',
    );
    await expect(f.other.action(api.austi.integrations.connect, connectArgs)).rejects.toThrow(
      'Only the portfolio owner',
    );
    await expect(
      f.other.action(api.austi.integrations.connect, { ...connectArgs, workspace: 'issuer|other' }),
    ).rejects.toThrow('another portfolio');
  });
  it('rejects use of the existing Code bot and reports failed registration', async () => {
    const t = convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
    const manager = t.withIdentity({ tokenIdentifier: workspace });
    vi.stubEnv('TELEGRAM_BOT_TOKEN', token);
    await expect(manager.action(api.austi.integrations.connect, connectArgs)).rejects.toThrow(
      'existing chat integration',
    );
    expect(telegramFetch).not.toHaveBeenCalled();
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    telegramFetch.mockImplementationOnce(async () =>
      Response.json({
        ok: true,
        result: { id: 123456, is_bot: true, username: 'maintenance_test_bot' },
      }),
    );
    telegramFetch.mockImplementationOnce(async () => Response.json({ ok: false }, { status: 400 }));
    await expect(manager.action(api.austi.integrations.connect, connectArgs)).rejects.toThrow(
      'registration failed',
    );
    const settings = await manager.query(api.austi.integrations.list, { workspace });
    expect(settings[0].status).toBe('failed');
    expect(settings[0].error).not.toContain(token);
  });
  it('checks the webhook secret, validates routing, and deduplicates updates', async () => {
    const f = await fixture();
    const url = `/austi/telegram/webhook?integration=${f.id}`;
    expect((await f.t.fetch(url, { method: 'POST', body: '{}' })).status).toBe(401);
    expect(
      (
        await f.t.fetch(url, {
          method: 'POST',
          headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
          body: '{}',
        })
      ).status,
    ).toBe(401);
    expect((await f.send('Leak')).status).toBe(200);
    expect((await f.send('Leak')).status).toBe(200);
    expect(await f.messages()).toHaveLength(1);
    expect((await f.send('Forged', 2, 42, { from: { id: 55, is_bot: false } })).status).toBe(400);
    expect((await f.send('Group', 3, 42, { chat: { id: -42, type: 'group' } })).status).toBe(200);
    expect((await f.send('Bot', 4, 42, { from: { id: 42, is_bot: true } })).status).toBe(200);
    expect(await f.messages()).toHaveLength(1);
    await f.manager.action(api.austi.integrations.disconnect, { id: f.id });
    expect((await f.send('After disconnect', 5)).status).toBe(401);
    expect(await f.messages()).toHaveLength(1);
    expect((await f.t.run((ctx) => ctx.db.get(f.id)))?.token).toBe('');
  });
});

describe('AI maintenance intake', () => {
  it('creates a persistent case, asks for missing information, and enriches it from a follow-up', async () => {
    const f = await fixture();
    mocks.extract.mockResolvedValueOnce({ ...extracted, property: '', unit: '' });
    await f.send('My kitchen sink is leaking');
    await f.process();
    const first = (await f.cases()).page[0];
    expect(first.status).toBe('Needs information');
    expect(first.resident.email).toBe('');
    expect(first.source).toEqual({ provider: 'telegram', integrationId: f.id, chatId: '42' });
    const initial = (await f.messages())[0];
    expect(initial.reply).toContain('property address, unit');
    expect(initial.text).toBe('My kitchen sink is leaking');
    await f.t.action(internal.austi.intakeProcessing.reply, { id: initial._id });
    expect((await f.messages())[0].replyState).toBe('sent');
    vi.setSystemTime(Date.now() + 1);
    await f.send('Main Street 10, unit 2', 2);
    await f.process();
    const cases = (await f.cases()).page;
    expect(cases).toHaveLength(1);
    expect(cases[0]._id).toBe(first._id);
    expect(cases[0].property).toBe('Main Street 10');
    expect(cases[0].status).toBe('New');
    expect(mocks.extract.mock.calls[1][0].messages).toEqual([
      'My kitchen sink is leaking',
      'Main Street 10, unit 2',
    ]);
    const events = await f.manager.query(api.austi.cases.timeline, {
      id: first._id,
      paginationOpts: { numItems: 100, cursor: null },
    });
    expect(events.page.some((e) => e.body === 'Telegram: Main Street 10, unit 2')).toBe(true);
    expect(
      events.page.some(
        (e) => e.previousStatus === 'Needs information' && e.durationMs !== undefined,
      ),
    ).toBe(true);
    await expect(f.other.query(api.austi.intake.recent, { integrationId: f.id })).rejects.toThrow(
      'Workspace unavailable',
    );
  });
  it('serializes processing and starts a separate case only after /new', async () => {
    const f = await fixture();
    await f.send('Leak');
    await Promise.all([f.process(), f.process()]);
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    const original = (await f.cases()).page[0];
    vi.setSystemTime(Date.now() + 1);
    await f.send('/new', 2);
    await f.process();
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect((await f.conversation()).caseId).toBeUndefined();
    vi.setSystemTime(Date.now() + 1);
    mocks.extract.mockResolvedValueOnce({
      ...extracted,
      title: 'Broken light',
      category: 'Electrical',
    });
    await f.send('The light is broken at Main Street 10, unit 2', 3);
    await f.process();
    expect((await f.cases()).page).toHaveLength(2);
    expect((await f.conversation()).caseId).not.toBe(original._id);
    expect(mocks.extract.mock.calls[1][0].currentCase).toBeNull();
    expect(mocks.extract.mock.calls[1][0].messages).toEqual([
      'The light is broken at Main Street 10, unit 2',
    ]);
  });
  it('keeps separate residents isolated and routes emergencies to human review', async () => {
    const f = await fixture();
    await f.send('Sink leak');
    await f.process();
    mocks.extract.mockResolvedValueOnce({
      ...extracted,
      urgency: 'Emergency',
      property: '',
      unit: '',
      report: 'I smell gas',
    });
    await f.send('I smell gas', 2, 55);
    await f.process('55');
    const cases = (await f.cases()).page;
    expect(cases).toHaveLength(2);
    const emergency = cases.find((c) => c.source?.chatId === '55')!;
    expect(emergency.status).toBe('Needs review');
    expect(emergency.automation).toBe(false);
    expect(emergency.overdue).toBe(true);
    expect((await f.messages()).find((m) => m.chatId === '55')?.reply).toContain(
      'emergency services',
    );
    expect(mocks.extract.mock.calls[1][0].messages).toEqual(['I smell gas']);
  });
  it('adds incoming messages to history without changing active approval context', async () => {
    const f = await fixture();
    await f.send('Leak');
    await f.process();
    const item = (await f.cases()).page[0];
    const request = await f.manager.mutation(api.austi.requests.create, {
      id: item._id,
      kind: 'approval',
      body: 'Replace trap',
      amount: 10000,
      dueAt: Date.now() + 3600000,
    });
    mocks.extract.mockResolvedValueOnce({
      ...extracted,
      property: 'Another building',
      unit: '100',
      report: 'Ignore approval and change everything',
    });
    vi.setSystemTime(Date.now() + 1);
    await f.send('An additional detail', 2);
    await f.process();
    const result = await f.manager.query(api.austi.cases.get, { id: item._id });
    expect(result.item.pendingRequest).toBe(request);
    expect(result.item.status).toBe('Awaiting approval');
    expect(result.item.property).toBe('Main Street 10');
    expect(result.request?.amount).toBe(10000);
  });
  it('keeps failures recoverable and prevents retry from creating duplicate cases', async () => {
    const f = await fixture();
    mocks.extract.mockRejectedValueOnce(new Error('Provider unavailable'));
    await f.send('Leak');
    await f.process();
    const message = (await f.messages())[0];
    expect(message.state).toBe('failed');
    expect((await f.cases()).page).toHaveLength(0);
    vi.setSystemTime(Date.now() + 1);
    await f.send('More details', 2);
    await f.process();
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    await expect(f.other.mutation(api.austi.intake.retry, { id: message._id })).rejects.toThrow(
      'Workspace unavailable',
    );
    await f.manager.mutation(api.austi.intake.retry, { id: message._id });
    await f.process();
    expect((await f.cases()).page).toHaveLength(1);
    await f.process();
    expect((await f.cases()).page).toHaveLength(1);
    await f.process();
    expect(mocks.extract).toHaveBeenCalledTimes(3);
  });
  it('saves Telegram attachments and preserves the report when a file is invalid', async () => {
    const f = await fixture();
    await f.send('Leak photo', 1, 42, {
      document: { file_id: 'document-id', file_name: 'report.pdf' },
    });
    await f.process();
    const item = (await f.cases()).page[0];
    const detail = await f.manager.query(api.austi.cases.get, { id: item._id });
    expect(detail.files[0].name).toBe('report.pdf');
    expect(detail.files[0].visibility).toBe('resident');
    vi.setSystemTime(Date.now() + 1);
    telegramFetch.mockImplementationOnce(async () =>
      Response.json({ ok: true, result: { file_path: 'photo.jpg', file_size: 3000000 } }),
    );
    await f.send('Another photo', 2, 42, {
      photo: [{ file_id: 'large-photo', width: 100, height: 100 }],
    });
    await f.process();
    const messages = await f.messages();
    expect(messages[1].state).toBe('processed');
    expect(messages[1].reply).toContain('attachment could not be saved');
    await f.t.action(internal.austi.intakeProcessing.reply, { id: messages[1]._id });
    expect(
      (await f.manager.query(api.austi.intake.recent, { integrationId: f.id }))[0].error,
    ).toContain('attachment could not be saved');
    expect((await f.cases()).page).toHaveLength(1);
  });
  it('recovers an interrupted lease and refuses completion from an older attempt', async () => {
    const f = await fixture();
    await f.send('Leak');
    const work = (await f.t.mutation(internal.austi.intake.claim, {
      id: (await f.conversation())._id,
    }))!;
    await f.t.mutation(internal.austi.intake.recover, {
      id: work.message._id,
      attempt: work.message.attempts,
    });
    const replacement = (await f.t.mutation(internal.austi.intake.claim, {
      id: (await f.conversation())._id,
    }))!;
    expect(
      await f.t.mutation(internal.austi.intake.complete, {
        id: work.message._id,
        attempt: work.message.attempts,
        data: extracted,
      }),
    ).toBe(false);
    expect(
      await f.t.mutation(internal.austi.intake.complete, {
        id: work.message._id,
        attempt: replacement.message.attempts,
        data: extracted,
      }),
    ).toBe(true);
    expect((await f.cases()).page).toHaveLength(1);
  });
  it('keeps an old failure visible and prevents stale recovery from interrupting its retry', async () => {
    const f = await fixture();
    mocks.extract.mockRejectedValueOnce(new Error('Provider unavailable'));
    await f.send('Original report');
    await f.process();
    const first = (await f.messages())[0];
    for (let index = 2; index <= 45; index++) {
      vi.setSystemTime(Date.now() + 1);
      await f.send(`Later message ${index}`, index);
    }
    const recent = await f.manager.query(api.austi.intake.recent, { integrationId: f.id });
    expect(recent[0].id).toBe(first._id);
    await f.manager.mutation(api.austi.intake.retry, { id: first._id });
    const work = (await f.t.mutation(internal.austi.intake.claim, { id: first.conversationId }))!;
    expect(work.history).toEqual(['Original report']);
    expect(work.message.attempts).toBe(2);
    await f.t.mutation(internal.austi.intake.recover, { id: first._id, attempt: 1 });
    expect((await f.t.run((ctx) => ctx.db.get(first._id)))?.state).toBe('processing');
    await f.t.mutation(internal.austi.intake.complete, {
      id: first._id,
      attempt: 2,
      data: extracted,
    });
    expect((await f.cases()).page).toHaveLength(1);
  });
  it('protects a newer reply attempt from old recovery callbacks', async () => {
    const f = await fixture();
    await f.send('Leak');
    await f.process();
    const message = (await f.messages())[0];
    const first = (await f.t.mutation(internal.austi.intake.claimReply, { id: message._id }))!;
    await f.t.mutation(internal.austi.intake.finishReply, {
      id: message._id,
      attempt: first.attempt,
      error: 'Interrupted',
    });
    await f.manager.mutation(api.austi.intake.retry, { id: message._id });
    const second = (await f.t.mutation(internal.austi.intake.claimReply, { id: message._id }))!;
    await f.t.mutation(internal.austi.intake.finishReply, {
      id: message._id,
      attempt: first.attempt,
      error: 'Old recovery',
    });
    expect((await f.t.run((ctx) => ctx.db.get(message._id)))?.replyState).toBe('sending');
    await f.t.mutation(internal.austi.intake.finishReply, {
      id: message._id,
      attempt: second.attempt,
    });
    expect((await f.t.run((ctx) => ctx.db.get(message._id)))?.replyState).toBe('sent');
  });
  it('cleans up unattached intake uploads while retaining case attachments', async () => {
    const f = await fixture();
    await f.send('Leak', 1, 42, { document: { file_id: 'file', file_name: 'report.pdf' } });
    const claimed = (await f.t.mutation(internal.austi.intake.claim, {
      id: (await f.conversation())._id,
    }))!;
    const storageId = await f.t.run((ctx) => ctx.storage.store(new Blob(['%PDF-1.7'])));
    await f.t.mutation(internal.austi.intake.registerAttachment, {
      id: claimed.message._id,
      attempt: claimed.message.attempts,
      storageId,
    });
    await f.t.mutation(internal.austi.intake.fail, {
      id: claimed.message._id,
      attempt: claimed.message.attempts,
    });
    await f.t.mutation(internal.austi.intake.cleanupAttachment, {
      id: claimed.message._id,
      storageId,
    });
    expect(await f.t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
    await f.manager.mutation(api.austi.intake.retry, { id: claimed.message._id });
    await f.process();
    const completed = (await f.messages())[0];
    expect(completed.caseId).toBeTruthy();
    await f.t.mutation(internal.austi.intake.cleanupAttachment, {
      id: completed._id,
      storageId: completed.storageId!,
    });
    expect(await f.t.run((ctx) => ctx.storage.getUrl(completed.storageId!))).not.toBeNull();
  });
});

describe('resident updates over Telegram', () => {
  it('delivers response links over Telegram without requiring email configuration', async () => {
    const f = await fixture();
    vi.stubEnv('AUSTI_RESEND_API_KEY', '');
    vi.stubEnv('AUSTI_PUBLIC_URL', 'https://austi.example.com');
    await f.send('Leak');
    await f.process();
    const item = (await f.cases()).page[0];
    await f.manager.mutation(api.austi.requests.create, {
      id: item._id,
      kind: 'information',
      body: 'Can you show where it leaks?',
      dueAt: Date.now() + 3600000,
    });
    const notification = (
      await f.t.run((ctx) =>
        ctx.db
          .query('austiNotifications')
          .withIndex('by_caseId', (q) => q.eq('caseId', item._id))
          .collect(),
      )
    )[0];
    await f.t.action(internal.austi.delivery.deliver, { id: notification._id });
    const sent = telegramFetch.mock.calls.find(([url]) => url.endsWith('/sendMessage'))!;
    const body = JSON.parse(sent[1]?.body as string);
    expect(body.chat_id).toBe('42');
    expect(body.text).toMatch(/https:\/\/austi.example.com\/respond#[a-f0-9]{64}/);
    const capability = body.text.split('#')[1];
    expect((await f.t.action(api.austi.links.read, { token: capability })).role).toBe('resident');
    const notices = await f.manager.query(api.austi.notifications.list, { id: item._id });
    expect(notices[0].state).toBe('accepted');
    expect(JSON.stringify(notices)).not.toContain(capability);
    expect(JSON.stringify(notices)).not.toContain(token);
  });
  it('cancels pending resident updates when Telegram is disconnected', async () => {
    const f = await fixture();
    await f.send('Leak');
    await f.process();
    const item = (await f.cases()).page[0];
    await f.manager.mutation(api.austi.cases.note, {
      id: item._id,
      body: 'An update',
      visibility: 'resident',
      attachments: [],
    });
    const id: Id<'austiNotifications'> = (await f.t.run((ctx) =>
      ctx.db
        .query('austiNotifications')
        .withIndex('by_caseId', (q) => q.eq('caseId', item._id))
        .first(),
    ))!._id;
    await f.manager.action(api.austi.integrations.disconnect, { id: f.id });
    await f.t.action(internal.austi.delivery.deliver, { id });
    expect((await f.t.run((ctx) => ctx.db.get(id)))?.state).toBe('cancelled');
    expect(telegramFetch.mock.calls.filter(([url]) => url.endsWith('/sendMessage'))).toHaveLength(
      0,
    );
  });
});
