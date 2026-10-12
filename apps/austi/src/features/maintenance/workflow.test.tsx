import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionDialog } from './components';
import { ResponsePage } from './response-page';

const mocks = vi.hoisted(() => ({ read: vi.fn(), respond: vi.fn(), upload: vi.fn() }));
vi.mock('convex/react', () => ({
  useAction: (ref: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(ref);
    return name.endsWith(':read')
      ? mocks.read
      : name.endsWith(':respond')
        ? mocks.respond
        : mocks.upload;
  },
}));
const request = {
  title: 'Kitchen sink',
  property: 'Main Street',
  unit: '2',
  report: 'Leak',
  access: '',
  presenceRequired: true,
  kind: 'approval',
  role: 'owner',
  body: 'Replace trap',
  amount: 28000,
  appointmentAt: null,
  appointmentEnd: null,
  confirmed: false,
  updates: [],
  files: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = 'a'.repeat(64);
  mocks.read.mockResolvedValue(request);
  mocks.respond.mockResolvedValue(null);
});
afterEach(cleanup);

describe('maintenance form submission', () => {
  it('keeps form input and reports errors when saving fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Please choose a contractor'));
    render(
      <ActionDialog
        title='Create request'
        trigger='Open request'
        confirmLabel='Save request'
        onSubmit={save}
      >
        <label>
          Details
          <input name='details' />
        </label>
      </ActionDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open request' }));
    fireEvent.change(screen.getByLabelText('Details'), { target: { value: 'Repair the sink' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Please choose a contractor'),
    );
    expect((screen.getByLabelText('Details') as HTMLInputElement).value).toBe('Repair the sink');
    expect(save.mock.calls[0][0].get('details')).toBe('Repair the sink');
  });
  it('disables submission while a mutation is in progress', async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <ActionDialog title='Request' trigger='Open' confirmLabel='Save' onSubmit={save}>
        <input name='details' aria-label='Details' />
      </ActionDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
describe('external maintenance responses', () => {
  it('requires an explanation for a declined approval', async () => {
    render(<ResponsePage />);
    await screen.findByRole('heading', { name: 'Kitchen sink' });
    fireEvent.change(screen.getByLabelText('Your response'), { target: { value: 'decline' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mocks.respond).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Explanation or additional information'), {
      target: { value: 'Please obtain another quote' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }));
    await screen.findByRole('heading', { name: 'Response recorded' });
    expect(mocks.respond).toHaveBeenCalledWith({
      token: 'a'.repeat(64),
      response: {
        choice: 'decline',
        body: 'Please obtain another quote',
        attachments: [],
        outcome: undefined,
      },
    });
  });
  it('collects an actual work outcome from the contractor', async () => {
    mocks.read.mockResolvedValue({
      ...request,
      kind: 'work',
      role: 'contractor',
      amount: null,
      access: 'Ring unit 2',
    });
    render(<ResponsePage />);
    await screen.findByLabelText('Work outcome');
    fireEvent.change(screen.getByLabelText('Work outcome'), {
      target: { value: 'Parts required' },
    });
    fireEvent.change(screen.getByLabelText('Explanation or additional information'), {
      target: { value: 'Replacement trap ordered' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }));
    await screen.findByRole('heading', { name: 'Response recorded' });
    expect(mocks.respond.mock.calls[0][0].response).toMatchObject({
      choice: 'submit',
      outcome: 'Parts required',
      body: 'Replacement trap ordered',
    });
  });
  it('shows a useful expired-link error without rendering an action form', async () => {
    mocks.read.mockRejectedValue(new Error('This link has expired.'));
    render(<ResponsePage />);
    expect((await screen.findByRole('alert')).textContent).toContain('expired');
    expect(screen.queryByRole('button', { name: 'Submit response' })).toBeNull();
  });
});
