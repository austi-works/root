import { createFileRoute } from '@tanstack/react-router';

import { WorkspaceHome } from '#/features/workspace/workspace-home';
import { queries } from '#/lib/queries';

export const Route = createFileRoute('/_app/')({
  staticData: { breadcrumb: 'Workspace' },
  head: () => ({ meta: [{ title: 'Workspace · Austi' }] }),
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(queries.overview);
  },
  component: WorkspaceHome,
});
