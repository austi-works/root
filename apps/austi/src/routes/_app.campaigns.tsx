import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/campaigns')({
  staticData: { breadcrumb: 'Campaigns' },
  component: Outlet,
});
