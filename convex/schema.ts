import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
  campaignStatusValidator,
  channelValidator,
  draftStatusValidator,
  generationKindValidator,
  learnStatusValidator,
} from '#convex/marketing/validators';

export default defineSchema({
  marketingWorkspaces: defineTable({
    ownerId: v.string(),
    name: v.string(),
    websiteUrl: v.string(),
    summary: v.string(),
    audience: v.string(),
    voice: v.string(),
    learnStatus: learnStatusValidator,
    learnError: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_ownerId', ['ownerId']),

  marketingProducts: defineTable({
    workspaceId: v.id('marketingWorkspaces'),
    name: v.string(),
    description: v.string(),
    source: v.union(v.literal('website'), v.literal('manual')),
  }).index('by_workspaceId', ['workspaceId']),

  marketingCampaigns: defineTable({
    workspaceId: v.id('marketingWorkspaces'),
    name: v.string(),
    idea: v.string(),
    offer: v.string(),
    audience: v.string(),
    channels: v.array(channelValidator),
    angles: v.array(v.string()),
    status: campaignStatusValidator,
    generationError: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_workspaceId', ['workspaceId']),

  marketingDrafts: defineTable({
    workspaceId: v.id('marketingWorkspaces'),
    campaignId: v.id('marketingCampaigns'),
    campaignName: v.string(),
    channel: channelValidator,
    headline: v.string(),
    body: v.string(),
    status: draftStatusValidator,
    version: v.number(),
    revising: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_campaignId', ['campaignId'])
    .index('by_workspaceId_and_status', ['workspaceId', 'status']),

  marketingDraftComments: defineTable({
    workspaceId: v.id('marketingWorkspaces'),
    draftId: v.id('marketingDrafts'),
    author: v.union(v.literal('you'), v.literal('austi')),
    body: v.string(),
  }).index('by_draftId', ['draftId']),

  marketingGenerations: defineTable({
    workspaceId: v.id('marketingWorkspaces'),
    kind: generationKindValidator,
  }).index('by_workspaceId', ['workspaceId']),
});
