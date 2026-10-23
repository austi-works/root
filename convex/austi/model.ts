import { ConvexError } from 'convex/values';

import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { verifyIdentity } from '../utils';
import type { caseInput } from './validators';

export const createCaseRecord = async (
  ctx: MutationCtx,
  args: Pick<Doc<'austiCases'>, keyof typeof caseInput> & { workspace: string },
  coordinator: string,
  source?: Doc<'austiCases'>['source'],
) => {
  const now = Date.now();
  const review = args.urgency === 'Emergency';
  const id = await ctx.db.insert('austiCases', {
    ...args,
    source,
    title: text(args.title, 'Title', 200),
    property: text(args.property, 'Property', 300),
    unit: text(args.unit, 'Unit', 100),
    report: text(args.report, 'Report'),
    access: args.access.trim().slice(0, 2000),
    resident: {
      name: text(args.resident.name, 'Resident', 200),
      email: source && !args.resident.email ? '' : email(args.resident.email),
    },
    owner: { name: text(args.owner.name, 'Owner', 200), email: email(args.owner.email) },
    coordinator,
    responsible: 'Coordinator',
    status: review ? 'Needs review' : 'New',
    nextAction: review
      ? 'Review emergency immediately'
      : 'Review report and choose the next action',
    stageStartedAt: now,
    updatedAt: now,
    dueAt: now + (review ? 0 : 24 * 3600000),
    overdue: review,
    automation: !review,
    reminderHours: 24,
    maxReminders: 2,
    followupCount: 0,
    reopenedCount: 0,
    missedAppointments: 0,
    presenceRequired: true,
  });
  await event(
    ctx,
    id,
    `Report from ${args.resident.name}: ${args.report}`,
    coordinator,
    'resident',
  );
  return id;
};

export const text = (value: string, label: string, max = 5000) => {
  const clean = value.trim();
  if (!clean || clean.length > max)
    throw new ConvexError(`${label} is required and must be at most ${max} characters.`);
  return clean;
};
export const email = (value: string) => {
  const clean = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254)
    throw new ConvexError('Enter a valid email address.');
  return clean;
};
export const closed = (item: Pick<Doc<'austiCases'>, 'status'>) =>
  ['Resolved', 'Cancelled'].includes(item.status);
export const staffActor = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await verifyIdentity(ctx);
  return identity.name ?? identity.email ?? identity.tokenIdentifier;
};
export const requireWorkspace = async (ctx: QueryCtx | MutationCtx, workspace: string) => {
  const identity = await verifyIdentity(ctx);
  if (identity.tokenIdentifier === workspace) return identity;
  if (identity.email && identity.emailVerified === true) {
    const member = await ctx.db
      .query('austiMembers')
      .withIndex('by_workspace_and_email', (q) =>
        q.eq('workspace', workspace).eq('email', identity.email!.toLowerCase()),
      )
      .unique();
    if (member) return identity;
  }
  throw new ConvexError('Workspace unavailable.');
};
export const requireCase = async (ctx: QueryCtx | MutationCtx, id: Id<'austiCases'>) => {
  const item = await ctx.db.get('austiCases', id);
  if (!item) throw new ConvexError('Case unavailable.');
  await requireWorkspace(ctx, item.workspace);
  return item;
};
export const requireOpen = (item: Doc<'austiCases'>) => {
  if (closed(item)) throw new ConvexError('Reopen the case before making changes.');
};
export const event = async (
  ctx: MutationCtx,
  caseId: Id<'austiCases'>,
  body: string,
  actor: string,
  visibility: 'internal' | 'resident' = 'internal',
) => ctx.db.insert('austiEvents', { caseId, body, actor, visibility, kind: 'activity' });

export const recipientFor = async (
  ctx: QueryCtx | MutationCtx,
  item: Doc<'austiCases'>,
  role: 'resident' | 'owner' | 'contractor',
) => {
  if (role !== 'contractor') return { email: item[role].email, version: 0 };
  const contractor = item.contractorId
    ? await ctx.db.get('austiContractors', item.contractorId)
    : null;
  return contractor?.active
    ? { email: contractor.email, version: contractor.recipientVersion }
    : null;
};

export const notificationRecipientMatches = async (
  ctx: QueryCtx | MutationCtx,
  item: Doc<'austiCases'>,
  notice: Doc<'austiNotifications'>,
) => {
  if (!notice.telegram) return notice.to === (await recipientFor(ctx, item, notice.role))?.email;
  const integration = await ctx.db.get(notice.telegram.integrationId);
  return (
    notice.role === 'resident' &&
    integration?.status === 'connected' &&
    integration.workspace === item.workspace &&
    notice.telegram.integrationId === item.source?.integrationId &&
    notice.telegram.chatId === item.source.chatId &&
    notice.to === item.source.chatId
  );
};

export const notify = async (
  ctx: MutationCtx,
  item: Doc<'austiCases'>,
  role: 'resident' | 'owner' | 'contractor',
  body: string,
  requestId?: Id<'austiRequests'>,
) => {
  const telegram = role === 'resident' ? item.source : undefined;
  const to = telegram?.chatId ?? (await recipientFor(ctx, item, role))?.email;
  if (!to) return;
  const id = await ctx.db.insert('austiNotifications', {
    caseId: item._id,
    requestId,
    role,
    telegram,
    to,
    subject: `${item.title} · Austi`,
    body,
    state: 'queued',
    attempts: 0,
  });
  await ctx.scheduler.runAfter(0, internal.austi.delivery.deliver, { id });
};

export const move = async (
  ctx: MutationCtx,
  item: Doc<'austiCases'>,
  status: Doc<'austiCases'>['status'],
  nextAction: string,
  responsible: string,
  actor: string,
  dueAt?: number,
  options: { notifyResident?: boolean; publicAction?: string } = {},
) => {
  const now = Date.now();
  if (item.pendingRequest) {
    const pending = await ctx.db.get('austiRequests', item.pendingRequest);
    if (pending?.state === 'pending') await ctx.db.patch(pending._id, { state: 'superseded' });
  }
  await ctx.db.patch(item._id, {
    status,
    nextAction,
    responsible,
    dueAt: ['Resolved', 'Cancelled'].includes(status)
      ? undefined
      : (dueAt ?? now + item.reminderHours * 3600000),
    stageStartedAt: now,
    updatedAt: now,
    overdue: false,
    pendingRequest: undefined,
    resolvedAt: status === 'Resolved' ? now : undefined,
  });
  await recordStage(ctx, item, status, options.publicAction ?? nextAction, actor, now);
  if (options.notifyResident !== false)
    await notify(ctx, item, 'resident', `${status}. ${options.publicAction ?? nextAction}`);
};

export const recordStage = async (
  ctx: MutationCtx,
  item: Doc<'austiCases'>,
  status: Doc<'austiCases'>['status'],
  nextAction: string,
  actor: string,
  now = Date.now(),
) => {
  await ctx.db.insert('austiEvents', {
    caseId: item._id,
    actor,
    body: `${status}: ${nextAction}`,
    visibility: 'resident',
    kind: 'stage',
    previousStatus: item.status,
    durationMs: Math.max(0, now - item.stageStartedAt),
  });
};

export const attach = async (
  ctx: MutationCtx,
  caseId: Id<'austiCases'>,
  files: { storageId: Id<'_storage'>; name: string }[],
  visibility: 'internal' | 'resident',
) => {
  if (files.length > 8) throw new ConvexError('Attach at most 8 files at a time.');
  for (const file of files) {
    const upload = await ctx.db
      .query('austiUploads')
      .withIndex('by_storageId', (q) => q.eq('storageId', file.storageId))
      .unique();
    if (!upload || upload.caseId !== caseId) throw new ConvexError('Attachment unavailable.');
    await ctx.db.insert('austiFiles', {
      caseId,
      storageId: file.storageId,
      name: text(file.name, 'File name', 200),
      visibility,
    });
    await ctx.db.delete(upload._id);
  }
};

export const getLink = async (ctx: QueryCtx | MutationCtx, tokenHash: string, now: number) => {
  const link = await ctx.db
    .query('austiLinks')
    .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
    .unique();
  if (!link || link.expiresAt <= now)
    throw new ConvexError('This link has expired or is unavailable.');
  const request = await ctx.db.get('austiRequests', link.requestId);
  if (!request || request.state !== 'pending')
    throw new ConvexError('This request has already been answered or replaced.');
  const item = await ctx.db.get('austiCases', request.caseId);
  if (!item || closed(item) || item.pendingRequest !== request._id)
    throw new ConvexError('This request is no longer active.');
  const recipient = await recipientFor(ctx, item, link.role);
  if (link.recipientEmail !== recipient?.email || link.recipientVersion !== recipient?.version)
    throw new ConvexError('This link has expired or is unavailable.');
  return { link, request, item };
};
