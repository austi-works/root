import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { mutation, query } from '../_generated/server';
import {
  attach,
  closed,
  createCaseRecord,
  email,
  event,
  move,
  notify,
  requireCase,
  requireOpen,
  requireWorkspace,
  staffActor,
  text,
} from './model';
import {
  attachment,
  caseDoc,
  caseInput,
  eventDoc,
  outcome,
  requestDoc,
  visibility,
} from './validators';

export const list = query({
  args: { workspace: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(caseDoc),
  handler: async (ctx, { workspace, paginationOpts }) => {
    await requireWorkspace(ctx, workspace);
    return ctx.db
      .query('austiCases')
      .withIndex('by_workspace_and_updatedAt', (q) => q.eq('workspace', workspace))
      .order('desc')
      .paginate(paginationOpts);
  },
});
export const get = query({
  args: { id: v.id('austiCases') },
  returns: v.object({
    item: caseDoc,
    request: v.union(requestDoc, v.null()),
    files: v.array(
      v.object({
        id: v.id('austiFiles'),
        name: v.string(),
        url: v.union(v.string(), v.null()),
        visibility,
      }),
    ),
  }),
  handler: async (ctx, { id }) => {
    const item = await requireCase(ctx, id);
    const files = await ctx.db
      .query('austiFiles')
      .withIndex('by_caseId', (q) => q.eq('caseId', id))
      .order('desc')
      .take(100);
    return {
      item,
      request: item.pendingRequest ? await ctx.db.get(item.pendingRequest) : null,
      files: await Promise.all(
        files.map(async (file) => ({
          id: file._id,
          name: file.name,
          visibility: file.visibility,
          url: await ctx.storage.getUrl(file.storageId),
        })),
      ),
    };
  },
});
export const timeline = query({
  args: { id: v.id('austiCases'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(eventDoc),
  handler: async (ctx, { id, paginationOpts }) => {
    await requireCase(ctx, id);
    return ctx.db
      .query('austiEvents')
      .withIndex('by_caseId', (q) => q.eq('caseId', id))
      .order('desc')
      .paginate(paginationOpts);
  },
});
export const create = mutation({
  args: { workspace: v.string(), ...caseInput },
  returns: v.id('austiCases'),
  handler: async (ctx, args) => {
    const identity = await requireWorkspace(ctx, args.workspace);
    return createCaseRecord(ctx, args, identity.name ?? identity.email ?? 'Coordinator');
  },
});
export const edit = mutation({
  args: {
    id: v.id('austiCases'),
    ...caseInput,
    coordinator: v.string(),
    nextAction: v.string(),
    dueAt: v.number(),
    reminderHours: v.number(),
    maxReminders: v.number(),
    automation: v.boolean(),
    presenceRequired: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...args }) => {
    const item = await requireCase(ctx, id);
    requireOpen(item);
    if (item.pendingRequest)
      throw new ConvexError('Withdraw the current request before changing case details.');
    if (
      !Number.isFinite(args.dueAt) ||
      !Number.isFinite(args.reminderHours) ||
      args.reminderHours < 1 ||
      args.reminderHours > 168 ||
      !Number.isInteger(args.maxReminders) ||
      args.maxReminders < 0 ||
      args.maxReminders > 5
    )
      throw new ConvexError(
        'Use a valid deadline, reminder interval of 1–168 hours, and 0–5 reminders.',
      );
    await ctx.db.patch(id, {
      ...args,
      title: text(args.title, 'Title', 200),
      property: text(args.property, 'Property', 300),
      unit: text(args.unit, 'Unit', 100),
      report: text(args.report, 'Report'),
      access: args.access.slice(0, 2000),
      coordinator: text(args.coordinator, 'Coordinator', 200),
      nextAction: text(args.nextAction, 'Next action', 500),
      resident: {
        name: text(args.resident.name, 'Resident', 200),
        email: item.source && !args.resident.email.trim() ? '' : email(args.resident.email),
      },
      owner: { name: text(args.owner.name, 'Owner', 200), email: email(args.owner.email) },
      updatedAt: Date.now(),
      overdue: args.dueAt <= Date.now(),
    });
    await event(ctx, id, 'Case details and follow-up policy updated', await staffActor(ctx));
    return null;
  },
});
export const note = mutation({
  args: { id: v.id('austiCases'), body: v.string(), visibility, attachments: v.array(attachment) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await requireCase(ctx, args.id);
    const body = text(args.body, 'Note');
    await attach(ctx, args.id, args.attachments, args.visibility);
    await ctx.db.insert('austiEvents', {
      caseId: args.id,
      body,
      visibility: args.visibility,
      actor: await staffActor(ctx),
      kind: 'note',
    });
    await ctx.db.patch(item._id, { updatedAt: Date.now() });
    if (args.visibility === 'resident') await notify(ctx, item, 'resident', body);
    return null;
  },
});
export const control = mutation({
  args: {
    id: v.id('austiCases'),
    action: v.union(
      v.literal('cancel'),
      v.literal('reopen'),
      v.literal('withdraw'),
      v.literal('pause'),
      v.literal('resume'),
      v.literal('start'),
      v.literal('missed'),
      v.literal('followup'),
    ),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, action, reason }) => {
    const item = await requireCase(ctx, id);
    if (action === 'reopen') {
      if (!closed(item)) throw new ConvexError('This case is already open.');
      await move(
        ctx,
        item,
        'Needs review',
        text(reason, 'Reason'),
        'Coordinator',
        await staffActor(ctx),
      );
      await ctx.db.patch(id, {
        reopenedCount: item.reopenedCount + 1,
        completion: undefined,
        cancellationReason: undefined,
        appointmentAt: undefined,
        appointmentEnd: undefined,
      });
    } else {
      requireOpen(item);
      if (action === 'followup') {
        await event(
          ctx,
          id,
          `Manual follow-up: ${text(reason, 'Follow-up details')}`,
          await staffActor(ctx),
        );
        await ctx.db.patch(id, {
          manualFollowups: (item.manualFollowups ?? 0) + 1,
          updatedAt: Date.now(),
        });
      } else if (action === 'missed') {
        if (!['Scheduled', 'In progress'].includes(item.status))
          throw new ConvexError('There is no confirmed appointment to mark as missed.');
        await move(
          ctx,
          item,
          'Awaiting scheduling',
          text(reason, 'Missed visit reason'),
          'Coordinator',
          await staffActor(ctx),
        );
        await ctx.db.patch(id, {
          missedAppointments: item.missedAppointments + 1,
          appointmentAt: undefined,
          appointmentEnd: undefined,
        });
      } else if (action === 'cancel' || action === 'withdraw') {
        if (action === 'withdraw' && !item.pendingRequest)
          throw new ConvexError('There is no active request to withdraw.');
        const pending = item.pendingRequest ? await ctx.db.get(item.pendingRequest) : null;
        const explanation = text(reason, 'Reason');
        await move(
          ctx,
          item,
          action === 'cancel' ? 'Cancelled' : 'Needs review',
          explanation,
          'Coordinator',
          await staffActor(ctx),
        );
        if (action === 'cancel') await ctx.db.patch(id, { cancellationReason: explanation });
        if (action === 'withdraw' && pending?.kind === 'scheduling')
          await ctx.db.patch(id, { appointmentAt: undefined, appointmentEnd: undefined });
      } else if (action === 'start') {
        if (item.status !== 'Scheduled')
          throw new ConvexError('Confirm the appointment before starting work.');
        const dueAt = Math.max(item.appointmentEnd ?? 0, Date.now() + 3600000);
        await move(
          ctx,
          item,
          'In progress',
          'Record the work outcome',
          'Contractor',
          await staffActor(ctx),
          dueAt,
        );
        const requestId = await ctx.db.insert('austiRequests', {
          caseId: id,
          kind: 'work',
          body: 'Report the work performed, outcome, and supporting photos.',
          state: 'pending',
          dueAt,
          reminders: 0,
          residentConfirmed: false,
          contractorConfirmed: false,
        });
        await ctx.db.patch(id, { pendingRequest: requestId });
        await notify(
          ctx,
          item,
          'contractor',
          'Report the work performed, outcome, and supporting photos.',
          requestId,
        );
        await ctx.scheduler.runAt(dueAt, internal.austi.requests.remind, {
          id: requestId,
          expected: 0,
        });
      } else {
        await ctx.db.patch(id, { automation: action === 'resume', updatedAt: Date.now() });
        await event(
          ctx,
          id,
          action === 'resume' ? 'Automatic reminders resumed' : 'Automatic reminders paused',
          await staffActor(ctx),
        );
      }
    }
    return null;
  },
});
export const recordWork = mutation({
  args: { id: v.id('austiCases'), outcome, notes: v.string(), attachments: v.array(attachment) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await requireCase(ctx, args.id);
    requireOpen(item);
    if (!['Scheduled', 'In progress'].includes(item.status))
      throw new ConvexError('Work can only be recorded after the appointment is confirmed.');
    const notes = text(args.notes, 'Work notes');
    await attach(ctx, item._id, args.attachments, 'resident');
    await ctx.db.patch(item._id, { completion: { outcome: args.outcome, notes } });
    await move(
      ctx,
      item,
      'Needs review',
      args.outcome === 'Repaired'
        ? 'Request resident confirmation of the repair'
        : `${args.outcome}: arrange follow-up work`,
      'Coordinator',
      await staffActor(ctx),
    );
    await event(ctx, item._id, `${args.outcome}: ${notes}`, await staffActor(ctx), 'resident');
    return null;
  },
});
