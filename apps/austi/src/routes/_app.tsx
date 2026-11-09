import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { queries } from '#/lib/queries';
import { AppShell } from '#/shell/app-shell';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const workspace = await queryClient.ensureQueryData(queries.workspace);
    if (!workspace) throw redirect({ to: '/welcome' });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
