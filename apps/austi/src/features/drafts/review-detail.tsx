import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/ui/button';
import { Input } from '@workspace/ui/components/ui/input';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Form } from '#/components/form';
import { Page } from '#/components/page';
import { channelLabels, StatusBadge } from '#/features/drafts/labels';
import { track } from '#/lib/analytics';
import { queries, type DraftId } from '#/lib/queries';
import { useSubmit } from '#/lib/use-submit';
import { api } from '#convex/_generated/api';
import type { Doc } from '#convex/_generated/dataModel';

type Draft = Doc<'marketingDrafts'>;

export function ReviewDetail({ draftId }: { draftId: DraftId }) {
  const { data } = useSuspenseQuery(queries.draft(draftId));
  const { draft, comments } = data;
  const [editing, setEditing] = useState(false);

  return (
    <Page>
      <Page.Header title={draft.headline} description={channelLabels[draft.channel]}>
        <StatusBadge status={draft.status} />
      </Page.Header>
      <p className='text-sm text-muted-foreground'>
        From{' '}
        <Link
          to='/campaigns/$campaignId'
          params={{ campaignId: draft.campaignId }}
          className='underline underline-offset-4'
        >
          {draft.campaignName}
        </Link>
        , version {draft.version}
      </p>

      {draft.revising && <Page.Notice>Austi is revising this draft from your note…</Page.Notice>}

      {editing ? (
        <DraftEditor key={draft.version} draft={draft} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p className='max-w-2xl whitespace-pre-wrap leading-relaxed'>{draft.body}</p>
          <DraftDecision draft={draft} onEdit={() => setEditing(true)} />
        </>
      )}

      <Page.Section title='Comments'>
        {comments.length > 0 && (
          <ul className='max-w-2xl space-y-3'>
            {comments.map((comment) => (
              <li key={comment._id}>
                <p className='text-sm font-medium'>{comment.author === 'you' ? 'You' : 'Austi'}</p>
                <p className='text-muted-foreground'>{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        <RevisionForm draft={draft} />
      </Page.Section>
    </Page>
  );
}

function DraftDecision({ draft, onEdit }: { draft: Draft; onEdit: () => void }) {
  const decide = useSubmit(useMutation(api.marketing.drafts.decide));
  const [copied, setCopied] = useState(false);

  const apply = async (decision: 'approved' | 'held' | 'pending') => {
    if (!(await decide.submit({ draftId: draft._id, decision })).ok) return;
    const events = {
      approved: 'draft_approved',
      held: 'draft_held',
      pending: 'draft_reopened',
    } as const;
    track(events[decision], { channel: draft.channel });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(`${draft.headline}\n\n${draft.body}`);
    setCopied(true);
    track('draft_copied', { channel: draft.channel });
  };

  const disabled = decide.pending || !!draft.revising;

  return (
    <div className='space-y-3'>
      {decide.error && (
        <p role='alert' className='text-sm text-danger'>
          {decide.error}
        </p>
      )}
      <div className='flex flex-wrap gap-2'>
        {draft.status === 'approved' ? (
          <>
            <Button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Button>
            <Button variant='outline' disabled={disabled} onClick={() => apply('pending')}>
              Undo approval
            </Button>
          </>
        ) : (
          <>
            <Button disabled={disabled} onClick={() => apply('approved')}>
              Approve
            </Button>
            {draft.status === 'held' ? (
              <Button variant='outline' disabled={disabled} onClick={() => apply('pending')}>
                Back to review
              </Button>
            ) : (
              <Button variant='outline' disabled={disabled} onClick={() => apply('held')}>
                Hold
              </Button>
            )}
          </>
        )}
        <Button variant='ghost' disabled={disabled} onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function DraftEditor({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const edit = useSubmit(useMutation(api.marketing.drafts.edit));
  const [headline, setHeadline] = useState(draft.headline);
  const [body, setBody] = useState(draft.body);

  const save = async () => {
    if (!(await edit.submit({ draftId: draft._id, headline, body })).ok) return;
    track('draft_edited', { channel: draft.channel });
    onDone();
  };

  return (
    <Form onSubmit={save}>
      <Form.Field label='Headline'>
        {(id) => <Input id={id} value={headline} onChange={(e) => setHeadline(e.target.value)} />}
      </Form.Field>
      <Form.Field label='Draft' hint='Saving sends this draft back to review.'>
        {(id) => (
          <Textarea id={id} rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
        )}
      </Form.Field>
      <Form.Footer pending={edit.pending} error={edit.error} label='Save changes'>
        <Button type='button' variant='ghost' onClick={onDone}>
          Cancel
        </Button>
      </Form.Footer>
    </Form>
  );
}

function RevisionForm({ draft }: { draft: Draft }) {
  const revise = useSubmit(useMutation(api.marketing.drafts.requestRevision));
  const [note, setNote] = useState('');

  const send = async () => {
    if (!(await revise.submit({ draftId: draft._id, note })).ok) return;
    setNote('');
    track('draft_revision_requested', { channel: draft.channel });
  };

  return (
    <Form onSubmit={send}>
      <Form.Field label='Ask Austi for changes'>
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            value={note}
            placeholder='Make it shorter and lead with the offer.'
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Form.Field>
      <Form.Footer
        pending={revise.pending || !!draft.revising}
        error={revise.error}
        label='Request changes'
      />
    </Form>
  );
}
