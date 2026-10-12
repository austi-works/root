import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from '#convex/_generated/api';
import { hash } from '#convex/austi/links';
import schema from '#convex/schema';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T09:00:00Z'));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const fixture = async () => {
  const t = convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
  const owner = t.withIdentity({
    tokenIdentifier: 'issuer|owner',
    name: 'Coordinator Alice',
    email: 'alice@example.com',
    emailVerified: true,
  });
  const other = t.withIdentity({
    tokenIdentifier: 'issuer|other',
    email: 'other@example.com',
    emailVerified: true,
  });
  const workspace = 'issuer|owner';
  const id = await owner.mutation(api.austi.cases.create, {
    workspace,
    title: 'Leaking sink',
    property: 'Main Street 10',
    unit: '2',
    category: 'Plumbing',
    urgency: 'Routine',
    report: 'Water below the sink',
    resident: { name: 'Resident', email: 'resident@example.com' },
    owner: { name: 'Landlord', email: 'landlord@example.com' },
    access: 'Ring unit 2',
  });
  const contractorId = await owner.mutation(api.austi.contractors.save, {
    workspace,
    company: 'Plumber',
    contact: 'Pat',
    email: 'plumber@example.com',
    phone: '',
    trades: ['Plumbing'],
    area: 'Vilnius',
    properties: 'All',
    active: true,
    timeoutHours: 2,
    priority: 1,
  });
  const get = () => owner.query(api.austi.cases.get, { id });
  const dueAt = Date.now() + 3600000;
  return { t, owner, other, workspace, id, contractorId, get, dueAt };
};
const reply = (
  choice:
    | 'submit'
    | 'approve'
    | 'decline'
    | 'clarify'
    | 'accept'
    | 'confirm'
    | 'cancel'
    | 'resolved'
    | 'unresolved',
  body = '',
) => ({ choice, body, attachments: [] });

const scheduled = async () => {
  const f = await fixture();
  const assignment = await f.owner.mutation(api.austi.requests.create, {
    id: f.id,
    kind: 'assignment',
    contractorId: f.contractorId,
    body: 'Inspect sink',
    dueAt: f.dueAt,
  });
  const contractorToken = await f.owner.action(api.austi.links.create, {
    id: assignment,
    role: 'contractor',
  });
  await f.t.action(api.austi.links.respond, { token: contractorToken, response: reply('accept') });
  const request = await f.owner.mutation(api.austi.requests.create, {
    id: f.id,
    kind: 'scheduling',
    body: 'Visit tomorrow',
    dueAt: f.dueAt,
    appointmentAt: Date.now() + 86400000,
    appointmentEnd: Date.now() + 90000000,
  });
  const residentToken = await f.owner.action(api.austi.links.create, {
    id: request,
    role: 'resident',
  });
  const visitToken = await f.owner.action(api.austi.links.create, {
    id: request,
    role: 'contractor',
  });
  return { ...f, request, residentToken, visitToken };
};

describe('Austi portfolio access', () => {
  it('requires authentication and isolates case, history, contractors, and mutation access', async () => {
    const f = await fixture();
    await expect(f.t.query(api.austi.cases.get, { id: f.id })).rejects.toThrow();
    await expect(f.other.query(api.austi.cases.get, { id: f.id })).rejects.toThrow(
      'Workspace unavailable',
    );
    await expect(
      f.other.query(api.austi.cases.timeline, {
        id: f.id,
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow();
    await expect(
      f.other.mutation(api.austi.cases.control, {
        id: f.id,
        action: 'cancel',
        reason: 'Do not allow',
      }),
    ).rejects.toThrow();
    await expect(
      f.other.query(api.austi.contractors.list, { workspace: f.workspace }),
    ).rejects.toThrow();
    expect((await f.get()).item.status).toBe('New');
  });
  it('grants portfolio access only to verified staff and revokes it immediately', async () => {
    const f = await fixture();
    await f.owner.mutation(api.austi.workspaces.grant, { email: 'Staff@Example.com' });
    const staff = f.t.withIdentity({
      tokenIdentifier: 'issuer|staff',
      email: 'staff@example.com',
      emailVerified: true,
    });
    const unverified = f.t.withIdentity({
      tokenIdentifier: 'issuer|spoof',
      email: 'staff@example.com',
      emailVerified: false,
    });
    expect((await staff.query(api.austi.cases.get, { id: f.id })).item.title).toBe('Leaking sink');
    await expect(unverified.query(api.austi.cases.get, { id: f.id })).rejects.toThrow();
    const members = await f.owner.query(api.austi.workspaces.members, { workspace: f.workspace });
    await expect(
      staff.mutation(api.austi.workspaces.revoke, { id: members[0].id }),
    ).rejects.toThrow();
    await f.owner.mutation(api.austi.workspaces.revoke, { id: members[0].id });
    await expect(staff.query(api.austi.cases.get, { id: f.id })).rejects.toThrow();
  });
});

describe('Austi restricted response links', () => {
  it('invalidates contractor links and queued email when the contact changes', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'assignment',
      contractorId: f.contractorId,
      body: 'Inspect sink',
    });
    const token = await f.owner.action(api.austi.links.create, {
      id: request,
      role: 'contractor',
    });
    const notice = (await f.owner.query(api.austi.notifications.list, { id: f.id })).find(
      (n) => n.to === 'plumber@example.com',
    )!;
    const contractor = (
      await f.owner.query(api.austi.contractors.list, { workspace: f.workspace })
    )[0];
    const { _id, _creationTime, recipientVersion: _recipientVersion, ...fields } = contractor;
    await f.owner.mutation(api.austi.contractors.save, {
      ...fields,
      id: f.contractorId,
      email: 'new-plumber@example.com',
    });
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow('unavailable');
    expect(await f.t.mutation(internal.austi.notifications.claim, { id: notice.id })).toBe(false);
    const replacement = await f.owner.action(api.austi.links.create, {
      id: request,
      role: 'contractor',
    });
    expect((await f.t.action(api.austi.links.read, { token: replacement })).role).toBe(
      'contractor',
    );
    await f.owner.mutation(api.austi.contractors.save, {
      ...fields,
      id: f.contractorId,
    });
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow('unavailable');
  });
  it('requires staff access in the same transaction that mints a manual link', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send details',
      dueAt: f.dueAt,
    });
    await expect(
      f.t.mutation(internal.austi.links.mint, {
        id: request,
        role: 'resident',
        tokenHash: 'test-hash',
      }),
    ).rejects.toThrow();
  });
  it('shows recent shared files first and lets recipients page to older files', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send details',
      dueAt: f.dueAt,
    });
    const token = await f.owner.action(api.austi.links.create, { id: request, role: 'resident' });
    await f.t.run(async (ctx) => {
      for (let index = 0; index < 42; index++) {
        const storageId = await ctx.storage.store(new Blob([`file ${index}`]));
        await ctx.db.insert('austiFiles', {
          caseId: f.id,
          storageId,
          name: `file-${index}.txt`,
          visibility: 'resident',
        });
      }
    });
    const first = await f.t.action(api.austi.links.read, { token });
    expect(first.files).toHaveLength(40);
    expect(first.files[0].name).toBe('file-41.txt');
    expect(first.filesDone).toBe(false);
    const older = await f.t.action(api.austi.links.moreFiles, {
      token,
      paginationOpts: { cursor: first.filesCursor, numItems: 40 },
    });
    expect(older.page.map((file) => file.name)).toEqual(['file-1.txt', 'file-0.txt']);
    expect(older.isDone).toBe(true);
  });
  it('keeps private owner recommendations and refusal details out of resident history and email', async () => {
    const f = await fixture();
    const approval = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'approval',
      amount: 5000,
      body: 'Private recommendation for the owner',
      dueAt: f.dueAt,
    });
    const token = await f.owner.action(api.austi.links.create, { id: approval, role: 'owner' });
    await f.t.action(api.austi.links.respond, {
      token,
      response: reply('decline', 'Private owner refusal details'),
    });
    const information = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Please send model number',
      dueAt: f.dueAt,
    });
    const resident = await f.owner.action(api.austi.links.create, {
      id: information,
      role: 'resident',
    });
    const view = await f.t.action(api.austi.links.read, { token: resident });
    expect(JSON.stringify(view)).not.toContain('Private');
    const notices = await f.owner.query(api.austi.notifications.list, { id: f.id });
    expect(JSON.stringify(notices.filter((n) => n.to === 'resident@example.com'))).not.toContain(
      'Private',
    );
  });
  it('records owner approval with amount/scope, excludes internal notes, and prevents replay', async () => {
    const f = await fixture();
    await f.owner.mutation(api.austi.cases.note, {
      id: f.id,
      body: 'Private internal assessment',
      visibility: 'internal',
      attachments: [],
    });
    const id = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'approval',
      amount: 28000,
      body: 'Replace trap',
      dueAt: f.dueAt,
    });
    await expect(f.other.action(api.austi.links.create, { id, role: 'owner' })).rejects.toThrow();
    await expect(
      f.owner.action(api.austi.links.create, { id, role: 'contractor' }),
    ).rejects.toThrow();
    const token = await f.owner.action(api.austi.links.create, { id, role: 'owner' });
    const publicView = await f.t.action(api.austi.links.read, { token });
    expect(publicView.amount).toBe(28000);
    expect(JSON.stringify(publicView)).not.toContain('Private internal assessment');
    expect(publicView.access).toBe('');
    await expect(
      f.t.action(api.austi.links.respond, { token, response: reply('resolved') }),
    ).rejects.toThrow('not permitted');
    await f.t.action(api.austi.links.respond, { token, response: reply('approve') });
    expect((await f.get()).item.status).toBe('Needs review');
    const history = await f.owner.query(api.austi.cases.timeline, {
      id: f.id,
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(history.page.some((e) => e.body.includes('EUR 280.00 · Replace trap'))).toBe(true);
    await expect(
      f.t.action(api.austi.links.respond, { token, response: reply('approve') }),
    ).rejects.toThrow('already been answered');
  });
  it('rejects expired, revoked and superseded links and protects required decline reasons', async () => {
    const f = await fixture();
    const id = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'approval',
      amount: 10000,
      body: 'Repair',
      dueAt: f.dueAt,
    });
    let token = await f.owner.action(api.austi.links.create, { id, role: 'owner' });
    await expect(
      f.t.action(api.austi.links.respond, { token, response: reply('decline') }),
    ).rejects.toThrow('Explanation');
    await f.owner.mutation(api.austi.links.revoke, { id });
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow(
      'expired or is unavailable',
    );
    token = await f.owner.action(api.austi.links.create, { id, role: 'owner' });
    vi.setSystemTime(Date.now() + 8 * 86400000);
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow('expired');
    token = await f.owner.action(api.austi.links.create, { id, role: 'owner' });
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'withdraw',
      reason: 'Scope changed',
    });
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow('replaced');
  });
  it('stops automatic request links after revocation while allowing manual replacements', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send details',
      dueAt: f.dueAt,
    });
    const token = await f.owner.action(api.austi.links.create, { id: request, role: 'resident' });
    const notice = (await f.owner.query(api.austi.notifications.list, { id: f.id })).find(
      (n) => n.to === 'resident@example.com',
    )!;
    await f.owner.mutation(api.austi.links.revoke, { id: request });
    await expect(f.t.action(api.austi.links.read, { token })).rejects.toThrow();
    expect(await f.t.mutation(internal.austi.notifications.claim, { id: notice.id })).toBe(false);
    const before = (await f.owner.query(api.austi.notifications.list, { id: f.id })).length;
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 0 });
    expect((await f.owner.query(api.austi.notifications.list, { id: f.id })).length).toBe(before);
    const replacement = await f.owner.action(api.austi.links.create, {
      id: request,
      role: 'resident',
    });
    expect((await f.t.action(api.austi.links.read, { token: replacement })).kind).toBe(
      'information',
    );
  });
  it('rejects a file attachment claimed from another case', async () => {
    const f = await fixture();
    const storageId = await f.t.run((ctx) => ctx.storage.store(new Blob(['content'])));
    const anotherCase = await f.t.run(async (ctx) => {
      const original = (await ctx.db.get(f.id))!;
      const { _id, _creationTime, ...fields } = original;
      return ctx.db.insert('austiCases', fields);
    });
    await f.t.run((ctx) => ctx.db.insert('austiUploads', { caseId: anotherCase, storageId }));
    await expect(
      f.owner.mutation(api.austi.cases.note, {
        id: f.id,
        body: 'Photo',
        visibility: 'resident',
        attachments: [{ storageId, name: 'photo.jpg' }],
      }),
    ).rejects.toThrow('Attachment unavailable');
  });
});

describe('Austi repair lifecycle', () => {
  it('uses the contractor response timeout when assigning work', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'assignment',
      contractorId: f.contractorId,
      body: 'Inspect sink',
    });
    expect((await f.get()).request).toMatchObject({
      _id: request,
      dueAt: Date.now() + 2 * 3600000,
    });
  });
  it('clears a confirmed visit when its scheduling request is withdrawn', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'withdraw',
      reason: 'Visit needs to change',
    });
    expect((await f.get()).item).toMatchObject({ status: 'Needs review' });
    expect((await f.get()).item.appointmentAt).toBeUndefined();
    await expect(
      f.owner.mutation(api.austi.cases.control, {
        id: f.id,
        action: 'withdraw',
        reason: 'Again',
      }),
    ).rejects.toThrow('no active request');
  });
  it('lets the assigned contractor report actual work without resolving the case', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.control, { id: f.id, action: 'start', reason: '' });
    const requestId = (await f.get()).item.pendingRequest!;
    const token = await f.owner.action(api.austi.links.create, {
      id: requestId,
      role: 'contractor',
    });
    await expect(
      f.owner.action(api.austi.links.create, { id: requestId, role: 'resident' }),
    ).rejects.toThrow();
    await f.t.action(api.austi.links.respond, {
      token,
      response: { ...reply('submit', 'Replaced trap and tested'), outcome: 'Repaired' },
    });
    expect((await f.get()).item).toMatchObject({
      status: 'Needs review',
      completion: { outcome: 'Repaired', notes: 'Replaced trap and tested' },
    });
  });
  it('records missed visits and returns to scheduling', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'missed',
      reason: 'Contractor could not access the building',
    });
    expect((await f.get()).item).toMatchObject({
      status: 'Awaiting scheduling',
      missedAppointments: 1,
    });
    expect((await f.get()).item.appointmentAt).toBeUndefined();
  });
  it('requires contractor acceptance and both appointment confirmations', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    expect((await f.get()).item.status).toBe('Awaiting scheduling');
    await expect(
      f.t.action(api.austi.links.respond, { token: f.residentToken, response: reply('confirm') }),
    ).rejects.toThrow('already recorded');
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    expect((await f.get()).item.status).toBe('Scheduled');
    // A confirmed participant can still cancel before work starts.
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('cancel', 'Unavailable, please reschedule'),
    });
    expect((await f.get()).item).toMatchObject({ status: 'Awaiting scheduling' });
    expect((await f.get()).item.appointmentAt).toBeUndefined();
  });
  it('keeps partial repairs open and requires resident confirmation for closure', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.recordWork, {
      id: f.id,
      outcome: 'Parts required',
      notes: 'Trap ordered',
      attachments: [],
    });
    expect((await f.get()).item.status).toBe('Needs review');
    await expect(
      f.owner.mutation(api.austi.requests.create, {
        id: f.id,
        kind: 'completion',
        body: 'Fixed?',
        dueAt: f.dueAt,
      }),
    ).rejects.toThrow('completed repair');
  });
  it('reopens an unresolved repair and invalidates pending requests on cancellation', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.recordWork, {
      id: f.id,
      outcome: 'Repaired',
      notes: 'Replaced trap; pressure tested',
      attachments: [],
    });
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'completion',
      body: 'Has the leak stopped?',
      dueAt: f.dueAt,
    });
    const token = await f.owner.action(api.austi.links.create, { id: request, role: 'resident' });
    await f.t.action(api.austi.links.respond, {
      token,
      response: reply('unresolved', 'Still dripping'),
    });
    expect((await f.get()).item).toMatchObject({ status: 'Needs review', reopenedCount: 1 });
    const info = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send a photo',
      dueAt: f.dueAt,
    });
    const infoToken = await f.owner.action(api.austi.links.create, { id: info, role: 'resident' });
    await expect(
      f.owner.mutation(api.austi.cases.control, { id: f.id, action: 'cancel', reason: '' }),
    ).rejects.toThrow('Reason');
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'cancel',
      reason: 'Duplicate case',
    });
    await expect(
      f.t.action(api.austi.links.respond, {
        token: infoToken,
        response: reply('submit', 'Photo details'),
      }),
    ).rejects.toThrow();
  });
  it('resolves after positive resident confirmation and permits accountable reopening', async () => {
    const f = await scheduled();
    await f.t.action(api.austi.links.respond, {
      token: f.residentToken,
      response: reply('confirm'),
    });
    await f.t.action(api.austi.links.respond, { token: f.visitToken, response: reply('confirm') });
    await f.owner.mutation(api.austi.cases.recordWork, {
      id: f.id,
      outcome: 'Repaired',
      notes: 'Replaced trap',
      attachments: [],
    });
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'completion',
      body: 'Resolved?',
      dueAt: f.dueAt,
    });
    const token = await f.owner.action(api.austi.links.create, { id: request, role: 'resident' });
    await f.t.action(api.austi.links.respond, { token, response: reply('resolved') });
    expect((await f.get()).item.status).toBe('Resolved');
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'reopen',
      reason: 'Leak returned a week later',
    });
    expect((await f.get()).item).toMatchObject({ status: 'Needs review', reopenedCount: 1 });
  });
});

describe('Austi follow-ups and delivery', () => {
  it('pauses automatic reminders and does not send obsolete request messages', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send details',
      dueAt: f.dueAt,
    });
    await f.owner.mutation(api.austi.cases.control, { id: f.id, action: 'pause', reason: '' });
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 0 });
    expect((await f.get()).item.followupCount).toBe(0);
    const notices = await f.owner.query(api.austi.notifications.list, { id: f.id });
    const requestedNotice = await f.t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('austiNotifications')
            .withIndex('by_caseId', (q) => q.eq('caseId', f.id))
            .take(20)
        ).find((n) => n.requestId === request)!,
    );
    await f.owner.mutation(api.austi.cases.control, {
      id: f.id,
      action: 'withdraw',
      reason: 'Already received',
    });
    await f.t.action(internal.austi.delivery.deliver, { id: requestedNotice._id });
    expect(
      (await f.owner.query(api.austi.notifications.list, { id: f.id })).find(
        (n) => n.id === requestedNotice._id,
      )?.state,
    ).toBe('cancelled');
    expect(notices.length).toBeGreaterThan(0);
  });
  it('recovers interrupted deliveries and deduplicates repeated recovery callbacks', async () => {
    const f = await fixture();
    await f.owner.mutation(api.austi.cases.note, {
      id: f.id,
      body: 'Update',
      visibility: 'resident',
      attachments: [],
    });
    const id = (await f.owner.query(api.austi.notifications.list, { id: f.id }))[0].id;
    expect(await f.t.mutation(internal.austi.notifications.claim, { id })).toBe(true);
    await f.t.mutation(internal.austi.notifications.recover, { id, attempt: 1 });
    await f.t.mutation(internal.austi.notifications.recover, { id, attempt: 1 });
    expect((await f.owner.query(api.austi.notifications.list, { id: f.id }))[0]).toMatchObject({
      state: 'queued',
      attempts: 1,
    });
  });
  it('deduplicates reminders, escalates after the limit, and stops on response', async () => {
    const f = await fixture();
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'information',
      body: 'Send model number',
      dueAt: f.dueAt,
    });
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 0 });
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 0 });
    expect((await f.get()).item.followupCount).toBe(1);
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 1 });
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 2 });
    expect((await f.get()).item).toMatchObject({
      responsible: 'Coordinator',
      followupCount: 2,
      overdue: true,
    });
    const token = await f.owner.action(api.austi.links.create, { id: request, role: 'resident' });
    await f.t.action(api.austi.links.respond, { token, response: reply('submit', 'Model X') });
    const count = (await f.owner.query(api.austi.notifications.list, { id: f.id })).length;
    await f.t.mutation(internal.austi.requests.remind, { id: request, expected: 2 });
    expect((await f.owner.query(api.austi.notifications.list, { id: f.id })).length).toBe(count);
  });
  it('records blocked delivery without claiming an email was sent', async () => {
    const f = await fixture();
    vi.stubEnv('AUSTI_RESEND_API_KEY', '');
    await f.owner.mutation(api.austi.cases.note, {
      id: f.id,
      body: 'We are checking your report.',
      visibility: 'resident',
      attachments: [],
    });
    const notices = await f.owner.query(api.austi.notifications.list, { id: f.id });
    await f.t.action(internal.austi.delivery.deliver, { id: notices[0].id });
    expect((await f.owner.query(api.austi.notifications.list, { id: f.id }))[0]).toMatchObject({
      state: 'blocked',
      attempts: 1,
    });
  });
  it('sends once with a provider idempotency key and does not expose the response token in staff notification data', async () => {
    const f = await fixture();
    vi.stubEnv('AUSTI_RESEND_API_KEY', 'test-key');
    vi.stubEnv('AUSTI_EMAIL_FROM', 'Austi <maintenance@example.com>');
    vi.stubEnv('AUSTI_PUBLIC_URL', 'https://austi.example.com');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const request = await f.owner.mutation(api.austi.requests.create, {
      id: f.id,
      kind: 'approval',
      body: 'Repair quote',
      amount: 10000,
      dueAt: f.dueAt,
    });
    const n = (await f.owner.query(api.austi.notifications.list, { id: f.id })).find(
      (n) => n.to === 'landlord@example.com',
    )!;
    await f.t.action(internal.austi.delivery.deliver, { id: n.id });
    await f.t.action(internal.austi.delivery.deliver, { id: n.id });
    expect(fetch).toHaveBeenCalledTimes(1);
    const options = fetch.mock.calls[0][1];
    expect(options.headers['Idempotency-Key']).toBe(`austi-${n.id}`);
    const payload = JSON.parse(options.body);
    const token = payload.text.match(/#([a-f0-9]{64})/)[1];
    expect(
      (
        await f.t.query(internal.austi.requests.external, {
          tokenHash: await hash(token),
          now: Date.now(),
        })
      ).kind,
    ).toBe('approval');
    expect(
      JSON.stringify(await f.owner.query(api.austi.notifications.list, { id: f.id })),
    ).not.toContain(token);
    expect(request).toBeTruthy();
  });
});
