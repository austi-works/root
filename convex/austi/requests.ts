import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v, type Infer } from 'convex/values';

import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { internalMutation, internalQuery, mutation, type QueryCtx } from '../_generated/server';
import {
  attach,
  event,
  getLink,
  move,
  notify,
  requireCase,
  requireOpen,
  staffActor,
  text,
} from './model';
import { requestKind, response, role, rolesFor, sharedFile } from './validators';

const next: Record<
  Doc<'austiRequests'>['kind'],
  { status: Doc<'austiCases'>['status']; responsible: string }
> = {
  information: { status: 'Needs information', responsible: 'Resident' },
  approval: { status: 'Awaiting approval', responsible: 'Owner' },
  assignment: { status: 'Awaiting contractor', responsible: 'Contractor' },
  scheduling: { status: 'Awaiting scheduling', responsible: 'Resident and contractor' },
  completion: { status: 'Awaiting completion confirmation', responsible: 'Resident' },
  work: { status: 'In progress', responsible: 'Contractor' },
};
export const create = mutation({
  args: {
    id: v.id('austiCases'),
    kind: requestKind,
    body: v.string(),
    dueAt: v.optional(v.number()),
    amount: v.optional(v.number()),
    contractorId: v.optional(v.id('austiContractors')),
    appointmentAt: v.optional(v.number()),
    appointmentEnd: v.optional(v.number()),
  },
  returns: v.id('austiRequests'),
  handler: async (ctx, args) => {
    let item = await requireCase(ctx, args.id);
    requireOpen(item);
    if (item.pendingRequest) throw new ConvexError('Finish or withdraw the active request first.');
    const body = text(args.body, 'Request');
    const contractor =
      args.kind === 'assignment' && args.contractorId ? await ctx.db.get(args.contractorId) : null;
    const dueAt =
      args.kind === 'assignment' && args.dueAt === undefined && contractor
        ? Date.now() + contractor.timeoutHours * 3600000
        : args.dueAt;
    if (!Number.isFinite(dueAt) || dueAt! <= Date.now() || dueAt! > Date.now() + 7 * 86400000)
      throw new ConvexError('Set a response deadline within the next seven days.');
    if (args.kind === 'approval' && (!Number.isSafeInteger(args.amount) || args.amount! <= 0))
      throw new ConvexError('Enter the estimate in whole cents.');
    if (args.kind === 'assignment') {
      if (
        !contractor ||
        !contractor.active ||
        contractor.workspace !== item.workspace ||
        !contractor.trades.includes(item.category)
      )
        throw new ConvexError('Select an active contractor for this trade in this portfolio.');
      await ctx.db.patch(item._id, {
        contractorId: contractor._id,
        appointmentAt: undefined,
        appointmentEnd: undefined,
        completion: undefined,
      });
      item = { ...item, contractorId: contractor._id };
    }
    if (args.kind === 'scheduling') {
      if (!item.contractorId || item.status !== 'Awaiting scheduling')
        throw new ConvexError('The contractor must accept the assignment before scheduling.');
      if (
        !Number.isFinite(args.appointmentAt) ||
        !Number.isFinite(args.appointmentEnd) ||
        args.appointmentAt! <= Date.now() ||
        args.appointmentEnd! <= args.appointmentAt! ||
        dueAt! >= args.appointmentAt!
      )
        throw new ConvexError(
          'Choose a future appointment window with a response deadline before the visit.',
        );
    }
    if (args.kind === 'completion' && item.completion?.outcome !== 'Repaired')
      throw new ConvexError('Record a completed repair before requesting confirmation.');
    if (args.kind === 'work')
      throw new ConvexError('Use Start work after confirming the appointment.');
    const requestId = await ctx.db.insert('austiRequests', {
      caseId: item._id,
      kind: args.kind,
      body,
      dueAt: dueAt!,
      amount: args.kind === 'approval' ? args.amount : undefined,
      appointmentAt: args.kind === 'scheduling' ? args.appointmentAt : undefined,
      appointmentEnd: args.kind === 'scheduling' ? args.appointmentEnd : undefined,
      state: 'pending',
      reminders: 0,
      residentConfirmed: false,
      contractorConfirmed: false,
    });
    await move(
      ctx,
      item,
      next[args.kind].status,
      body,
      next[args.kind].responsible,
      await staffActor(ctx),
      dueAt!,
      {
        notifyResident: !rolesFor(args.kind).includes('resident'),
        publicAction:
          args.kind === 'approval'
            ? 'Waiting for the owner to approve the repair estimate.'
            : undefined,
      },
    );
    await ctx.db.patch(item._id, { pendingRequest: requestId });
    for (const recipient of rolesFor(args.kind))
      await notify(ctx, item, recipient, body, requestId);
    await ctx.scheduler.runAt(dueAt!, internal.austi.requests.remind, {
      id: requestId,
      expected: 0,
    });
    return requestId;
  },
});

export const remind = internalMutation({
  args: { id: v.id('austiRequests'), expected: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, expected }) => {
    const request = await ctx.db.get(id);
    if (
      !request ||
      request.state !== 'pending' ||
      request.reminders !== expected ||
      request.escalated
    )
      return null;
    const item = await ctx.db.get(request.caseId);
    if (!item || item.pendingRequest !== id) return null;
    if (request.kind === 'scheduling' && request.residentConfirmed && request.contractorConfirmed)
      return null;
    await ctx.db.patch(item._id, { overdue: true });
    if (request.automaticLinksPaused) return null;
    if (!item.automation) {
      await ctx.scheduler.runAfter(item.reminderHours * 3600000, internal.austi.requests.remind, {
        id,
        expected,
      });
      return null;
    }
    if (request.reminders >= item.maxReminders) {
      await ctx.db.patch(id, { escalated: true });
      await event(
        ctx,
        item._id,
        'Response overdue. Coordinator follow-up required; automatic reminders stopped.',
        'Austi',
      );
      await ctx.db.patch(item._id, {
        responsible: 'Coordinator',
        nextAction: `Follow up: ${request.body}`,
        updatedAt: Date.now(),
      });
      return null;
    }
    for (const recipient of rolesFor(request.kind)) {
      if (
        request.kind === 'scheduling' &&
        (recipient === 'resident' ? request.residentConfirmed : request.contractorConfirmed)
      )
        continue;
      await notify(ctx, item, recipient, `Reminder: ${request.body}`, id);
    }
    await ctx.db.patch(id, { reminders: expected + 1 });
    await ctx.db.patch(item._id, { followupCount: item.followupCount + 1 });
    await event(ctx, item._id, `Follow-up ${expected + 1} queued`, 'Austi');
    await ctx.scheduler.runAfter(item.reminderHours * 3600000, internal.austi.requests.remind, {
      id,
      expected: expected + 1,
    });
    return null;
  },
});

const sharedFiles = async (
  ctx: QueryCtx,
  caseId: Id<'austiCases'>,
  paginationOpts: Infer<typeof paginationOptsValidator>,
) => {
  const page = await ctx.db
    .query('austiFiles')
    .withIndex('by_caseId_and_visibility', (q) =>
      q.eq('caseId', caseId).eq('visibility', 'resident'),
    )
    .order('desc')
    .paginate(paginationOpts);
  return {
    ...page,
    page: await Promise.all(
      page.page.map(async (file) => ({
        name: file.name,
        url: await ctx.storage.getUrl(file.storageId),
        visibility: file.visibility,
      })),
    ),
  };
};

export const externalFiles = internalQuery({
  args: { tokenHash: v.string(), now: v.number(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(sharedFile),
  handler: async (ctx, args) => {
    const { item } = await getLink(ctx, args.tokenHash, args.now);
    return sharedFiles(ctx, item._id, args.paginationOpts);
  },
});

export const external = internalQuery({
  args: { tokenHash: v.string(), now: v.number() },
  returns: v.object({
    title: v.string(),
    property: v.string(),
    unit: v.string(),
    report: v.string(),
    access: v.string(),
    presenceRequired: v.boolean(),
    kind: requestKind,
    role,
    body: v.string(),
    amount: v.union(v.number(), v.null()),
    appointmentAt: v.union(v.number(), v.null()),
    appointmentEnd: v.union(v.number(), v.null()),
    confirmed: v.boolean(),
    updates: v.array(v.object({ body: v.string(), time: v.number() })),
    files: v.array(sharedFile),
    filesCursor: v.string(),
    filesDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { item, request, link } = await getLink(ctx, args.tokenHash, args.now);
    const updates = await ctx.db
      .query('austiEvents')
      .withIndex('by_caseId_and_visibility', (q) =>
        q.eq('caseId', item._id).eq('visibility', 'resident'),
      )
      .order('desc')
      .take(30);
    const files = await sharedFiles(ctx, item._id, { cursor: null, numItems: 40 });
    return {
      title: item.title,
      property: item.property,
      unit: item.unit,
      report: item.report,
      access: link.role === 'contractor' ? item.access : '',
      presenceRequired: item.presenceRequired,
      kind: request.kind,
      role: link.role,
      body: request.body,
      amount: request.amount ?? null,
      appointmentAt: request.appointmentAt ?? null,
      appointmentEnd: request.appointmentEnd ?? null,
      confirmed: link.role === 'resident' ? request.residentConfirmed : request.contractorConfirmed,
      updates: updates.map((e) => ({ body: e.body, time: e._creationTime })),
      files: files.page,
      filesCursor: files.continueCursor,
      filesDone: files.isDone,
    };
  },
});

export const respond = internalMutation({
  args: { tokenHash: v.string(), response },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, request, link } = await getLink(ctx, args.tokenHash, Date.now());
    const { choice, body, attachments } = args.response;
    const allowed = ['information', 'work'].includes(request.kind)
      ? ['submit']
      : request.kind === 'approval'
        ? ['approve', 'decline', 'clarify']
        : request.kind === 'assignment'
          ? ['accept', 'decline']
          : request.kind === 'scheduling'
            ? ['confirm', 'cancel']
            : ['resolved', 'unresolved'];
    if (!rolesFor(request.kind).includes(link.role) || !allowed.includes(choice))
      throw new ConvexError('This action is not permitted by this link.');
    const requiresBody = ['submit', 'decline', 'clarify', 'cancel', 'unresolved'].includes(choice);
    const note = requiresBody ? text(body, 'Explanation') : body.trim().slice(0, 5000);
    if (request.kind === 'work' && !args.response.outcome)
      throw new ConvexError('Choose a work outcome.');
    const contractor = item.contractorId ? await ctx.db.get(item.contractorId) : null;
    const actor =
      link.role === 'contractor' ? (contractor?.contact ?? 'Contractor') : item[link.role].name;
    if (
      request.kind === 'scheduling' &&
      choice === 'confirm' &&
      (link.role === 'resident' ? request.residentConfirmed : request.contractorConfirmed)
    )
      throw new ConvexError('Your appointment confirmation is already recorded.');
    if (
      request.kind === 'scheduling' &&
      choice === 'confirm' &&
      request.appointmentAt! <= Date.now()
    )
      throw new ConvexError(
        'This appointment time has passed. Ask the coordinator to arrange another time.',
      );
    await attach(ctx, item._id, attachments, link.role === 'owner' ? 'internal' : 'resident');
    await ctx.db.insert('austiEvents', {
      caseId: item._id,
      actor,
      body: `${request.kind}: ${choice}${request.amount ? ` · EUR ${(request.amount / 100).toFixed(2)} · ${request.body}` : ''}${note ? ` — ${note}` : ''}`,
      visibility: link.role === 'owner' ? 'internal' : 'resident',
      kind: 'response',
    });
    await ctx.db.patch(item._id, { updatedAt: Date.now() });
    if (request.kind === 'scheduling' && choice === 'confirm') {
      const residentConfirmed = request.residentConfirmed || link.role === 'resident';
      const contractorConfirmed = request.contractorConfirmed || link.role === 'contractor';
      await ctx.db.patch(request._id, { residentConfirmed, contractorConfirmed });
      if (!residentConfirmed || !contractorConfirmed) return null;
      // Keep scheduling links usable for cancellation until work starts.
      await move(
        ctx,
        { ...item, pendingRequest: undefined },
        'Scheduled',
        'Attend the confirmed appointment',
        'Contractor',
        actor,
        request.appointmentEnd,
        { notifyResident: false },
      );
      await ctx.db.patch(item._id, {
        pendingRequest: request._id,
        appointmentAt: request.appointmentAt,
        appointmentEnd: request.appointmentEnd,
      });
      const when = new Date(request.appointmentAt!).toISOString();
      await notify(ctx, item, 'resident', `Appointment confirmed: ${when}.`);
      await notify(ctx, item, 'contractor', `Appointment confirmed: ${when}.`);
      return null;
    }
    await ctx.db.patch(request._id, { state: 'completed' });
    if (request.kind === 'work') {
      await ctx.db.patch(item._id, {
        completion: { outcome: args.response.outcome!, notes: note },
      });
      await move(
        ctx,
        item,
        'Needs review',
        args.response.outcome === 'Repaired'
          ? 'Request resident confirmation of the repair'
          : `${args.response.outcome}: arrange follow-up work`,
        'Coordinator',
        actor,
      );
    } else if (request.kind === 'assignment' && choice === 'accept') {
      await move(
        ctx,
        item,
        'Awaiting scheduling',
        'Propose an appointment window',
        'Coordinator',
        actor,
      );
    } else if (request.kind === 'completion' && choice === 'resolved') {
      await move(
        ctx,
        item,
        'Resolved',
        'Resident confirmed the repair is resolved',
        'Coordinator',
        actor,
      );
    } else {
      const nextAction =
        choice === 'approve'
          ? 'Owner approved the estimate; arrange the repair'
          : choice === 'unresolved'
            ? 'Resident reports the issue persists; arrange follow-up work'
            : choice === 'cancel'
              ? 'Propose another appointment window'
              : choice === 'submit'
                ? 'Review the information supplied'
                : `Review ${link.role} response: ${note}`;
      await move(
        ctx,
        item,
        choice === 'cancel' ? 'Awaiting scheduling' : 'Needs review',
        nextAction,
        'Coordinator',
        actor,
        undefined,
        {
          publicAction:
            link.role === 'owner'
              ? 'The owner responded. Your coordinator is reviewing the next step.'
              : undefined,
        },
      );
      if (choice === 'unresolved')
        await ctx.db.patch(item._id, {
          reopenedCount: item.reopenedCount + 1,
          completion: undefined,
        });
      if (choice === 'decline' && request.kind === 'assignment')
        await ctx.db.patch(item._id, { contractorId: undefined });
      if (choice === 'cancel')
        await ctx.db.patch(item._id, { appointmentAt: undefined, appointmentEnd: undefined });
    }
    return null;
  },
});
