import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from '#convex/_generated/api';
import { MAX_GENERATIONS_PER_DAY } from '#convex/marketing/access';
import schema from '#convex/schema';

const modules = import.meta.glob('../../../convex/**/*.ts');

const setup = async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: 'owner' });
  const stranger = t.withIdentity({ subject: 'stranger' });
  await owner.mutation(api.marketing.workspaces.create, { name: 'Sunday', websiteUrl: '' });
  await stranger.mutation(api.marketing.workspaces.create, { name: 'Other', websiteUrl: '' });
  const campaignId = await owner.mutation(api.marketing.campaigns.create, {
    name: 'Launch',
    idea: 'A slower weekend',
    offer: '',
    audience: '',
    channels: ['email'],
  });
  await t.mutation(internal.marketing.generationState.saveCampaign, {
    campaignId,
    angles: ['Slow mornings'],
    drafts: [{ channel: 'email', headline: 'Put the kettle on', body: 'Hello' }],
  });
  const { drafts } = await owner.query(api.marketing.campaigns.get, { campaignId });
  return { t, owner, stranger, campaignId, draftId: drafts[0]!._id };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('marketing workflow', () => {
  it('requires sign-in', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.marketing.workspaces.get, {})).rejects.toThrow('Not authenticated');
  });

  it('keeps one workspace per owner', async () => {
    const { owner } = await setup();
    const existing = await owner.query(api.marketing.workspaces.get, {});
    const again = await owner.mutation(api.marketing.workspaces.create, {
      name: 'Second',
      websiteUrl: '',
    });
    expect(again).toBe(existing!._id);
  });

  it('hides one workspace’s campaigns and drafts from another', async () => {
    const { stranger, campaignId, draftId } = await setup();
    await expect(stranger.query(api.marketing.campaigns.get, { campaignId })).rejects.toThrow(
      'Campaign not found',
    );
    await expect(stranger.query(api.marketing.drafts.get, { draftId })).rejects.toThrow(
      'Draft not found',
    );
    await expect(
      stranger.mutation(api.marketing.drafts.decide, { draftId, decision: 'approved' }),
    ).rejects.toThrow('Draft not found');
  });

  it('sends a draft back to review when an approved draft is edited', async () => {
    const { owner, draftId } = await setup();
    await owner.mutation(api.marketing.drafts.decide, { draftId, decision: 'approved' });
    await owner.mutation(api.marketing.drafts.edit, { draftId, headline: 'New', body: 'Words' });
    const { draft } = await owner.query(api.marketing.drafts.get, { draftId });
    expect(draft).toMatchObject({ status: 'pending', version: 2, headline: 'New' });
  });

  it('locks a draft while it is being revised, then returns it for review', async () => {
    const { t, owner, draftId } = await setup();
    await owner.mutation(api.marketing.drafts.requestRevision, { draftId, note: 'Shorter' });
    await expect(
      owner.mutation(api.marketing.drafts.decide, { draftId, decision: 'approved' }),
    ).rejects.toThrow('still revising');

    await t.mutation(internal.marketing.generationState.saveRevision, {
      draftId,
      headline: 'Kettle on',
      body: 'Hi',
      reply: 'Shortened it.',
    });
    const { draft, comments } = await owner.query(api.marketing.drafts.get, { draftId });
    expect(draft).toMatchObject({ status: 'pending', revising: false, version: 2 });
    expect(comments.map((comment) => comment.author)).toEqual(['you', 'austi']);
  });

  it('does not add drafts to a campaign that has already finished', async () => {
    const { t, owner, campaignId } = await setup();
    await t.mutation(internal.marketing.generationState.saveCampaign, {
      campaignId,
      angles: [],
      drafts: [{ channel: 'email', headline: 'Duplicate', body: 'Again' }],
    });
    const { drafts } = await owner.query(api.marketing.campaigns.get, { campaignId });
    expect(drafts).toHaveLength(1);
  });

  it('stops generating after the daily allowance', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: 'owner' });
    const workspaceId = await owner.mutation(api.marketing.workspaces.create, {
      name: 'Sunday',
      websiteUrl: '',
    });
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_GENERATIONS_PER_DAY; i += 1)
        await ctx.db.insert('marketingGenerations', { workspaceId, kind: 'campaign' });
    });
    await expect(
      owner.mutation(api.marketing.campaigns.create, {
        name: 'Launch',
        idea: 'Idea',
        offer: '',
        audience: '',
        channels: ['ads'],
      }),
    ).rejects.toThrow();
  });
});
