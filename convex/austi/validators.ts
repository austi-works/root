import { v, type Infer } from 'convex/values';

export const intakeSource = v.object({
  provider: v.literal('telegram'),
  integrationId: v.id('austiIntegrations'),
  chatId: v.string(),
});

export const statuses = [
  'New',
  'Needs information',
  'Needs review',
  'Awaiting approval',
  'Awaiting contractor',
  'Awaiting scheduling',
  'Scheduled',
  'In progress',
  'Awaiting completion confirmation',
  'Resolved',
  'Cancelled',
] as const;
export const trades = ['Plumbing', 'Heating', 'Electrical', 'General repairs'] as const;
export const status = v.union(...statuses.map((value) => v.literal(value)));
export const trade = v.union(...trades.map((value) => v.literal(value)));
export const urgency = v.union(v.literal('Routine'), v.literal('Urgent'), v.literal('Emergency'));
export const role = v.union(v.literal('resident'), v.literal('owner'), v.literal('contractor'));
export const requestKind = v.union(
  v.literal('information'),
  v.literal('approval'),
  v.literal('assignment'),
  v.literal('scheduling'),
  v.literal('work'),
  v.literal('completion'),
);
export const rolesFor = (
  kind: Infer<typeof requestKind>,
): ('resident' | 'owner' | 'contractor')[] =>
  kind === 'scheduling'
    ? ['resident', 'contractor']
    : [
        kind === 'approval'
          ? 'owner'
          : ['assignment', 'work'].includes(kind)
            ? 'contractor'
            : 'resident',
      ];
export const visibility = v.union(v.literal('internal'), v.literal('resident'));
export const outcome = v.union(
  v.literal('Repaired'),
  v.literal('Temporary fix'),
  v.literal('Parts required'),
  v.literal('Unable to complete'),
);
export const attachment = v.object({ storageId: v.id('_storage'), name: v.string() });
export const sharedFile = v.object({
  name: v.string(),
  url: v.union(v.string(), v.null()),
  visibility,
});
export const contact = v.object({ name: v.string(), email: v.string() });
export const response = v.object({
  choice: v.union(
    v.literal('submit'),
    v.literal('approve'),
    v.literal('decline'),
    v.literal('clarify'),
    v.literal('accept'),
    v.literal('confirm'),
    v.literal('cancel'),
    v.literal('resolved'),
    v.literal('unresolved'),
  ),
  body: v.string(),
  attachments: v.array(attachment),
  outcome: v.optional(outcome),
});
export const caseInput = {
  title: v.string(),
  property: v.string(),
  unit: v.string(),
  category: trade,
  urgency,
  report: v.string(),
  resident: contact,
  owner: contact,
  access: v.string(),
};
export const contractorInput = {
  company: v.string(),
  contact: v.string(),
  email: v.string(),
  phone: v.string(),
  trades: v.array(trade),
  area: v.string(),
  properties: v.string(),
  active: v.boolean(),
  timeoutHours: v.number(),
  priority: v.number(),
};
export const caseFields = {
  ...caseInput,
  source: v.optional(intakeSource),
  workspace: v.string(),
  coordinator: v.string(),
  status,
  nextAction: v.string(),
  responsible: v.string(),
  dueAt: v.optional(v.number()),
  stageStartedAt: v.number(),
  updatedAt: v.number(),
  overdue: v.boolean(),
  automation: v.boolean(),
  reminderHours: v.number(),
  maxReminders: v.number(),
  followupCount: v.number(),
  reopenedCount: v.number(),
  missedAppointments: v.number(),
  manualFollowups: v.optional(v.number()),
  contractorId: v.optional(v.id('austiContractors')),
  pendingRequest: v.optional(v.id('austiRequests')),
  appointmentAt: v.optional(v.number()),
  appointmentEnd: v.optional(v.number()),
  presenceRequired: v.boolean(),
  completion: v.optional(v.object({ outcome, notes: v.string() })),
  resolvedAt: v.optional(v.number()),
  cancellationReason: v.optional(v.string()),
};
export const caseDoc = v.object({
  ...caseFields,
  _id: v.id('austiCases'),
  _creationTime: v.number(),
});
export const requestFields = {
  caseId: v.id('austiCases'),
  kind: requestKind,
  body: v.string(),
  amount: v.optional(v.number()),
  appointmentAt: v.optional(v.number()),
  appointmentEnd: v.optional(v.number()),
  residentConfirmed: v.boolean(),
  contractorConfirmed: v.boolean(),
  state: v.union(v.literal('pending'), v.literal('completed'), v.literal('superseded')),
  dueAt: v.number(),
  reminders: v.number(),
  escalated: v.optional(v.boolean()),
  automaticLinksPaused: v.optional(v.boolean()),
};
export const requestDoc = v.object({
  ...requestFields,
  _id: v.id('austiRequests'),
  _creationTime: v.number(),
});
export const eventFields = {
  caseId: v.id('austiCases'),
  actor: v.string(),
  body: v.string(),
  visibility,
  kind: v.union(
    v.literal('activity'),
    v.literal('note'),
    v.literal('response'),
    v.literal('stage'),
  ),
  previousStatus: v.optional(status),
  durationMs: v.optional(v.number()),
};
export const eventDoc = v.object({
  ...eventFields,
  _id: v.id('austiEvents'),
  _creationTime: v.number(),
});
export const contractorDoc = v.object({
  ...contractorInput,
  workspace: v.string(),
  recipientVersion: v.number(),
  _id: v.id('austiContractors'),
  _creationTime: v.number(),
});
export const notificationState = v.union(
  v.literal('queued'),
  v.literal('sending'),
  v.literal('accepted'),
  v.literal('failed'),
  v.literal('blocked'),
  v.literal('cancelled'),
);
export const notificationFields = {
  caseId: v.id('austiCases'),
  requestId: v.optional(v.id('austiRequests')),
  role,
  telegram: v.optional(intakeSource),
  to: v.string(),
  subject: v.string(),
  body: v.string(),
  state: notificationState,
  attempts: v.number(),
  error: v.optional(v.string()),
  providerId: v.optional(v.string()),
  // The rendered payload is internal only, retaining the same link across idempotent retries.
  payload: v.optional(v.string()),
};
