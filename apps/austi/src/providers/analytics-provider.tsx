import { useRouter } from '@tanstack/react-router';
import { useWorkosAuth } from '@workspace/web-foundation';
import { useEffect, type ReactNode } from 'react';

import { capturePageview, identifyUser, resetAnalytics, startAnalytics } from '#/lib/analytics';

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useWorkosAuth();
  const userId = user?.id;

  useEffect(() => {
    startAnalytics();
    capturePageview();
    return router.subscribe('onResolved', ({ pathChanged }) => {
      if (pathChanged) capturePageview();
    });
  }, [router]);

  useEffect(() => {
    if (userId) identifyUser(userId);
    return resetAnalytics;
  }, [userId]);

  return children;
}
