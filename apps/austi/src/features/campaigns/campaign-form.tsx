import { useNavigate } from '@tanstack/react-router';
import { Checkbox } from '@workspace/ui/components/ui/checkbox';
import { Input } from '@workspace/ui/components/ui/input';
import { Label } from '@workspace/ui/components/ui/label';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Form } from '#/components/form';
import { Page } from '#/components/page';
import { channelLabels } from '#/features/drafts/labels';
import { track } from '#/lib/analytics';
import { useSubmit } from '#/lib/use-submit';
import { api } from '#convex/_generated/api';
import { CHANNELS, type Channel } from '#convex/marketing/validators';

export function CampaignForm() {
  const navigate = useNavigate();
  const create = useSubmit(useMutation(api.marketing.campaigns.create));
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);

  const toggle = (channel: Channel, checked: boolean) =>
    setChannels((current) =>
      checked ? [...current, channel] : current.filter((item) => item !== channel),
    );

  const save = async () => {
    const result = await create.submit({ name, idea, offer, audience, channels });
    if (!result.ok) return;
    track('campaign_created', { channels: channels.length });
    await navigate({ to: '/campaigns/$campaignId', params: { campaignId: result.value } });
  };

  return (
    <Page>
      <Page.Header
        title='New campaign'
        description='Describe the idea once. Austi drafts each channel from your brand, for you to review.'
      />
      <Form onSubmit={save}>
        <Form.Field label='Campaign name'>
          {(id) => (
            <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Form.Field>
        <Form.Field label='The idea' hint='What is happening, and why should anyone care?'>
          {(id) => (
            <Textarea
              id={id}
              required
              rows={4}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          )}
        </Form.Field>
        <Form.Field label='Offer' hint='Optional. Austi will not invent one.'>
          {(id) => <Input id={id} value={offer} onChange={(e) => setOffer(e.target.value)} />}
        </Form.Field>
        <Form.Field label='Who it is for' hint='Optional. Defaults to your brand audience.'>
          {(id) => <Input id={id} value={audience} onChange={(e) => setAudience(e.target.value)} />}
        </Form.Field>
        <fieldset className='space-y-3'>
          <legend className='text-sm font-medium'>Channels</legend>
          {CHANNELS.map((channel) => (
            <div key={channel} className='flex items-center gap-2'>
              <Checkbox
                id={`channel-${channel}`}
                checked={channels.includes(channel)}
                onCheckedChange={(checked) => toggle(channel, checked === true)}
              />
              <Label htmlFor={`channel-${channel}`} className='font-normal'>
                {channelLabels[channel]}
              </Label>
            </div>
          ))}
        </fieldset>
        <Form.Footer pending={create.pending} error={create.error} label='Write the drafts' />
      </Form>
    </Page>
  );
}
