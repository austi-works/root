import { useEffect, useRef, useState } from 'react';

import { fetchHeroMetric, type HeroMetricFetcher } from '../lib/hero-metric';

import './LiveCounter.css';

interface Props {
  endpoint?: string;
  fetchValue?: HeroMetricFetcher;
  label: string;
}

const numberFormat = new Intl.NumberFormat('en-US');

export function LiveCounter({ endpoint, fetchValue, label }: Props) {
  const [value, setValue] = useState<number | null>(null);
  const displayed = useRef<number | null>(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let frame = 0;
    let poll = 0;
    let target: number | null = null;
    let request: AbortController | undefined;

    const showValue = (next: number | null) => {
      displayed.current = next;
      setValue(next);
    };

    const settleMotion = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        showValue(target);
      }
    };

    const animate = (next: number) => {
      cancelAnimationFrame(frame);
      target = next;
      if (motion.matches) return showValue(next);

      const from = displayed.current ?? Math.floor(next * 0.97);
      const start = performance.now();
      const tick = (now: number) => {
        if (disposed) return;
        const progress = Math.min((now - start) / 1500, 1);
        showValue(Math.round(from + (next - from) * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      showValue(from);
      frame = requestAnimationFrame(tick);
    };

    const refresh = async () => {
      request = new AbortController();
      // Bound stalled requests so the next poll can recover.
      const timeout = window.setTimeout(() => request?.abort(), 10_000);
      try {
        const next = await (fetchValue
          ? fetchValue(request.signal)
          : fetchHeroMetric(endpoint, request.signal));
        if (disposed) return;
        if (typeof next !== 'number' || !Number.isSafeInteger(next) || next < 0) {
          cancelAnimationFrame(frame);
          target = null;
          showValue(null);
        } else {
          animate(next);
        }
      } catch {
        if (!disposed) {
          cancelAnimationFrame(frame);
          target = null;
          showValue(null);
        }
      } finally {
        window.clearTimeout(timeout);
        if (!disposed) poll = window.setTimeout(refresh, 45_000);
      }
    };

    motion.addEventListener('change', settleMotion);
    void refresh();
    return () => {
      disposed = true;
      request?.abort();
      cancelAnimationFrame(frame);
      window.clearTimeout(poll);
      motion.removeEventListener('change', settleMotion);
    };
  }, [endpoint, fetchValue]);

  if (value === null) return null;

  return (
    <div className='live-counter'>
      <span className='live-counter-value'>{numberFormat.format(value)}</span>
      <span className='live-counter-label'>{label}</span>
    </div>
  );
}
