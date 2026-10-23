import { v } from 'convex/values';

import { contact, trade, urgency } from './validators';

export const intakeModel = v.union(
  v.literal('google/gemini-2.5-flash-lite'),
  v.literal('openai/gpt-5-mini'),
);
export const integrationStatus = v.union(
  v.literal('connecting'),
  v.literal('connected'),
  v.literal('disconnected'),
  v.literal('failed'),
);
export const integrationFields = {
  workspace: v.string(),
  provider: v.literal('telegram'),
  botId: v.string(),
  username: v.string(),
  token: v.string(),
  secret: v.string(),
  status: integrationStatus,
  owner: contact,
  property: v.string(),
  model: intakeModel,
  error: v.optional(v.string()),
  lastReceivedAt: v.optional(v.number()),
};
export const inbound = v.object({
  updateId: v.string(),
  chatId: v.string(),
  senderName: v.string(),
  text: v.string(),
  file: v.optional(v.object({ id: v.string(), name: v.string() })),
});
export const extraction = v.object({
  isReport: v.boolean(),
  title: v.string(),
  property: v.string(),
  unit: v.string(),
  report: v.string(),
  category: trade,
  urgency,
  access: v.string(),
});
export const intakeMessageFields = {
  integrationId: v.id('austiIntegrations'),
  conversationId: v.id('austiIntakeConversations'),
  ...inbound.fields,
  state: v.union(
    v.literal('queued'),
    v.literal('processing'),
    v.literal('processed'),
    v.literal('failed'),
  ),
  attempts: v.number(),
  caseId: v.optional(v.id('austiCases')),
  storageId: v.optional(v.id('_storage')),
  attachmentError: v.optional(v.string()),
  reply: v.optional(v.string()),
  replyAttempts: v.optional(v.number()),
  replyState: v.optional(v.union(v.literal('sending'), v.literal('sent'), v.literal('failed'))),
  error: v.optional(v.string()),
};
