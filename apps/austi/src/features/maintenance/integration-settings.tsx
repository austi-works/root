import { Link } from '@tanstack/react-router';
import { Input } from '@workspace/ui/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';

import { api } from '#convex/_generated/api';

import { ActionDialog, Field, Section, TextField } from './components';
import { field, formatDate } from './data';
import { useWorkspace } from './workspace';

type Integration = FunctionReturnType<typeof api.austi.integrations.list>[number];

export function IntegrationSettings() {
  const workspace = useWorkspace();
  const portfolios = useQuery(api.austi.workspaces.list);
  const integrations = useQuery(api.austi.integrations.list, workspace ? { workspace } : 'skip');
  const owned = portfolios?.find((p) => p.id === workspace)?.owned;
  return (
    <div id='integrations' className='space-y-5'>
      <Section title='Integrations' action={owned && <TelegramConnection />}>
        <p className='text-sm text-muted-foreground'>
          Receive maintenance reports through your connected channels. AI creates cases from
          messages, asks for missing details, and keeps the conversation with the case. Telegram is
          available now.
        </p>
        {integrations === undefined ? (
          <p role='status'>Loading integrations…</p>
        ) : (
          !integrations.length && (
            <p className='text-sm'>
              Connect a Telegram bot, then share its link with residents to start receiving cases.
            </p>
          )
        )}
        <div className='divide-y border-y'>
          {integrations?.map((integration) => (
            <TelegramIntegration key={integration.id} integration={integration} owned={!!owned} />
          ))}
        </div>
        {!owned && (
          <p className='text-xs text-muted-foreground'>
            The portfolio owner manages connected channels.
          </p>
        )}
      </Section>
    </div>
  );
}

function TelegramConnection({ integration }: { integration?: Integration }) {
  const workspace = useWorkspace();
  const connect = useAction(api.austi.integrations.connect);
  if (!workspace) return null;
  return (
    <ActionDialog
      title={integration ? 'Reconnect Telegram' : 'Connect Telegram'}
      trigger={integration ? 'Reconnect' : 'Connect Telegram'}
      confirmLabel='Connect bot'
      onSubmit={(data) =>
        connect({
          workspace,
          token: field(data, 'token'),
          property: field(data, 'property'),
          owner: { name: field(data, 'ownerName'), email: field(data, 'ownerEmail') },
          model: field(data, 'model') as Integration['model'],
        })
      }
    >
      <p className='text-sm text-muted-foreground'>
        Create a dedicated maintenance bot with{' '}
        <a href='https://t.me/BotFather' target='_blank' rel='noreferrer' className='underline'>
          BotFather
        </a>{' '}
        and paste its token. Connecting this bot replaces its current webhook. Anyone who messages
        the bot can submit a report to this portfolio.
      </p>
      <Field id='token' label='Bot token'>
        <Input name='token' id='token' type='password' autoComplete='new-password' required />
      </Field>
      <TextField
        name='property'
        label='Default property address (optional)'
        defaultValue={integration?.property}
        required={false}
      />
      <p className='text-xs text-muted-foreground'>
        Leave the address empty to let AI ask each resident. The repair contact receives owner
        approval requests.
      </p>
      <TextField
        name='ownerName'
        label='Repair contact name'
        defaultValue={integration?.owner.name}
      />
      <TextField
        name='ownerEmail'
        label='Repair contact email'
        type='email'
        defaultValue={integration?.owner.email}
      />
      <Field id='model' label='Intake model'>
        <NativeSelect
          name='model'
          id='model'
          defaultValue={integration?.model ?? 'google/gemini-2.5-flash-lite'}
        >
          <NativeSelectOption value='google/gemini-2.5-flash-lite'>
            Gemini 2.5 Flash Lite
          </NativeSelectOption>
          <NativeSelectOption value='openai/gpt-5-mini'>GPT-5 Mini</NativeSelectOption>
        </NativeSelect>
      </Field>
    </ActionDialog>
  );
}

function TelegramIntegration({ integration, owned }: { integration: Integration; owned: boolean }) {
  const disconnect = useAction(api.austi.integrations.disconnect);
  const messages = useQuery(api.austi.intake.recent, { integrationId: integration.id });
  const retry = useMutation(api.austi.intake.retry);
  return (
    <div className='space-y-4 py-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Telegram · @{integration.username}</p>
          <p className='text-xs text-muted-foreground'>
            {integration.status} · {integration.property || 'Ask residents for the address'}
            {integration.lastReceivedAt &&
              ` · Last message ${formatDate(integration.lastReceivedAt)}`}
          </p>
          {integration.status === 'connected' && (
            <a
              href={`https://t.me/${integration.username}`}
              target='_blank'
              rel='noreferrer'
              className='text-sm underline'
            >
              Open bot and share with residents
            </a>
          )}
        </div>
        {owned && integration.status !== 'connecting' && (
          <div className='flex gap-2'>
            <TelegramConnection integration={integration} />
            {integration.status === 'connected' && (
              <ActionDialog
                title='Disconnect Telegram'
                trigger='Disconnect'
                confirmLabel='Disconnect'
                onSubmit={() => disconnect({ id: integration.id })}
              >
                <p>
                  Stop receiving new reports and sending Telegram updates through @
                  {integration.username}? Saved cases and messages remain available.
                </p>
              </ActionDialog>
            )}
          </div>
        )}
      </div>
      {integration.error && (
        <p role='alert' className='text-sm text-destructive'>
          {integration.error}
        </p>
      )}
      {!!messages?.length && (
        <div>
          <h3 className='text-xs font-medium text-muted-foreground'>Recent intake</h3>
          <ul className='divide-y'>
            {messages.map((message) => (
              <li key={message.id} className='space-y-2 py-3 text-sm'>
                <div className='flex flex-wrap justify-between gap-2'>
                  <span>
                    {message.senderName} · {message.state}
                    {message.replyState && ` · Reply ${message.replyState}`}
                  </span>
                  {message.caseId && (
                    <Link
                      to='/maintenance/$caseId'
                      params={{ caseId: message.caseId }}
                      className='underline'
                    >
                      Open case
                    </Link>
                  )}
                </div>
                <p className='line-clamp-2 whitespace-pre-wrap text-muted-foreground'>
                  {message.text}
                </p>
                {message.error && <p className='text-xs text-destructive'>{message.error}</p>}
                {(['failed', 'queued'].includes(message.state) ||
                  message.replyState === 'failed') && (
                  <ActionDialog
                    title='Retry intake'
                    trigger={message.state !== 'processed' ? 'Retry processing' : 'Retry reply'}
                    confirmLabel='Retry'
                    onSubmit={() => retry({ id: message.id })}
                  >
                    <p>
                      {message.state !== 'processed'
                        ? 'Process the saved message again. Existing cases will be preserved.'
                        : 'Check the Telegram conversation before retrying; the previous send may have succeeded.'}
                    </p>
                  </ActionDialog>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
