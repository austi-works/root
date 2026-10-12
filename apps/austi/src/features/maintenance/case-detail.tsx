import { Button } from '@workspace/ui/components/ui/button';
import { Input } from '@workspace/ui/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { api } from '#convex/_generated/api';
import type { Doc, Id } from '#convex/_generated/dataModel';
import { rolesFor } from '#convex/austi/validators';

import { AttachmentInput, useAttachments } from './attachments';
import { CaseForm } from './case-form';
import { CaseTimeline } from './case-timeline';
import {
  ActionDialog,
  Field,
  Page,
  Section,
  StatusBadge,
  TextField,
  Urgency,
  errorMessage,
} from './components';
import {
  datetimeValue,
  field,
  formatDate,
  formatEuro,
  isClosed,
  type MaintenanceCase,
} from './data';

export function CaseDetail({ id }: { id: Id<'austiCases'> }) {
  const data = useQuery(api.austi.cases.get, { id });
  if (!data)
    return (
      <Page title='Maintenance case'>
        <p role='status'>Loading case…</p>
      </Page>
    );
  const { item, request, files } = data;
  return (
    <Page title={item.title}>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-2'>
          <h2 className='text-xl font-bold'>{item.title}</h2>
          <p className='text-sm text-muted-foreground'>
            {item.property} · Unit {item.unit} · Reported {formatDate(item._creationTime)}
            {item.source && ' · Received through Telegram'}
          </p>
          <div className='flex gap-3'>
            <StatusBadge status={item.status} />
            <Urgency value={item.urgency} />
          </div>
        </div>
        {!isClosed(item) && !request && <CaseForm item={item} />}
      </div>
      <div className='grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]'>
        <div className='min-w-0 space-y-7'>
          <Section title='Next action'>
            <p className='whitespace-pre-wrap text-sm'>{item.nextAction}</p>
            <p className='text-xs text-muted-foreground'>
              {item.responsible} · Coordinator: {item.coordinator} · Due: {formatDate(item.dueAt)}
            </p>
            {request && <PendingRequest key={request._id} item={item} request={request} />}
            {!isClosed(item) && <CaseActions item={item} />}
          </Section>
          <Section title='Resident report'>
            <p className='whitespace-pre-wrap text-sm leading-6'>{item.report}</p>
          </Section>
          <CaseTimeline id={id} />
        </div>
        <aside className='min-w-0 space-y-7 border-t pt-6 lg:border-t-0 lg:pt-0'>
          <Section title='People and access'>
            <dl className='space-y-3 text-sm'>
              <div>
                <dt className='text-xs text-muted-foreground'>Resident</dt>
                <dd>
                  {item.resident.name} ·{' '}
                  {item.resident.email || (item.source ? 'Telegram' : 'No email')}
                </dd>
              </div>
              <div>
                <dt className='text-xs text-muted-foreground'>Owner</dt>
                <dd>
                  {item.owner.name} · {item.owner.email}
                </dd>
              </div>
              <div>
                <dt className='text-xs text-muted-foreground'>Access</dt>
                <dd className='whitespace-pre-wrap'>{item.access || 'No access instructions'}</dd>
                <dd className='mt-1 text-xs text-muted-foreground'>
                  {item.presenceRequired
                    ? 'Resident presence required'
                    : 'Resident presence not required'}
                </dd>
              </div>
            </dl>
          </Section>
          {(item.appointmentAt || item.completion) && (
            <Section title='Repair'>
              <p className='text-sm'>
                {item.appointmentAt
                  ? `${formatDate(item.appointmentAt)} – ${formatDate(item.appointmentEnd)}`
                  : 'No appointment'}
              </p>
              {item.completion && (
                <p className='text-sm'>
                  {item.completion.outcome}: {item.completion.notes}
                </p>
              )}
            </Section>
          )}
          <Section title='Attachments'>
            {files.length ? (
              <ul className='space-y-2'>
                {files.map((f) => (
                  <li key={f.id} className='break-words text-sm'>
                    {f.url ? (
                      <a href={f.url} target='_blank' rel='noreferrer' className='underline'>
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                    <span className='ml-2 text-xs text-muted-foreground'>
                      {f.visibility === 'internal' ? 'Staff only' : 'Shared'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-sm text-muted-foreground'>No files attached.</p>
            )}
          </Section>
          <CaseControls item={item} />
          <DeliveryStatus id={id} />
        </aside>
      </div>
    </Page>
  );
}

function CaseActions({ item }: { item: MaintenanceCase }) {
  const create = useMutation(api.austi.requests.create);
  const contractors = useQuery(api.austi.contractors.list, { workspace: item.workspace });
  const work = useMutation(api.austi.cases.recordWork);
  const upload = useAttachments();
  const choices = [
    { kind: 'information', label: 'Request information' },
    { kind: 'approval', label: 'Request owner approval' },
    { kind: 'assignment', label: 'Assign contractor' },
    ...(item.status === 'Awaiting scheduling'
      ? [{ kind: 'scheduling', label: 'Propose appointment' }]
      : []),
    ...(item.completion?.outcome === 'Repaired'
      ? [{ kind: 'completion', label: 'Confirm resolution' }]
      : []),
  ] as { kind: Doc<'austiRequests'>['kind']; label: string }[];
  return (
    <div className='flex flex-wrap gap-2'>
      {!item.pendingRequest &&
        choices.map(({ kind, label }) => (
          <ActionDialog
            key={kind}
            title={label}
            trigger={label}
            confirmLabel='Create request'
            onSubmit={(data) =>
              create({
                id: item._id,
                kind,
                body: field(data, 'body'),
                dueAt: kind === 'assignment' ? undefined : new Date(field(data, 'dueAt')).getTime(),
                amount:
                  kind === 'approval' ? Math.round(Number(field(data, 'amount')) * 100) : undefined,
                contractorId:
                  kind === 'assignment'
                    ? (field(data, 'contractorId') as Id<'austiContractors'>)
                    : undefined,
                appointmentAt:
                  kind === 'scheduling'
                    ? new Date(field(data, 'appointmentAt')).getTime()
                    : undefined,
                appointmentEnd:
                  kind === 'scheduling'
                    ? new Date(field(data, 'appointmentEnd')).getTime()
                    : undefined,
              })
            }
          >
            <Field
              id='body'
              label={
                kind === 'approval'
                  ? 'Scope of work and recommendation'
                  : kind === 'information'
                    ? 'Questions for the resident'
                    : 'Request details'
              }
            >
              <Textarea
                name='body'
                id='body'
                rows={4}
                required
                maxLength={5000}
                defaultValue={
                  kind === 'completion'
                    ? `Has the repair resolved the issue? ${item.completion?.notes ?? ''}`
                    : undefined
                }
              />
            </Field>
            {kind === 'approval' && (
              <Field id='amount' label='Estimate (EUR)'>
                <Input name='amount' id='amount' type='number' step='0.01' min='0.01' required />
              </Field>
            )}
            {kind === 'assignment' && (
              <Field id='contractorId' label='Contractor'>
                <NativeSelect id='contractorId' name='contractorId' required defaultValue=''>
                  <NativeSelectOption value='' disabled>
                    Select contractor
                  </NativeSelectOption>
                  {contractors
                    ?.filter((c) => c.active && c.trades.includes(item.category))
                    .sort((a, b) => a.priority - b.priority)
                    .map((c) => (
                      <NativeSelectOption value={c._id} key={c._id}>
                        {c.company} · {c.area}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <p className='mt-2 text-xs text-muted-foreground'>
                  Only active contractors for {item.category.toLowerCase()} are shown. Check
                  property coverage before assigning.
                </p>
              </Field>
            )}
            {kind === 'scheduling' && (
              <>
                <TextField
                  name='appointmentAt'
                  label='Appointment starts'
                  type='datetime-local'
                  defaultValue={datetimeValue(Date.now() + 2 * 86400000)}
                />
                <TextField
                  name='appointmentEnd'
                  label='Appointment ends'
                  type='datetime-local'
                  defaultValue={datetimeValue(Date.now() + 2 * 86400000 + 3600000)}
                />
                <p className='text-xs text-muted-foreground'>
                  Both parties must confirm this window. A declined window returns to scheduling.
                </p>
              </>
            )}
            {kind === 'assignment' ? (
              <p className='text-xs text-muted-foreground'>
                The response deadline uses the selected contractor’s configured timeout.
              </p>
            ) : (
              <TextField
                name='dueAt'
                label='Response deadline'
                type='datetime-local'
                defaultValue={datetimeValue()}
              />
            )}
          </ActionDialog>
        ))}
      {['Scheduled', 'In progress'].includes(item.status) && (
        <ActionDialog
          title='Record work outcome'
          trigger='Record work'
          confirmLabel='Save outcome'
          onSubmit={async (data) =>
            work({
              id: item._id,
              outcome: field(data, 'outcome') as NonNullable<
                MaintenanceCase['completion']
              >['outcome'],
              notes: field(data, 'notes'),
              attachments: await upload(data, { caseId: item._id }),
            })
          }
        >
          <Field id='outcome' label='Outcome'>
            <NativeSelect name='outcome' id='outcome'>
              {['Repaired', 'Temporary fix', 'Parts required', 'Unable to complete'].map((o) => (
                <NativeSelectOption key={o}>{o}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field id='notes' label='Work performed and follow-up needed'>
            <Textarea id='notes' name='notes' required rows={4} />
          </Field>
          <AttachmentInput />
          <p className='text-xs text-muted-foreground'>
            A repaired outcome still requires resident confirmation before closure.
          </p>
        </ActionDialog>
      )}
    </div>
  );
}
function PendingRequest({
  item,
  request,
}: {
  item: MaintenanceCase;
  request: Doc<'austiRequests'>;
}) {
  const createLink = useAction(api.austi.links.create);
  const revoke = useMutation(api.austi.links.revoke);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const roles = rolesFor(request.kind);
  return (
    <div className='space-y-3 border-t pt-4'>
      {request.amount !== undefined && <p className='font-medium'>{formatEuro(request.amount)}</p>}
      {request.kind === 'scheduling' && (
        <p className='text-sm'>
          {formatDate(request.appointmentAt)} – {formatDate(request.appointmentEnd)}
          <br />
          Resident: {request.residentConfirmed ? 'Confirmed' : 'Waiting'} · Contractor:{' '}
          {request.contractorConfirmed ? 'Confirmed' : 'Waiting'}
        </p>
      )}
      <p className='text-xs text-muted-foreground'>
        Response links expire after seven days and grant access only to this request. Share them
        with the named recipient.
        {request.automaticLinksPaused &&
          ' Automatic request emails are stopped; share a new link manually or withdraw this request.'}
      </p>
      <div className='flex flex-wrap gap-2'>
        {roles.map((role) => (
          <Button
            key={role}
            size='sm'
            variant='outline'
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                const token = await createLink({ id: request._id, role });
                setLink(`${window.location.origin}/respond#${token}`);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setPending(false);
              }
            }}
          >
            Create {role} link
          </Button>
        ))}
        <ActionDialog
          title='Revoke response links'
          trigger='Revoke links'
          onSubmit={async () => {
            await revoke({ id: request._id });
            setLink('');
          }}
        >
          <p className='text-sm'>
            Existing response links will stop working, and automatic request emails will stop. You
            can create and share new links manually afterward.
          </p>
        </ActionDialog>
      </div>
      {link && (
        <Field id='response-link' label='Response link'>
          <Input id='response-link' value={link} readOnly onFocus={(e) => e.target.select()} />
        </Field>
      )}
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <p className='text-xs text-muted-foreground'>
        {item.automation
          ? `Reminder every ${item.reminderHours} hours, up to ${item.maxReminders} reminders.`
          : 'Automatic reminders are paused.'}
      </p>
    </div>
  );
}
function CaseControls({ item }: { item: MaintenanceCase }) {
  const control = useMutation(api.austi.cases.control);
  const choices = isClosed(item)
    ? [{ action: 'reopen', label: 'Reopen case' }]
    : [
        {
          action: item.automation ? 'pause' : 'resume',
          label: item.automation ? 'Pause reminders' : 'Resume reminders',
        },
        ...(item.pendingRequest ? [{ action: 'withdraw', label: 'Withdraw request' }] : []),
        ...(item.status === 'Scheduled' ? [{ action: 'start', label: 'Start work' }] : []),
        ...(['Scheduled', 'In progress'].includes(item.status)
          ? [{ action: 'missed', label: 'Record missed visit' }]
          : []),
        { action: 'followup', label: 'Log manual follow-up' },
        { action: 'cancel', label: 'Cancel case' },
      ];
  return (
    <Section title='Case controls'>
      <div className='flex flex-wrap gap-2'>
        {choices.map(({ action, label }) => (
          <ActionDialog
            key={action}
            title={label}
            trigger={label}
            confirmLabel={label}
            onSubmit={(data) =>
              control({
                id: item._id,
                action: action as
                  | 'cancel'
                  | 'reopen'
                  | 'withdraw'
                  | 'pause'
                  | 'resume'
                  | 'start'
                  | 'missed'
                  | 'followup',
                reason: field(data, 'reason'),
              })
            }
          >
            {['cancel', 'reopen', 'withdraw', 'missed', 'followup'].includes(action) ? (
              <Field id='reason' label='Reason / details'>
                <Textarea id='reason' name='reason' required />
              </Field>
            ) : (
              <p className='text-sm'>{label} for this case.</p>
            )}
          </ActionDialog>
        ))}
      </div>
    </Section>
  );
}
function DeliveryStatus({ id }: { id: Id<'austiCases'> }) {
  const notices = useQuery(api.austi.notifications.list, { id });
  const retry = useMutation(api.austi.notifications.retry);
  return (
    <Section title='Message delivery'>
      <p className='text-xs text-muted-foreground'>
        Accepted means Telegram or the email provider accepted the message; it does not confirm it
        was read.
      </p>
      <ul className='max-h-96 divide-y overflow-y-auto'>
        {notices?.map((n) => (
          <li key={n.id} className='space-y-2 py-3 text-xs'>
            <p className='font-medium'>
              {n.to} · {n.state}
            </p>
            <p className='whitespace-pre-wrap break-words text-muted-foreground'>{n.body}</p>
            {n.error && <p className='text-destructive'>{n.error}</p>}
            {['failed', 'blocked'].includes(n.state) && (
              <ActionDialog
                title='Retry message'
                trigger='Retry'
                onSubmit={() => retry({ id: n.id })}
              >
                <p className='text-sm'>
                  Retry this message to {n.to}. Obsolete requests will be cancelled.
                </p>
              </ActionDialog>
            )}
          </li>
        ))}
      </ul>
      {notices?.length === 0 && (
        <p className='text-sm text-muted-foreground'>No messages queued yet.</p>
      )}
    </Section>
  );
}
