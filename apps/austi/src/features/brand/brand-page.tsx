import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@workspace/ui/components/ui/button';
import { Input } from '@workspace/ui/components/ui/input';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Form } from '#/components/form';
import { Page } from '#/components/page';
import { track } from '#/lib/analytics';
import { queries } from '#/lib/queries';
import { useSubmit } from '#/lib/use-submit';
import { api } from '#convex/_generated/api';
import type { Doc } from '#convex/_generated/dataModel';

export function BrandPage() {
  const { data: workspace } = useSuspenseQuery(queries.workspace);
  const relearn = useSubmit(useMutation(api.marketing.workspaces.relearn));
  if (!workspace) return null;

  const learning = workspace.learnStatus === 'learning';
  const readAgain = async () => {
    if ((await relearn.submit({})).ok) track('brand_relearned');
  };

  return (
    <Page>
      <Page.Header
        title='Brand'
        description='Everything Austi knows about your business. Every campaign is written from this.'
      >
        <Button
          variant='outline'
          disabled={learning || relearn.pending || !workspace.websiteUrl}
          onClick={readAgain}
        >
          Read website again
        </Button>
      </Page.Header>

      {learning && <Page.Notice>Austi is reading your website…</Page.Notice>}
      {workspace.learnError && workspace.learnStatus === 'failed' && (
        <Page.Notice tone='danger'>{workspace.learnError}</Page.Notice>
      )}
      {relearn.error && <Page.Notice tone='danger'>{relearn.error}</Page.Notice>}

      {/* Remount when a website read finishes so the form shows what Austi just learned. */}
      <BrandForm key={`${workspace.learnStatus}-${workspace.updatedAt}`} workspace={workspace} />
      <Products />
    </Page>
  );
}

function BrandForm({ workspace }: { workspace: Doc<'marketingWorkspaces'> }) {
  const update = useSubmit(useMutation(api.marketing.workspaces.updateBrand));
  const [name, setName] = useState(workspace.name);
  const [websiteUrl, setWebsiteUrl] = useState(workspace.websiteUrl);
  const [summary, setSummary] = useState(workspace.summary);
  const [audience, setAudience] = useState(workspace.audience);
  const [voice, setVoice] = useState(workspace.voice);

  const save = async () => {
    if ((await update.submit({ name, websiteUrl, summary, audience, voice })).ok)
      track('brand_saved');
  };

  return (
    <Form onSubmit={save}>
      <Form.Field label='Business name'>
        {(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}
      </Form.Field>
      <Form.Field label='Website'>
        {(id) => (
          <Input id={id} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        )}
      </Form.Field>
      <Form.Field label='What you do'>
        {(id) => (
          <Textarea id={id} rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
        )}
      </Form.Field>
      <Form.Field label='Who you sell to'>
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        )}
      </Form.Field>
      <Form.Field label='How you sound'>
        {(id) => (
          <Textarea id={id} rows={3} value={voice} onChange={(e) => setVoice(e.target.value)} />
        )}
      </Form.Field>
      <Form.Footer pending={update.pending} error={update.error} label='Save brand' />
    </Form>
  );
}

function Products() {
  const { data: products } = useSuspenseQuery(queries.products);
  const add = useSubmit(useMutation(api.marketing.products.add));
  const remove = useSubmit(useMutation(api.marketing.products.remove));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const save = async () => {
    if (!(await add.submit({ name, description })).ok) return;
    setName('');
    setDescription('');
  };

  return (
    <Page.Section title='Products'>
      {products.length > 0 && (
        <ul className='max-w-2xl divide-y border-y'>
          {products.map((product) => (
            <li key={product._id} className='flex items-start justify-between gap-4 py-3'>
              <span className='min-w-0'>
                <span className='block font-medium'>{product.name}</span>
                <span className='block text-sm text-muted-foreground'>{product.description}</span>
              </span>
              <Button
                variant='ghost'
                size='sm'
                disabled={remove.pending}
                onClick={() => remove.submit({ productId: product._id })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Form onSubmit={save}>
        <Form.Field label='Product name'>
          {(id) => (
            <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Form.Field>
        <Form.Field label='Description'>
          {(id) => (
            <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />
          )}
        </Form.Field>
        <Form.Footer pending={add.pending} error={add.error ?? remove.error} label='Add product' />
      </Form>
    </Page.Section>
  );
}
