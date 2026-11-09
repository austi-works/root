'use node';

import { chat } from '@tanstack/ai';
import { createVercelGatewayText } from '@tanstack/ai-vercel-gateway';
import { v } from 'convex/values';

import { internal } from '#convex/_generated/api';
import { internalAction } from '#convex/_generated/server';
import {
  CAMPAIGN_SYSTEM_PROMPT,
  LEARN_SYSTEM_PROMPT,
  REVISION_SYSTEM_PROMPT,
  htmlToText,
  isPublicHostname,
  parseBrand,
  parseDrafts,
  parseRevision,
} from '#convex/marketing/ai';
import { reportGeneration } from '#convex/marketing/analytics';

// Available on the AI Gateway free tier. Set MARKETING_MODEL to move to a paid model.
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const marketingModel = () => (process.env.MARKETING_MODEL ?? DEFAULT_MODEL) as typeof DEFAULT_MODEL;
const MODEL_TIMEOUT_MS = 120_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;

const complete = async (systemPrompt: string, prompt: string) => {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY is not set.');
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), MODEL_TIMEOUT_MS);
  try {
    return await chat({
      adapter: createVercelGatewayText(marketingModel(), apiKey, { api: 'chat', maxRetries: 1 }),
      systemPrompts: [systemPrompt],
      messages: [{ role: 'user', content: prompt }],
      abortController,
      modelOptions: { max_tokens: 2 ** 13 },
      stream: false,
      debug: false,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const readPage = async (websiteUrl: string) => {
  const response = await fetch(websiteUrl, {
    headers: { accept: 'text/html', 'user-agent': 'AustiBrandReader/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok || !isPublicHostname(new URL(response.url).hostname) || !response.body)
    throw new Error(`Could not read ${websiteUrl}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytes = 0;
  while (bytes < MAX_PAGE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return htmlToText(html);
};

const brandBlock = (workspace: {
  name: string;
  websiteUrl: string;
  summary: string;
  audience: string;
  voice: string;
}) => `<brand>
Name: ${workspace.name}
Website: ${workspace.websiteUrl || 'not provided'}
Summary: ${workspace.summary || 'not provided'}
Audience: ${workspace.audience || 'not provided'}
Voice: ${workspace.voice || 'not provided'}
</brand>`;

export const learnBrand = internalAction({
  args: { workspaceId: v.id('marketingWorkspaces') },
  handler: async (ctx, { workspaceId }) => {
    const startedAt = Date.now();
    const workspace = await ctx.runQuery(internal.marketing.generationState.learnContext, {
      workspaceId,
    });
    if (!workspace) return;
    const report = (error?: unknown) =>
      reportGeneration({
        ownerId: workspace.ownerId,
        kind: 'learn',
        model: marketingModel(),
        startedAt,
        error,
      });
    try {
      const page = await readPage(workspace.websiteUrl);
      const brand = parseBrand(
        await complete(
          LEARN_SYSTEM_PROMPT,
          `Business name: ${workspace.name}\n<website>\n${page}\n</website>`,
        ),
      );
      await ctx.runMutation(internal.marketing.generationState.saveLearned, {
        workspaceId,
        ...brand,
      });
      await report();
    } catch (error) {
      console.error('learnBrand failed', error);
      await report(error);
      await ctx.runMutation(internal.marketing.generationState.failLearn, {
        workspaceId,
        error: 'Austi could not learn from that website. Try again, or fill in your brand by hand.',
      });
    }
  },
});

export const generateCampaign = internalAction({
  args: { campaignId: v.id('marketingCampaigns') },
  handler: async (ctx, { campaignId }) => {
    const startedAt = Date.now();
    const context = await ctx.runQuery(internal.marketing.generationState.campaignContext, {
      campaignId,
    });
    if (!context) return;
    const { campaign, workspace, products } = context;
    const report = (error?: unknown) =>
      reportGeneration({
        ownerId: workspace.ownerId,
        kind: 'campaign',
        model: marketingModel(),
        startedAt,
        error,
      });
    try {
      const productLines = products.map((p) => `- ${p.name}: ${p.description}`).join('\n');
      const result = parseDrafts(
        await complete(
          CAMPAIGN_SYSTEM_PROMPT,
          `${brandBlock(workspace)}
<brand>
Products:
${productLines || 'not provided'}
</brand>
Campaign name: ${campaign.name}
Idea: ${campaign.idea}
Offer: ${campaign.offer || 'none stated, so do not invent one'}
Audience for this campaign: ${campaign.audience || 'the brand audience'}
Requested channels: ${campaign.channels.join(', ')}`,
        ),
        campaign.channels,
      );
      await ctx.runMutation(internal.marketing.generationState.saveCampaign, {
        campaignId,
        ...result,
      });
      await report();
    } catch (error) {
      console.error('generateCampaign failed', error);
      await report(error);
      await ctx.runMutation(internal.marketing.generationState.failCampaign, {
        campaignId,
        error: 'Austi could not write these drafts. Please try again.',
      });
    }
  },
});

export const reviseDraft = internalAction({
  args: { draftId: v.id('marketingDrafts'), note: v.string() },
  handler: async (ctx, { draftId, note }) => {
    const startedAt = Date.now();
    const context = await ctx.runQuery(internal.marketing.generationState.revisionContext, {
      draftId,
    });
    if (!context) return;
    const { draft, workspace } = context;
    const report = (error?: unknown) =>
      reportGeneration({
        ownerId: workspace.ownerId,
        kind: 'revision',
        model: marketingModel(),
        startedAt,
        error,
      });
    try {
      const revision = parseRevision(
        await complete(
          REVISION_SYSTEM_PROMPT,
          `${brandBlock(workspace)}
Channel: ${draft.channel}
Current headline: ${draft.headline}
Current body:
${draft.body}

Reviewer's note: ${note}`,
        ),
      );
      await ctx.runMutation(internal.marketing.generationState.saveRevision, {
        draftId,
        ...revision,
      });
      await report();
    } catch (error) {
      console.error('reviseDraft failed', error);
      await report(error);
      await ctx.runMutation(internal.marketing.generationState.failRevision, {
        draftId,
        error: 'I could not revise this draft. Please try again or edit it by hand.',
      });
    }
  },
});
