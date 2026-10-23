import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@workspace/ui/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table';
import { usePaginatedQuery } from 'convex/react';
import { useState } from 'react';

import { api } from '#convex/_generated/api';

import { CaseForm } from './case-form';
import { Page, SearchInput, StatusBadge, Urgency } from './components';
import { age, checkIfNeedsAttention, formatDate, isClosed, statuses } from './data';
import { useClock, useWorkspace } from './workspace';

export function MaintenanceInbox() {
  const workspace = useWorkspace();
  const now = useClock();
  const [filter, setFilter] = useState('Open');
  const [search, setSearch] = useState('');
  const { results, status, loadMore } = usePaginatedQuery(
    api.austi.cases.list,
    workspace ? { workspace } : 'skip',
    { initialNumItems: 100 },
  );
  const visible = results.filter(
    (item) =>
      (filter === 'All' ||
        (filter === 'Open'
          ? !isClosed(item)
          : filter === 'Needs attention'
            ? checkIfNeedsAttention(item, now)
            : item.status === filter)) &&
      [item.title, item.property, item.unit, item.resident.name, item.coordinator]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Page title='Maintenance'>
      <p className='text-sm text-muted-foreground'>
        Reports from connected channels appear here automatically. AI collects missing details in
        the conversation.
      </p>
      <div className='flex flex-wrap items-center gap-3'>
        <SearchInput label='Search loaded cases' value={search} onChange={setSearch} />
        <NativeSelect
          aria-label='Case filter'
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All', 'Open', 'Needs attention', ...statuses].map((s) => (
            <NativeSelectOption key={s}>{s}</NativeSelectOption>
          ))}
        </NativeSelect>
        <div className='ml-auto flex flex-wrap gap-2'>
          <Link to='/settings' hash='integrations' className={buttonVariants({ size: 'sm' })}>
            Manage integrations
          </Link>
          <CaseForm />
        </div>
      </div>
      <Table className='min-w-[1000px]'>
        <TableHeader>
          <TableRow>
            {[
              'Issue',
              'Property / unit',
              'Urgency',
              'Status',
              'Responsible',
              'Next action / deadline',
              'Age',
            ].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow key={item._id}>
              <TableCell className='py-4'>
                <Link
                  to='/maintenance/$caseId'
                  params={{ caseId: item._id }}
                  className='font-medium underline-offset-4 hover:underline'
                >
                  {item.title}
                </Link>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {item.category} · {item.coordinator}
                  {item.source && ' · Telegram'}
                </p>
              </TableCell>
              <TableCell>
                {item.property}
                <p className='text-xs text-muted-foreground'>Unit {item.unit}</p>
              </TableCell>
              <TableCell>
                <Urgency value={item.urgency} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>{item.responsible}</TableCell>
              <TableCell className='max-w-80 whitespace-normal'>
                <p>{item.nextAction}</p>
                <p
                  className={`mt-1 text-xs ${!isClosed(item) && item.dueAt && item.dueAt <= now ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {item.dueAt ? formatDate(item.dueAt) : 'No deadline'}
                </p>
              </TableCell>
              <TableCell>{age(item._creationTime, now)}</TableCell>
            </TableRow>
          ))}
          {!visible.length && (
            <TableRow>
              <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                {status === 'LoadingFirstPage'
                  ? 'Loading cases…'
                  : results.length
                    ? 'No matching cases in the loaded results.'
                    : 'No maintenance cases yet. Connect Telegram in Settings to receive reports.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {status !== 'Exhausted' && status !== 'LoadingFirstPage' && (
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            disabled={status === 'LoadingMore'}
            onClick={() => loadMore(100)}
          >
            {status === 'LoadingMore' ? 'Loading…' : 'Load more cases'}
          </Button>
          <span className='text-xs text-muted-foreground'>
            Filters apply to {results.length} loaded cases.
          </span>
        </div>
      )}
    </Page>
  );
}
