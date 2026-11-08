import { gsap } from 'gsap';

import { heroSceneConfig as content } from '../lib/heroScene.config';

type Point = { x: number; y: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const opacity = (element: HTMLElement | SVGElement, value: number) => {
  const next = value.toFixed(3);
  if (element.style.opacity !== next) element.style.opacity = next;
};

document.querySelectorAll<HTMLElement>('[data-product-scene]').forEach((scene) => {
  const viewport = scene.querySelector<HTMLElement>('.product-viewport')!;
  const canvas = scene.querySelector<HTMLElement>('.product-canvas')!;
  const urlCard = scene.querySelector<HTMLElement>('[data-scene-url-card]')!;
  const url = scene.querySelector<HTMLElement>('[data-scene-url]')!;
  const core = scene.querySelector<HTMLElement>('[data-scene-core]')!;
  const status = scene.querySelector<HTMLElement>('[data-scene-status]')!;
  const caret = scene.querySelector<HTMLElement>('[data-scene-caret]')!;
  const flash = scene.querySelector<HTMLElement>('[data-scene-flash]')!;
  const glow = scene.querySelector<HTMLElement>('[data-scene-glow]')!;
  const halo = scene.querySelector<HTMLElement>('[data-scene-core-halo]')!;
  const ring = scene.querySelector<HTMLElement>('[data-scene-core-ring]')!;
  const svg = scene.querySelector<SVGSVGElement>('[data-scene-connectors]')!;
  const paths = [
    scene.querySelector<SVGPathElement>('[data-scene-input-path]')!,
    ...scene.querySelectorAll<SVGPathElement>('[data-scene-output-path]'),
  ];
  const particles = [...scene.querySelectorAll<SVGGElement>('[data-scene-particle]')];
  const cursor = scene.querySelector<SVGSVGElement>('[data-scene-cursor]')!;
  const click = scene.querySelector<SVGCircleElement>('[data-scene-click]')!;
  const toggle = scene.querySelector<HTMLButtonElement>('[data-scene-toggle]')!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rows = [...scene.querySelectorAll<HTMLElement>('[data-scene-card]')].map((card) => ({
    card,
    body: card.querySelector<HTMLElement>('[data-scene-content]')!,
    skeleton: card.querySelector<HTMLElement>('[data-scene-skeleton]')!,
    shimmer: card.querySelector<HTMLElement>('[data-scene-shimmer]')!,
    target: card.querySelector<HTMLElement>('[data-scene-target]')!,
    button: card.querySelector<HTMLButtonElement>('[data-scene-approve]')!,
    pending: card.querySelector<HTMLElement>('[data-scene-pending]')!,
    approved: card.querySelector<HTMLElement>('[data-scene-approved]')!,
    check: card.querySelector<SVGSVGElement>('[data-scene-check]')!,
    shift: 0,
  }));
  const clock = { time: 0 };
  let timeline: gsap.core.Timeline | undefined;
  let targets: (Point | null)[] = [];
  let origin: Point = { x: 0, y: 0 };
  let ready = false;
  let visible = false;
  let paused = false;
  let firstFrame = 0;
  let secondFrame = 0;

  const positionCaret = () => {
    caret.style.transform = `translate(${url.offsetWidth}px, -50%)`;
  };

  const measure = () => {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    positionCaret();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const input = urlCard.getBoundingClientRect();
    const node = core.getBoundingClientRect();
    origin = { x: node.left - box.left + node.width / 2, y: node.top - box.top + node.height / 2 };
    const source = { x: input.left - box.left + input.width / 2, y: input.bottom - box.top };
    const coreTop = node.top - box.top;
    const middle = (source.y + coreTop) / 2;
    paths[0]!.setAttribute(
      'd',
      `M${source.x} ${source.y}C${source.x} ${middle} ${origin.x} ${middle} ${origin.x} ${coreTop}`,
    );
    targets = rows.map((row, index) => {
      if (getComputedStyle(row.card).display === 'none') return null;
      const card = row.card.getBoundingClientRect();
      const button = row.target.getBoundingClientRect();
      const start = {
        x: node.right - box.left,
        y: origin.y + (index - 1.5) * Math.min(node.height * 0.12, 4),
      };
      const end = { x: card.left - box.left - row.shift, y: card.top - box.top + card.height / 2 };
      const reach = Math.max((end.x - start.x) * 0.55, 12);
      paths[index + 1]!.setAttribute(
        'd',
        `M${start.x} ${start.y}C${start.x + reach} ${start.y} ${end.x - reach} ${end.y} ${end.x} ${end.y}`,
      );
      return {
        x: button.left - box.left - row.shift + button.width * 0.65,
        y: button.top - box.top + button.height * 0.55,
      };
    });
  };

  const render = (time: number, final = false) => {
    const fade = 1 - smooth(time - 9);
    const typed = content.url.slice(0, Math.floor(clamp(time / 1.6) * content.url.length));
    if (url.textContent !== typed) {
      url.textContent = typed;
      positionCaret();
    }
    opacity(caret, !final && time < 1.6 && Math.floor(time / 0.28) % 2 === 0 ? 1 : 0);
    opacity(flash, time >= 1.6 && time < 2.1 ? Math.sin(((time - 1.6) / 0.5) * Math.PI) * 0.7 : 0);
    const ambient = final ? 0 : Math.sin((time / 10) * Math.PI * 2);
    glow.style.transform = `translate(${ambient * 5}px, ${ambient * -3}px) scale(${1 + ambient * 0.025})`;
    const pulse = final ? 0 : Math.max(0, 1 - Math.abs(time - 2.4) / 0.5);
    opacity(halo, 0.35 + pulse * 0.35 + ambient * 0.06);
    ring.style.transform = `scale(${1 + pulse * 0.14 + ambient * 0.04})`;
    opacity(ring, 0.3 + pulse * 0.3);

    const phases = [
      { start: 0, end: 1.6, text: content.status.waiting },
      { start: 1.6, end: 1.9, text: content.status.reading },
      { start: 1.9, end: 2.2, text: content.status.learning },
      { start: 2.2, end: 4.2, text: content.status.drafting },
      { start: 4.2, end: 7.6, text: content.status.ready },
      { start: 7.6, end: 10.2, text: content.status.scheduled },
    ];
    const phase = phases.find((item) => time >= item.start && time < item.end) ?? phases[0]!;
    if (status.textContent !== phase.text) status.textContent = phase.text;
    opacity(
      status,
      final || phase.start === 0
        ? 1
        : Math.min(smooth((time - phase.start) / 0.1), smooth((phase.end - time) / 0.1)),
    );

    rows.forEach((row, index) => {
      const arrival = 2.4 + index * 0.25;
      const reveal = smooth((time - arrival) / 0.35);
      const resolved = smooth((time - arrival - 0.25) / 0.3);
      const approved = smooth((time - (4.6 + index * 0.8)) / 0.2);
      const press = Math.max(0, 1 - Math.abs(time - (4.6 + index * 0.8)) / 0.12);
      row.shift = (1 - reveal) * 14;
      opacity(row.card, reveal * fade);
      row.card.style.transform = `translateX(${row.shift}px)`;
      opacity(row.body, resolved);
      opacity(row.skeleton, (1 - resolved) * reveal);
      row.shimmer.style.transform = `translateX(${(((time - arrival) / 0.7) % 1) * 200 - 100}%)`;
      row.button.style.transform = `scale(${1 - press * 0.06})`;
      const state = String(approved > 0.5);
      if (row.button.dataset.approved !== state) row.button.dataset.approved = state;
      opacity(row.pending, 1 - approved);
      opacity(row.approved, approved);
      row.check.style.transform = `scale(${0.65 + approved * 0.35})`;
    });

    particles.forEach((particle, index) => {
      const start = index === 0 ? 1.6 : 2.4 + (index - 1) * 0.25;
      const duration = index === 0 ? 0.8 : 0.7;
      const progress = clamp((time - start) / duration);
      const active = !final && time > start && time < start + duration;
      opacity(particle, active ? Math.min(progress * 8, (1 - progress) * 8, 1) : 0);
      if (active) {
        const path = paths[index]!;
        const point = path.getPointAtLength(path.getTotalLength() * progress);
        particle.setAttribute('transform', `translate(${point.x} ${point.y})`);
      }
    });

    const visibleTargets = targets.flatMap((point, index) =>
      point ? [{ point, time: 4.6 + index * 0.8 }] : [],
    );
    const last = visibleTargets.at(-1);
    const cursorVisible = !final && time >= 4.2 && last && time < last.time + 0.45;
    opacity(
      cursor,
      cursorVisible
        ? Math.min(smooth((time - 4.2) / 0.15), smooth((last.time + 0.45 - time) / 0.15))
        : 0,
    );
    if (cursorVisible) {
      let from = origin;
      let destination = visibleTargets[0]!;
      for (const target of visibleTargets) {
        destination = target;
        if (time <= target.time + 0.15) break;
        from = target.point;
      }
      const progress = smooth((time - destination.time + 0.4) / 0.35);
      const x = from.x + (destination.point.x - from.x) * progress;
      const y = from.y + (destination.point.y - from.y) * progress;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      const pressed = Math.max(0, 1 - Math.abs(time - destination.time) / 0.14);
      opacity(click, pressed * 0.8);
    }
  };

  const update = () => {
    const playing = ready && visible && !paused && !motion.matches && !document.hidden;
    scene.dataset.playing = String(playing);
    if (motion.matches) {
      timeline?.pause();
      render(8.2, true);
    } else if (playing) timeline?.play();
    else timeline?.pause();
    toggle.hidden = !ready || motion.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('span')!.textContent = paused ? content.play : content.pause;
    toggle.querySelector('path')!.setAttribute('d', paused ? 'm6 4 6 4-6 4Z' : 'M6 4v8M10 4v8');
  };
  const togglePaused = () => {
    paused = !paused;
    update();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    },
    { threshold: 0.01 },
  );
  const resize = new ResizeObserver(() => {
    measure();
    if (motion.matches) render(8.2, true);
  });
  observer.observe(scene.closest('.hero') ?? scene);
  resize.observe(viewport);
  toggle.addEventListener('click', togglePaused);
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);

  // Keep the complete SSR frame for first paint. One GSAP clock owns all scene motion.
  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      measure();
      timeline = gsap.timeline({ paused: true, repeat: -1 }).to(clock, {
        time: 10,
        duration: 10,
        ease: 'none',
        onUpdate: () => render(clock.time),
      });
      ready = true;
      update();
    });
  });
  document.addEventListener(
    'astro:before-swap',
    () => {
      timeline?.kill();
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      toggle.removeEventListener('click', togglePaused);
      motion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    },
    { once: true },
  );
});
