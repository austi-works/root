import { useMutation, useQuery } from 'convex/react';

import { api } from '#convex/_generated/api';

import { ActionDialog, Section, TextField } from './components';
import { field } from './data';
import { useWorkspace } from './workspace';

export function StaffSettings() {
  const workspace = useWorkspace();
  const workspaces = useQuery(api.austi.workspaces.list);
  const members = useQuery(api.austi.workspaces.members, workspace ? { workspace } : 'skip');
  const grant = useMutation(api.austi.workspaces.grant);
  const revoke = useMutation(api.austi.workspaces.revoke);
  const owned = workspaces?.find((w) => w.id === workspace)?.owned;
  return (
    <Section
      title='Portfolio access'
      action={
        owned && (
          <ActionDialog
            title='Grant staff access'
            trigger='Add staff member'
            confirmLabel='Grant access'
            onSubmit={(data) => grant({ email: field(data, 'email') })}
          >
            <TextField name='email' label='Staff email' type='email' />
            <p className='text-sm text-muted-foreground'>
              This person can manage all cases and contractors in your portfolio after signing in
              with this verified email. No invitation email is sent.
            </p>
          </ActionDialog>
        )
      }
    >
      <p className='text-sm text-muted-foreground'>
        Staff share case history within this portfolio. Owners, residents, and contractors use
        restricted response links.
      </p>
      <ul className='divide-y'>
        {members?.map((m) => (
          <li key={m.id} className='flex items-center justify-between gap-3 py-3 text-sm'>
            <span>{m.email}</span>
            {owned && (
              <ActionDialog
                title='Revoke staff access'
                trigger='Remove'
                confirmLabel='Remove access'
                onSubmit={() => revoke({ id: m.id })}
              >
                <p>Remove {m.email} from this portfolio?</p>
              </ActionDialog>
            )}
          </li>
        ))}
      </ul>
      {members?.length === 0 && (
        <p className='text-sm text-muted-foreground'>Only you have staff access.</p>
      )}
    </Section>
  );
}
