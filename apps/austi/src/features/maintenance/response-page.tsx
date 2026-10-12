import { Button } from '@workspace/ui/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useAction } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useEffect, useState } from 'react';

import { api } from '#convex/_generated/api';

import { AttachmentInput, useAttachments } from './attachments';
import { Field, errorMessage } from './components';
import { field, formatDate, formatEuro } from './data';

export function ResponsePage() {
  const read = useAction(api.austi.links.read);
  const moreFiles = useAction(api.austi.links.moreFiles);
  const respond = useAction(api.austi.links.respond);
  const upload = useAttachments();
  const [token, setToken] = useState('');
  const [data, setData] = useState<FunctionReturnType<typeof api.austi.links.read> | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [filesPending, setFilesPending] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    const token = window.location.hash.slice(1);
    setToken(token);
    if (!token) {
      setError('This response link is incomplete. Ask your property manager for a new link.');
      return;
    }
    void read({ token })
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [read]);
  const options =
    data?.kind === 'approval'
      ? [
          ['approve', 'Approve estimate'],
          ['decline', 'Decline estimate'],
          ['clarify', 'Request clarification'],
        ]
      : data?.kind === 'assignment'
        ? [
            ['accept', 'Accept job'],
            ['decline', 'Decline job'],
          ]
        : data?.kind === 'scheduling'
          ? data.confirmed
            ? [['cancel', 'Request another time']]
            : [
                ['confirm', 'Confirm appointment'],
                ['cancel', 'Request another time'],
              ]
          : data?.kind === 'completion'
            ? [
                ['resolved', 'The issue is resolved'],
                ['unresolved', 'The issue persists'],
              ]
            : [['submit', 'Submit information']];
  return (
    <main className='mx-auto max-w-2xl space-y-6 px-5 py-10'>
      <p className='text-lg font-bold'>austi</p>
      {done ? (
        <div role='status' className='space-y-3'>
          <h1 className='text-xl font-bold'>Response recorded</h1>
          <p className='text-sm text-muted-foreground'>
            Your property manager can now see your response.
            {data?.kind === 'scheduling'
              ? ' The appointment is confirmed only when both parties agree. You will receive an update.'
              : ''}
          </p>
        </div>
      ) : (
        <>
          {!data && !error && <p role='status'>Loading request…</p>}
          {data && (
            <>
              <div className='space-y-2'>
                <h1 className='text-2xl font-bold'>{data.title}</h1>
                <p className='text-sm text-muted-foreground'>
                  {data.property} · Unit {data.unit} · {data.role} response
                </p>
              </div>
              <p className='whitespace-pre-wrap text-sm leading-6'>{data.body}</p>
              {data.amount !== null && (
                <p className='text-xl font-medium'>{formatEuro(data.amount)}</p>
              )}
              {data.appointmentAt !== null && (
                <p className='text-sm'>
                  Proposed visit: {formatDate(data.appointmentAt)} –{' '}
                  {formatDate(data.appointmentEnd ?? undefined)}
                  <br />
                  {data.presenceRequired
                    ? 'Resident presence required.'
                    : 'Please confirm access arrangements.'}
                </p>
              )}
              {data.role === 'contractor' && (
                <div className='space-y-2 border-y py-4 text-sm'>
                  <p className='whitespace-pre-wrap'>{data.report}</p>
                  <p>Access: {data.access || 'Please confirm with the coordinator.'}</p>
                </div>
              )}
              {data.files.length > 0 && (
                <ul className='space-y-2'>
                  {data.files.map((file, index) => (
                    <li key={index}>
                      {file.url && (
                        <a
                          className='text-sm underline'
                          href={file.url}
                          rel='noreferrer'
                          target='_blank'
                        >
                          {file.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!data.filesDone && (
                <Button
                  type='button'
                  variant='outline'
                  disabled={filesPending}
                  onClick={async () => {
                    setFilesPending(true);
                    setError('');
                    try {
                      const page = await moreFiles({
                        token,
                        paginationOpts: { cursor: data.filesCursor, numItems: 40 },
                      });
                      setData((current) =>
                        current
                          ? {
                              ...current,
                              files: [...current.files, ...page.page],
                              filesCursor: page.continueCursor,
                              filesDone: page.isDone,
                            }
                          : current,
                      );
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setFilesPending(false);
                    }
                  }}
                >
                  {filesPending ? 'Loading files…' : 'Load older files'}
                </Button>
              )}
              <form
                className='space-y-5'
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (pending) return;
                  const values = new FormData(e.currentTarget);
                  setPending(true);
                  setError('');
                  try {
                    const choice = field(values, 'choice') as
                      | 'submit'
                      | 'approve'
                      | 'decline'
                      | 'clarify'
                      | 'accept'
                      | 'confirm'
                      | 'cancel'
                      | 'resolved'
                      | 'unresolved';
                    const body = field(values, 'body');
                    if (
                      ['submit', 'decline', 'clarify', 'cancel', 'unresolved'].includes(choice) &&
                      !body
                    )
                      throw new Error(
                        'Please explain your response so the coordinator can take the next step.',
                      );
                    await respond({
                      token,
                      response: {
                        choice,
                        body,
                        attachments: await upload(values, { token }),
                        outcome:
                          data.kind === 'work'
                            ? (field(values, 'outcome') as
                                | 'Repaired'
                                | 'Temporary fix'
                                | 'Parts required'
                                | 'Unable to complete')
                            : undefined,
                      },
                    });
                    setDone(true);
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <fieldset disabled={pending} className='space-y-5'>
                  <Field id='choice' label='Your response'>
                    <NativeSelect id='choice' name='choice'>
                      {options.map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                          {label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  {data.kind === 'work' && (
                    <Field id='outcome' label='Work outcome'>
                      <NativeSelect id='outcome' name='outcome'>
                        {['Repaired', 'Temporary fix', 'Parts required', 'Unable to complete'].map(
                          (value) => (
                            <NativeSelectOption key={value}>{value}</NativeSelectOption>
                          ),
                        )}
                      </NativeSelect>
                    </Field>
                  )}
                  <Field
                    id='body'
                    label={
                      data.kind === 'information'
                        ? 'Requested details'
                        : 'Explanation or additional information'
                    }
                  >
                    <Textarea
                      id='body'
                      name='body'
                      rows={4}
                      maxLength={5000}
                      required={data.kind === 'information'}
                    />
                  </Field>
                  <AttachmentInput />
                  <Button type='submit' disabled={pending}>
                    {pending ? 'Submitting…' : 'Submit response'}
                  </Button>
                </fieldset>
              </form>
              {!!data.updates.length && (
                <details className='border-t pt-4'>
                  <summary className='cursor-pointer text-sm font-medium'>
                    Recent case updates
                  </summary>
                  <ol className='mt-3 divide-y'>
                    {data.updates.map((update, index) => (
                      <li key={index} className='space-y-1 py-3'>
                        <p className='text-xs text-muted-foreground'>{formatDate(update.time)}</p>
                        <p className='whitespace-pre-wrap text-sm'>{update.body}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
        </>
      )}
    </main>
  );
}
