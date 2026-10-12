import type { ConvexQueryClient } from '@convex-dev/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouterState,
} from '@tanstack/react-router';
import { getAuth, getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start';
import {
  WorkosConvexProvider,
  fetchWorkosAuth,
  setConvexQueryClientAuthForSsr,
} from '@workspace/web-foundation';
import { ConvexProvider, type ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

import { WorkspaceProvider } from '#/features/maintenance/workspace';
import { ThemeProvider } from '#/providers/theme-provider';
import { AppShell } from '#/shell/app-shell';

import themeUrl from '#/theme-overrides.css?url';

interface Context {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<Context>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0a0a0a' },
      {
        name: 'description',
        content: 'Maintenance coordination for property managers.',
      },
      { title: 'Austi' },
    ],
    links: [
      { rel: 'icon', href: '/austi-logo.svg', type: 'image/svg+xml' },
      {
        rel: 'preload',
        href: '/fonts/ClarityCity-Regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: themeUrl },
    ],
  }),
  beforeLoad: async ({ context, location }) => {
    if (location.pathname === '/respond' || location.pathname === '/respond/')
      return { initialAuth: undefined };
    const { initialAuth, token } = await fetchWorkosAuth();
    setConvexQueryClientAuthForSsr(context.convexQueryClient, token);
    return { initialAuth };
  },
  loader: async ({ location }) => {
    if (location.pathname === '/respond' || location.pathname === '/respond/')
      return { signInUrl: '', signUpUrl: '' };
    const { user } = await getAuth();
    if (!user) throw redirect({ to: '/api/auth/sign-in' });
    const [signInUrl, signUpUrl] = await Promise.all([getSignInUrl(), getSignUpUrl()]);
    return { signInUrl, signUpUrl };
  },
  shellComponent: RootDocument,
  component: RootRoute,
});

export function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

export function RootRoute() {
  const { convexQueryClient, convexClient, initialAuth } = Route.useRouteContext();
  const { signInUrl, signUpUrl } = Route.useLoaderData();
  const publicResponse = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, '') === '/respond',
  });
  if (publicResponse)
    return (
      <ConvexProvider client={convexClient}>
        <Outlet />
      </ConvexProvider>
    );

  return (
    <WorkosConvexProvider convexQueryClient={convexQueryClient} initialAuth={initialAuth}>
      <AppShell signInUrl={signInUrl} signUpUrl={signUpUrl}>
        <WorkspaceProvider>
          <Outlet />
        </WorkspaceProvider>
      </AppShell>
    </WorkosConvexProvider>
  );
}
