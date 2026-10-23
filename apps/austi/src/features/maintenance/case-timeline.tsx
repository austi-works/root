import { Button } from '@workspace/ui/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useMutation, usePaginatedQuery } from 'convex/react';

import { api } from '#convex/_generated/api';
import type { Id } from '#convex/_generated/dataModel';

import { AttachmentInput, useAttachments } from './attachments';
import { ActionDialog, Field, Section } from './components';
import { field, formatDate } from './data';

export function CaseTimeline({ id }: { id: Id<'austiCases'> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.austi.cases.timeline,
    { id },
    { initialNumItems: 30 },
  );
  const note = useMutation(api.austi.cases.note);
  const upload = useAttachments();
  return (
    <Section
      title='Case history'
      action={
        <ActionDialog
          title='Add a note or resident update'
          trigger='Add update'
          confirmLabel='Save update'
          onSubmit={async (data) =>
            note({
              id,
              body: field(data, 'body'),
              visibility: field(data, 'visibility') as 'internal' | 'resident',
              attachments: await upload(data, { caseId: id }),
            })
          }
        >
          <Field id='visibility' label='Who can see this?'>
            <NativeSelect name='visibility' id='visibility'>
              <NativeSelectOption value='internal'>Staff only</NativeSelectOption>
              <NativeSelectOption value='resident'>
                Shared with resident and response-link recipients
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field id='body' label='Update'>
            <Textarea name='body' id='body' rows={5} required maxLength={5000} />
          </Field>
          <AttachmentInput />
        </ActionDialog>
      }
    >
      <ol className='divide-y'>
        {results.map((e) => (
          <li key={e._id} className='space-y-2 py-4'>
            <div className='flex flex-wrap justify-between gap-2 text-xs text-muted-foreground'>
              <span>
                {e.actor} · {e.visibility === 'internal' ? 'Staff only' : 'Shared update'}
              </span>
              <time dateTime={new Date(e._creationTime).toISOString()}>
                {formatDate(e._creationTime)}
              </time>
            </div>
            <p className='whitespace-pre-wrap break-words text-sm leading-6'>{e.body}</p>
            {e.durationMs !== undefined && (
              <p className='text-xs text-muted-foreground'>
                {e.previousStatus}: {Math.round(e.durationMs / 60000)} minutes
              </p>
            )}
          </li>
        ))}
      </ol>
      {status === 'LoadingFirstPage' && (
        <p role='status' className='text-sm text-muted-foreground'>
          Loading history…
        </p>
      )}
      {status === 'CanLoadMore' && (
        <Button variant='outline' onClick={() => loadMore(30)}>
          Load earlier history
        </Button>
      )}
    </Section>
  );
}
