import { useNavigate } from '@tanstack/react-router';
import { Input } from '@workspace/ui/components/ui/input';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Form } from '#/components/form';
import { track } from '#/lib/analytics';
import { useSubmit } from '#/lib/use-submit';
import { api } from '#convex/_generated/api';

export function Welcome() {
  const navigate = useNavigate();
  const create = useSubmit(useMutation(api.marketing.workspaces.create));
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const save = async () => {
    const result = await create.submit({ name, websiteUrl });
    if (!result.ok) return;
    track('workspace_created', { hasWebsite: Boolean(websiteUrl.trim()) });
    await navigate({ to: '/' });
  };

  return (
    <main className='mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 px-4 py-10'>
      <img src='/austi-logo.svg' alt='' className='size-6 object-contain invert dark:invert-0' />
      <div className='space-y-2'>
        <h1 className='text-3xl font-medium tracking-tight'>Let’s meet your brand.</h1>
        <p className='text-muted-foreground'>
          Give Austi your website once. It learns what you sell and how you sound, and you can
          correct anything afterwards.
        </p>
      </div>
      <Form onSubmit={save}>
        <Form.Field label='Business name'>
          {(id) => (
            <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Form.Field>
        <Form.Field label='Website' hint='Optional. You can fill in your brand by hand instead.'>
          {(id) => (
            <Input
              id={id}
              placeholder='yourbusiness.com'
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          )}
        </Form.Field>
        <Form.Footer pending={create.pending} error={create.error} label='Continue' />
      </Form>
    </main>
  );
}
