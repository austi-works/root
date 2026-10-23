import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@workspace/ui/components/ui/button';
import { Input } from '@workspace/ui/components/ui/input';
import { usePaginatedQuery } from 'convex/react';
import { useState } from 'react';

import { api } from '#convex/_generated/api';

import { CaseForm } from './maintenance/case-form';
import { Field, Page, Section, StatusBadge } from './maintenance/components';
import { age, checkIfNeedsAttention, formatDate, isClosed } from './maintenance/data';
import { useClock, useWorkspace } from './maintenance/workspace';

export function Dashboard() {
  const workspace = useWorkspace();
  const now = useClock();
  const { results, status, loadMore } = usePaginatedQuery(
    api.austi.cases.list,
    workspace ? { workspace } : 'skip',
    {
      initialNumItems: 100,
    },
  );
  const [reportedFrom, setReportedFrom] = useState('');
  const [reportedTo, setReportedTo] = useState('');
  const from = reportedFrom ? new Date(`${reportedFrom}T00:00:00`).getTime() : -Infinity;
  const until = reportedTo ? new Date(`${reportedTo}T23:59:59.999`).getTime() : Infinity;
  const cases = results.filter((c) => c._creationTime >= from && c._creationTime <= until);
  const resolved = cases.filter((c) => c.status === 'Resolved' && c.resolvedAt !== undefined);
  const meanResolutionHours = resolved.length
    ? (
        resolved.reduce((n, c) => n + c.resolvedAt! - c._creationTime, 0) /
        resolved.length /
        3600000
      ).toFixed(1)
    : null;
  const open = cases.filter((c) => !isClosed(c));
  const attention = open.filter((c) => checkIfNeedsAttention(c, now));
  const scheduled = cases.filter((c) => c.status === 'Scheduled');
  const metrics = [
    { label: 'Open cases', value: open.length },
    { label: 'Needs attention', value: attention.length },
    { label: 'Scheduled visits', value: scheduled.length },
    { label: 'Resolved', value: cases.filter((c) => c.status === 'Resolved').length },
  ];
  const blockers = [...new Set(open.map((c) => c.status))].map((blocker) => ({
    status: blocker,
    items: open.filter((c) => c.status === blocker),
  }));
  return (
    <Page title='Dashboard'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-xl font-bold'>Maintenance overview</h2>
        <div className='flex flex-wrap gap-2'>
          <Link to='/settings' hash='integrations' className={buttonVariants({ size: 'sm' })}>
            Manage integrations
          </Link>
          <CaseForm />
        </div>
      </div>
      <p className='text-sm text-muted-foreground'>
        AI turns reports from your connected channels into cases and asks residents for missing
        details.
      </p>
      <div className='flex flex-wrap items-end gap-4'>
        <Field id='reported-from' label='Reported from'>
          <Input
            id='reported-from'
            type='date'
            value={reportedFrom}
            onChange={(e) => setReportedFrom(e.target.value)}
          />
        </Field>
        <Field id='reported-to' label='Reported through'>
          <Input
            id='reported-to'
            type='date'
            value={reportedTo}
            min={reportedFrom || undefined}
            onChange={(e) => setReportedTo(e.target.value)}
          />
        </Field>
        {(reportedFrom || reportedTo) && (
          <Button
            variant='ghost'
            onClick={() => {
              setReportedFrom('');
              setReportedTo('');
            }}
          >
            Clear dates
          </Button>
        )}
      </div>
      {from > until && (
        <p role='alert' className='text-sm text-destructive'>
          Choose an end date on or after the start date.
        </p>
      )}
      {status === 'LoadingFirstPage' ? (
        <p role='status'>Loading portfolio…</p>
      ) : (
        <>
          <dl className='grid grid-cols-2 gap-6 border-b pb-6 sm:grid-cols-4'>
            {metrics.map((m) => (
              <div key={m.label}>
                <dt className='text-xs text-muted-foreground'>{m.label}</dt>
                <dd className='mt-2 text-3xl font-bold tabular-nums'>{m.value}</dd>
              </div>
            ))}
          </dl>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <Section
              title='Needs attention'
              action={
                <Link
                  to='/maintenance'
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Open maintenance
                </Link>
              }
            >
              <ul className='divide-y'>
                {attention.map((c) => (
                  <li key={c._id}>
                    <Link
                      to='/maintenance/$caseId'
                      params={{ caseId: c._id }}
                      className='block space-y-2 py-4 hover:underline'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='text-sm font-medium'>{c.title}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {c.property} · Unit {c.unit} · {c.responsible}
                      </p>
                      <p className='text-sm'>{c.nextAction}</p>
                      <p className='text-xs text-muted-foreground'>
                        Due {formatDate(c.dueAt)} · In this stage {age(c.stageStartedAt, now)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {!attention.length && (
                <p className='text-sm text-muted-foreground'>
                  {cases.length
                    ? 'No cases need your attention.'
                    : results.length
                      ? 'No cases were reported in the selected date range.'
                      : 'Connect Telegram in Settings to receive your first maintenance report.'}
                </p>
              )}
            </Section>
            <aside className='space-y-7'>
              <Section title='Waiting by stage'>
                <ul className='space-y-3'>
                  {blockers.map((b) => (
                    <li key={b.status} className='flex justify-between gap-2 text-sm'>
                      <span>{b.status}</span>
                      <span className='text-muted-foreground'>
                        {b.items.length} · oldest{' '}
                        {age(Math.min(...b.items.map((c) => c.stageStartedAt)), now)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title='Follow-up measures'>
                <dl className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <dt>Automatic follow-ups queued</dt>
                    <dd>{cases.reduce((n, c) => n + c.followupCount, 0)}</dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt>Reopened / unresolved reports</dt>
                    <dd>{cases.reduce((n, c) => n + c.reopenedCount, 0)}</dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt>Manual follow-ups</dt>
                    <dd>{cases.reduce((n, c) => n + (c.manualFollowups ?? 0), 0)}</dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt>Missed appointments</dt>
                    <dd>{cases.reduce((n, c) => n + c.missedAppointments, 0)}</dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt>Mean time to resolution</dt>
                    <dd>
                      {meanResolutionHours === null
                        ? 'No resolved cases'
                        : `${meanResolutionHours} hours`}
                    </dd>
                  </div>
                </dl>
              </Section>
              <Section title='Upcoming visits'>
                <ul className='space-y-4'>
                  {scheduled.map((c) => (
                    <li key={c._id} className='text-sm'>
                      <Link
                        to='/maintenance/$caseId'
                        params={{ caseId: c._id }}
                        className='font-medium hover:underline'
                      >
                        {c.title}
                      </Link>
                      <p className='text-xs text-muted-foreground'>{formatDate(c.appointmentAt)}</p>
                    </li>
                  ))}
                </ul>
                {!scheduled.length && (
                  <p className='text-sm text-muted-foreground'>No confirmed visits.</p>
                )}
              </Section>
            </aside>
          </div>
          {status !== 'Exhausted' && (
            <div className='flex flex-wrap items-center gap-3 border-t pt-4'>
              <p className='text-xs text-muted-foreground'>
                Metrics cover {cases.length} matching cases out of {results.length} loaded. Load
                more for complete portfolio totals.
              </p>
              <Button
                variant='outline'
                disabled={status === 'LoadingMore'}
                onClick={() => loadMore(100)}
              >
                {status === 'LoadingMore' ? 'Loading…' : 'Load more cases'}
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
