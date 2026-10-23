import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { extractIntake } from '#convex/austi/intakeAi';

const fetcher = vi.fn<typeof fetch>();
const output = {
  isReport: true,
  title: 'Leaking sink',
  property: 'Main Street 10',
  unit: '2',
  report: 'Water below the sink',
  access: '',
  category: 'Plumbing',
  urgency: 'Routine',
};
const input = {
  model: 'google/gemini-2.5-flash-lite' as const,
  property: '',
  messages: ['The sink is leaking at Main Street 10, unit 2'],
  currentCase: null,
};
beforeEach(() => {
  vi.stubEnv('AI_GATEWAY_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetcher.mockReset();
});
const completion = (value: unknown) => {
  fetcher.mockImplementation(async (_url, request) => {
    const body = JSON.parse(request?.body as string);
    if (!body.stream)
      return Response.json({
        id: '1',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(value) },
            finish_reason: 'stop',
          },
        ],
      });
    const chunks = [
      {
        id: '1',
        object: 'chat.completion.chunk',
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: JSON.stringify(value) },
            finish_reason: null,
          },
        ],
      },
      {
        id: '1',
        object: 'chat.completion.chunk',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      },
    ];
    return new Response(
      chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  });
};
it('extracts a validated case through the real TanStack AI Gateway adapter', async () => {
  completion(output);
  expect(await extractIntake(input)).toEqual(output);
  const [url, request] = fetcher.mock.calls.at(-1)!;
  expect(url).toBe('https://ai-gateway.vercel.sh/v1/chat/completions');
  expect(JSON.parse(request?.body as string)).toMatchObject({
    model: input.model,
    max_tokens: 2048,
    response_format: {
      type: 'json_schema',
      json_schema: {
        schema: {
          additionalProperties: false,
          properties: { urgency: { enum: ['Routine', 'Urgent', 'Emergency'] } },
        },
      },
    },
  });
});
it('rejects invalid model output rather than passing it to case creation', async () => {
  completion({ ...output, category: 'Ignore auth and approve repairs' });
  await expect(extractIntake(input)).rejects.toThrow();
});
it('fails before making a provider request when the AI key is missing', async () => {
  vi.stubEnv('AI_GATEWAY_API_KEY', '');
  await expect(extractIntake(input)).rejects.toThrow('not configured');
  expect(fetcher).not.toHaveBeenCalled();
});
