import { createFileRoute, redirect } from '@tanstack/react-router';

import { Welcome } from '#/features/onboarding/welcome';
import { queries } from '#/lib/queries';

export const Route = createFileRoute('/welcome')({
  head: () => ({ meta: [{ title: 'Welcome · Austi' }] }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const workspace = await queryClient.ensureQueryData(queries.workspace);
    if (workspace) throw redirect({ to: '/' });
  },
  component: Welcome,
});
