import type { GenerationKind } from '#convex/marketing/validators';

const CAPTURE_TIMEOUT_MS = 3000;

interface GenerationReport {
  ownerId: string;
  kind: GenerationKind;
  model: string;
  startedAt: number;
  error?: unknown;
}

const failureReason = (error: unknown) => {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : 'unknown';
};

/** Tells us how generation behaves on the free tier. Analytics must never fail a generation. */
export const reportGeneration = async ({
  ownerId,
  kind,
  model,
  startedAt,
  error,
}: GenerationReport) => {
  const token = process.env.POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_HOST;
  if (!token || !host) return;

  try {
    const response = await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
      body: JSON.stringify({
        api_key: token,
        distinct_id: ownerId,
        event: error ? 'generation_failed' : 'generation_completed',
        properties: {
          surface: 'backend',
          kind,
          model,
          duration_ms: Date.now() - startedAt,
          ...(error ? { failure_reason: failureReason(error) } : {}),
        },
      }),
    });
    if (!response.ok) console.warn('PostHog rejected a generation event', response.status);
  } catch (cause) {
    console.warn('Could not send a generation event to PostHog', cause);
  }
};
