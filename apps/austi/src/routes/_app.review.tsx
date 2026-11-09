import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/review')({
  staticData: { breadcrumb: 'Review' },
  component: Outlet,
});
