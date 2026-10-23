import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getFunctionName } from 'convex/server';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { IntegrationSettings } from './integration-settings';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  retry: vi.fn(),
  owned: true,
  integrations: [] as unknown[],
  messages: [] as unknown[],
}));
vi.mock('./workspace', () => ({ useWorkspace: () => 'workspace' }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock('convex/react', () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(ref);
    return name === 'austi/workspaces:list'
      ? [{ id: 'workspace', owned: mocks.owned }]
      : name === 'austi/integrations:list'
        ? mocks.integrations
        : mocks.messages;
  },
  useAction: (ref: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(ref).endsWith(':connect') ? mocks.connect : mocks.disconnect,
  useMutation: () => mocks.retry,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owned = true;
  mocks.integrations = [];
  mocks.messages = [];
  mocks.connect.mockResolvedValue('integration');
});
afterEach(cleanup);

it('connects a Telegram bot with intake preferences and preserves input after a failed connection', async () => {
  mocks.connect.mockRejectedValueOnce(new Error('Telegram registration failed'));
  render(<IntegrationSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect Telegram' }));
  fireEvent.change(screen.getByLabelText('Bot token'), { target: { value: '123:secret' } });
  fireEvent.change(screen.getByLabelText('Default property address (optional)'), {
    target: { value: 'Main Street 10' },
  });
  fireEvent.change(screen.getByLabelText('Repair contact name'), { target: { value: 'Owner' } });
  fireEvent.change(screen.getByLabelText('Repair contact email'), {
    target: { value: 'owner@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect bot' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('registration failed'),
  );
  expect((screen.getByLabelText('Bot token') as HTMLInputElement).value).toBe('123:secret');
  expect((screen.getByLabelText('Bot token') as HTMLInputElement).type).toBe('password');
  expect(mocks.connect).toHaveBeenCalledWith({
    workspace: 'workspace',
    token: '123:secret',
    property: 'Main Street 10',
    owner: { name: 'Owner', email: 'owner@example.com' },
    model: 'google/gemini-2.5-flash-lite',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect bot' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('shows shared portfolio members the channel and intake errors without owner controls', () => {
  mocks.owned = false;
  mocks.integrations = [
    {
      id: 'integration',
      username: 'repair_bot',
      status: 'connected',
      property: '',
      owner: { name: 'Owner', email: 'owner@example.com' },
      model: 'google/gemini-2.5-flash-lite',
      error: null,
      lastReceivedAt: null,
    },
  ];
  mocks.messages = [
    {
      id: 'message',
      senderName: 'Resident',
      text: 'Sink leaking',
      state: 'failed',
      caseId: null,
      error: 'AI intake failed',
      replyState: null,
      time: 0,
    },
  ];
  render(<IntegrationSettings />);
  expect(screen.getByText('Telegram · @repair_bot')).toBeTruthy();
  expect(screen.getByText('AI intake failed')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry processing' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Connect Telegram' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
});
