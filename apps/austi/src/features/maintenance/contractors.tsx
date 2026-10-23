import { Badge } from '@workspace/ui/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { api } from '#convex/_generated/api';

import { ActionDialog, Page, SearchInput, TextField } from './components';
import { field, trades, type Contractor } from './data';
import { useWorkspace } from './workspace';

export function ContractorsPage() {
  const workspace = useWorkspace();
  const contractors = useQuery(api.austi.contractors.list, workspace ? { workspace } : 'skip');
  const [search, setSearch] = useState('');
  const visible = contractors?.filter((c) =>
    [c.company, c.contact, c.area, ...c.trades]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Page title='Contractors'>
      <div className='flex items-center justify-between gap-3'>
        <SearchInput label='Search contractors' value={search} onChange={setSearch} />
        <ContractorSheet />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {['Company / contact', 'Trades', 'Service area', 'Response timeout', 'Status', ''].map(
              (h, i) => (
                <TableHead key={i}>{h || <span className='sr-only'>Actions</span>}</TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible?.map((c) => (
            <TableRow key={c._id}>
              <TableCell className='py-4'>
                <p className='font-medium'>{c.company}</p>
                <p className='text-xs text-muted-foreground'>
                  {c.contact} · {c.email}
                </p>
              </TableCell>
              <TableCell>{c.trades.join(', ')}</TableCell>
              <TableCell>
                {c.area}
                <p className='text-xs text-muted-foreground'>{c.properties}</p>
              </TableCell>
              <TableCell>{c.timeoutHours} hours</TableCell>
              <TableCell>
                <Badge variant='outline'>{c.active ? 'Active' : 'Disabled'}</Badge>
              </TableCell>
              <TableCell>
                <ContractorSheet contractor={c} />
              </TableCell>
            </TableRow>
          ))}
          {!visible?.length && (
            <TableRow>
              <TableCell colSpan={6} className='h-32 text-center text-muted-foreground'>
                {contractors
                  ? 'No contractors found. Add a contractor to assign work.'
                  : 'Loading contractors…'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {contractors?.length === 200 && (
        <p className='text-sm text-muted-foreground'>Showing the first 200 contractors.</p>
      )}
    </Page>
  );
}
export function ContractorSheet({ contractor }: { contractor?: Contractor }) {
  const workspace = useWorkspace();
  const save = useMutation(api.austi.contractors.save);
  if (!workspace) return null;
  return (
    <ActionDialog
      title={contractor ? 'Edit contractor' : 'Add contractor'}
      trigger={contractor ? 'Edit' : 'Add contractor'}
      triggerVariant={contractor ? 'outline' : 'default'}
      confirmLabel='Save contractor'
      onSubmit={(data) =>
        save({
          workspace,
          id: contractor?._id,
          company: field(data, 'company'),
          contact: field(data, 'contact'),
          email: field(data, 'email'),
          phone: field(data, 'phone'),
          trades: data.getAll('trade') as Contractor['trades'],
          area: field(data, 'area'),
          properties: field(data, 'properties'),
          priority: Number(field(data, 'priority')),
          timeoutHours: Number(field(data, 'timeoutHours')),
          active: data.has('active'),
        })
      }
    >
      <TextField name='company' label='Company' defaultValue={contractor?.company} />
      <TextField name='contact' label='Contact person' defaultValue={contractor?.contact} />
      <TextField name='email' label='Email' type='email' defaultValue={contractor?.email} />
      <TextField
        name='phone'
        label='Phone'
        type='tel'
        required={false}
        defaultValue={contractor?.phone}
      />
      <fieldset>
        <legend className='mb-2 text-sm font-medium'>Trades</legend>
        <div className='grid grid-cols-2 gap-3'>
          {trades.map((t) => (
            <label key={t} className='flex items-center gap-2 text-sm'>
              <input
                name='trade'
                type='checkbox'
                value={t}
                defaultChecked={contractor?.trades.includes(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        name='area'
        label='Service area'
        required={false}
        defaultValue={contractor?.area}
      />
      <TextField
        name='properties'
        label='Properties covered'
        required={false}
        defaultValue={contractor?.properties}
      />
      <TextField
        name='priority'
        label='Priority'
        type='number'
        defaultValue={contractor?.priority ?? 1}
      />
      <TextField
        name='timeoutHours'
        label='Response timeout (hours)'
        type='number'
        defaultValue={contractor?.timeoutHours ?? 24}
      />
      <label className='flex items-center gap-2 text-sm'>
        <input name='active' type='checkbox' defaultChecked={contractor?.active ?? true} />
        Active
      </label>
    </ActionDialog>
  );
}
