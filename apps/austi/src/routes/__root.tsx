import type { ConvexQueryClient } from '@convex-dev/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router';
import {
  WorkosConvexProvider,
  fetchWorkosAuth,
  setConvexQueryClientAuthForSsr,
} from '@workspace/web-foundation';
import type { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

import { AnalyticsProvider } from '#/providers/analytics-provider';
import { ThemeProvider } from '#/providers/theme-provider';

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
      { name: 'theme-color', content: '#000000' },
      {
        name: 'description',
        content: 'Plan and review your marketing across ads, social, email and search.',
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
    const { initialAuth, token } = await fetchWorkosAuth();
    if (!initialAuth.user) {
      const returnPathname = encodeURIComponent(location.href);
      throw redirect({
        href: `/api/auth/sign-in?returnPathname=${returnPathname}`,
        reloadDocument: true,
      });
    }
    setConvexQueryClientAuthForSsr(context.convexQueryClient, token);
    return { initialAuth };
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
  const { convexQueryClient, initialAuth } = Route.useRouteContext();

  return (
    <WorkosConvexProvider convexQueryClient={convexQueryClient} initialAuth={initialAuth}>
      <AnalyticsProvider>
        <Outlet />
      </AnalyticsProvider>
    </WorkosConvexProvider>
  );
}
