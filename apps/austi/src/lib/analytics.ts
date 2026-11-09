import posthog from 'posthog-js';

type AnalyticsEvent =
  | 'workspace_created'
  | 'brand_saved'
  | 'brand_relearned'
  | 'campaign_created'
  | 'draft_approved'
  | 'draft_held'
  | 'draft_reopened'
  | 'draft_edited'
  | 'draft_revision_requested'
  | 'draft_copied';

type Properties = Record<string, string | number | boolean>;

let started = false;

export const startAnalytics = () => {
  const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
  if (started || !token) return;
  posthog.init(token, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
  });
  posthog.register({ surface: 'app' });
  started = true;
};

const whenStarted = (run: () => void) => {
  if (started) run();
};

// Only the opaque WorkOS id is sent, so PostHog holds no names or email addresses.
export const identifyUser = (userId: string) => whenStarted(() => posthog.identify(userId));
export const resetAnalytics = () => whenStarted(() => posthog.reset());
export const capturePageview = () => whenStarted(() => posthog.capture('$pageview'));
export const track = (event: AnalyticsEvent, properties?: Properties) =>
  whenStarted(() => posthog.capture(event, properties));
