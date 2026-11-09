import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportGeneration } from '#convex/marketing/analytics';

const report = { ownerId: 'user_1', kind: 'campaign', model: 'test-model', startedAt: 0 } as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const stubPostHog = (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubEnv('POSTHOG_PROJECT_TOKEN', 'token');
  vi.stubEnv('POSTHOG_HOST', 'https://posthog.test');
  vi.stubGlobal('fetch', fetchMock);
};

describe('reportGeneration', () => {
  it('sends nothing until PostHog is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', '');
    vi.stubGlobal('fetch', fetchMock);
    await reportGeneration(report);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records the failure reason so free-tier limits are visible', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    stubPostHog(fetchMock);
    await reportGeneration({ ...report, error: { code: '403' } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://posthog.test/i/v0/e/');
    expect(JSON.parse(init.body as string)).toMatchObject({
      distinct_id: 'user_1',
      event: 'generation_failed',
      properties: { kind: 'campaign', model: 'test-model', failure_reason: '403' },
    });
  });

  it('never throws when PostHog is unreachable', async () => {
    stubPostHog(vi.fn().mockRejectedValue(new Error('offline')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(reportGeneration(report)).resolves.toBeUndefined();
  });
});
