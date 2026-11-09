export type HeroMetricFetcher = (signal: AbortSignal) => Promise<number | null>;

export const fetchHeroMetric = async (
  endpoint: string | undefined,
  signal: AbortSignal,
): Promise<number | null> => {
  // TODO: Wire PUBLIC_HERO_METRIC_ENDPOINT to a real beta metric service returning
  // { "value": <non-negative integer> }. This static site has no live metric yet.
  // An absent endpoint deliberately returns no value rather than mock activity.
  if (!endpoint) return null;

  const response = await fetch(endpoint, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Metric unavailable');

  const data: unknown = await response.json();
  const value = typeof data === 'object' && data !== null && 'value' in data ? data.value : null;

  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
};
