import { createFileRoute } from '@tanstack/react-router';

import { BrandPage } from '#/features/brand/brand-page';
import { queries } from '#/lib/queries';

export const Route = createFileRoute('/_app/brand')({
  staticData: { breadcrumb: 'Brand' },
  head: () => ({ meta: [{ title: 'Brand · Austi' }] }),
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(queries.products);
  },
  component: BrandPage,
});
