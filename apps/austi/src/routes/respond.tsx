import { createFileRoute } from '@tanstack/react-router';

import { ResponsePage } from '#/features/maintenance/response-page';

export const Route = createFileRoute('/respond')({
  head: () => ({
    meta: [
      { title: 'Maintenance response · Austi' },
      { name: 'robots', content: 'noindex,nofollow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  component: ResponsePage,
});
