import { gsap } from 'gsap';

import { createFullscreenShader } from '../lib/fullscreen-shader';
import { halftoneFragment, STILL_TIME } from '../lib/heroHalftone';

const FRAME_INTERVAL = 1 / 30;
const MAX_PIXEL_RATIO = 2;
const MAX_DRAWN_SIZE = 1600;

document.querySelectorAll<HTMLCanvasElement>('[data-hero-halftone]').forEach((canvas) => {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  const shader = gl && createFullscreenShader(gl, halftoneFragment);
  if (!gl || !shader) return;

  const size = gl.getUniformLocation(shader.program, 'u_size');
  const time = gl.getUniformLocation(shader.program, 'u_time');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let running = false;
  let lastDraw = -FRAME_INTERVAL;

  const draw = (at: number) => {
    gl.uniform1f(time, at);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const tick = (at: number) => {
    if (at - lastDraw < FRAME_INTERVAL) return;
    lastDraw = at;
    draw(at);
  };
  const drawNow = () => draw(motion.matches ? STILL_TIME : gsap.ticker.time);
  const update = () => {
    const shouldRun = visible && !motion.matches && !document.hidden;
    if (motion.matches) draw(STILL_TIME);
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  const measure = () => {
    const drawn = Math.round(
      Math.min(canvas.clientWidth * Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO), MAX_DRAWN_SIZE),
    );
    canvas.width = drawn;
    canvas.height = drawn;
    gl.viewport(0, 0, drawn, drawn);
    gl.uniform1f(size, drawn);
    drawNow();
  };

  new ResizeObserver(measure).observe(canvas);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    },
    { threshold: 0.01 },
  ).observe(canvas);
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
});
