import { defineTable } from 'convex/server';
import { v } from 'convex/values';

import { integrationFields, intakeMessageFields } from './intakeValidators';
import {
  caseFields,
  contractorInput,
  eventFields,
  notificationFields,
  requestFields,
  role,
  visibility,
} from './validators';

export const austiTables = {
  austiIntegrations: defineTable(integrationFields)
    .index('by_workspace', ['workspace'])
    .index('by_botId', ['botId']),
  austiIntakeConversations: defineTable({
    integrationId: v.id('austiIntegrations'),
    chatId: v.string(),
    caseId: v.optional(v.id('austiCases')),
    activeMessage: v.optional(v.id('austiIntakeMessages')),
    // Commands start a fresh intake without deleting the preceding conversation.
    startedAt: v.number(),
  }).index('by_integrationId_and_chatId', ['integrationId', 'chatId']),
  austiIntakeMessages: defineTable(intakeMessageFields)
    .index('by_integrationId_and_updateId', ['integrationId', 'updateId'])
    .index('by_integrationId', ['integrationId'])
    .index('by_integrationId_and_state', ['integrationId', 'state'])
    .index('by_conversationId', ['conversationId'])
    .index('by_conversationId_and_state', ['conversationId', 'state']),
  austiCases: defineTable(caseFields).index('by_workspace_and_updatedAt', [
    'workspace',
    'updatedAt',
  ]),
  austiContractors: defineTable({
    ...contractorInput,
    workspace: v.string(),
    recipientVersion: v.number(),
  }).index('by_workspace', ['workspace']),
  austiEvents: defineTable(eventFields)
    .index('by_caseId', ['caseId'])
    .index('by_caseId_and_visibility', ['caseId', 'visibility']),
  austiRequests: defineTable(requestFields).index('by_caseId', ['caseId']),
  austiLinks: defineTable({
    requestId: v.id('austiRequests'),
    role,
    recipientEmail: v.string(),
    recipientVersion: v.number(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index('by_tokenHash', ['tokenHash'])
    .index('by_requestId', ['requestId']),
  austiFiles: defineTable({
    caseId: v.id('austiCases'),
    storageId: v.id('_storage'),
    name: v.string(),
    visibility,
  })
    .index('by_caseId', ['caseId'])
    .index('by_caseId_and_visibility', ['caseId', 'visibility']),
  austiUploads: defineTable({ caseId: v.id('austiCases'), storageId: v.id('_storage') }).index(
    'by_storageId',
    ['storageId'],
  ),
  austiNotifications: defineTable(notificationFields).index('by_caseId', ['caseId']),
  austiMembers: defineTable({ workspace: v.string(), email: v.string() })
    .index('by_workspace', ['workspace'])
    .index('by_email', ['email'])
    .index('by_workspace_and_email', ['workspace', 'email']),
};
