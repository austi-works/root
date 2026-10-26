import { animate, cancelFrame, frame, motionValue, type FrameData } from 'framer-motion/dom';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (from: number, to: number, value: number) => {
  const progress = clamp((value - from) / (to - from), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec2 u_resolution;
  uniform float u_pull;
  uniform float u_time;
  uniform float u_opening;
  uniform float u_motion;
  uniform vec3 u_night;
  uniform vec3 u_dusk;
  uniform vec3 u_accent;
  uniform vec3 u_signal;

  void main() {
    vec2 p = (gl_FragCoord.xy - vec2(u_resolution.x * 0.5, 0.0)) / u_resolution.x;
    float height = u_resolution.y / u_resolution.x;
    float pull = max(u_pull, 0.0);
    float warmth = smoothstep(0.12, 0.8, pull);
    float definition = smoothstep(0.18, 0.72, pull);
    float reveal = max(height * u_opening, 1.0 / u_resolution.x);
    // Small pulls are diffuse. A deeper pull brings the curved, refracted horizon into view.
    float radius = 3.5;
    float arc = sqrt(radius * radius - p.x * p.x) - radius;
    float source = arc - reveal * 0.18;
    source += sin(p.x * 8.0 + u_time * 0.6) * reveal * 0.012 * u_motion;
    // Keep a broad diffusion radius even when only a few pixels have been pulled open.
    float spread = max(height * 0.18, reveal * 0.85);
    float distance = max(p.y - source, 0.0) / spread;
    float haze = exp(-distance * distance * 0.65);
    float glow = exp(-distance * distance * 1.7);
    float core = exp(-distance * distance * 4.5);
    vec3 sunlight = mix(u_dusk, mix(u_accent, u_signal, core * 0.8), warmth);
    vec3 atmosphere = mix(u_dusk, u_accent.gbr * 0.45, warmth);
    vec3 diffuse = u_night + sunlight * glow * mix(0.9, 1.1, warmth);
    diffuse += atmosphere * (haze - glow) * 0.5;

    float horizon = arc + reveal * (0.62 + sin(u_time * 0.75) * 0.012 * u_motion);
    float warp = sin(p.x * 9.0 + u_time * 0.85)
      * cos(p.x * 4.0 - u_time * 0.45) * reveal * 0.055 * u_motion;
    float edge = p.y - horizon + warp;
    float feather = max(height * 0.008, reveal * 0.075);
    float body = 1.0 - smoothstep(-feather, feather, edge);
    float depth = smoothstep(0.0, reveal * 0.5, -edge);
    vec3 interior = mix(u_dusk, mix(u_accent, u_signal, depth * 0.8), warmth);
    // Give blue its own outer contour; keep its inner edge joined to the coral.
    float blueFlow = sin(p.x * 6.5 - u_time * 0.5) * 0.7
      + sin(p.x * 13.0 + u_time * 0.3 + 1.8) * 0.3;
    float blueContour = arc + reveal * 0.62 + feather * (2.8 + blueFlow * 1.6 * u_motion);
    float fringeWidth = max(feather, blueContour - horizon + warp);
    float band = max(edge - feather * 0.5, 0.0) / fringeWidth;
    vec3 halo = mix(u_dusk, u_accent.gbr, warmth) * 0.75;
    vec3 outside = mix(u_night, halo, exp(-band * band));
    vec3 refracted = mix(outside, interior, body);
    vec3 color = mix(diffuse, refracted, definition);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const createRenderer = (canvas: HTMLCanvasElement, host: HTMLElement) => {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl || gl.isContextLost()) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();

  const destroy = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  };

  if (!vertex || !fragment || !program || !buffer) {
    destroy();
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    destroy();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    pull: gl.getUniformLocation(program, 'u_pull'),
    time: gl.getUniformLocation(program, 'u_time'),
    opening: gl.getUniformLocation(program, 'u_opening'),
    motion: gl.getUniformLocation(program, 'u_motion'),
  };
  const styles = getComputedStyle(host);
  for (const [uniform, token] of [
    ['u_night', '--color-night'],
    ['u_dusk', '--color-glow-dusk'],
    ['u_accent', '--color-accent'],
    ['u_signal', '--color-signal'],
  ] as const) {
    const hex = styles.getPropertyValue(token).trim().replace('#', '');
    const rgb = hex.length === 3 ? [...hex].map((channel) => channel.repeat(2)).join('') : hex;
    const color = [0, 2, 4].map((offset) => parseInt(rgb.slice(offset, offset + 2), 16) / 255);
    gl.uniform3f(gl.getUniformLocation(program, uniform), color[0]!, color[1]!, color[2]!);
  }

  let cssHeight = 1;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    cssHeight = Math.max(height, 1);
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1600 / Math.max(width, 1));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    // CSS width keeps high-DPI phones from receiving desktop-size waves.
    gl.uniform1f(uniforms.motion, 0.35 + 0.65 * smoothstep(640, 1024, width));
  };

  return {
    resize,
    destroy,
    draw: (pull: number, time: number, opening = 0) => {
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.pull, pull);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.opening, opening / cssHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
};

// Let nested scroll areas consume their own input, including the mobile menu.
const canScrollInside = (target: EventTarget | null, direction = 1) => {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body && element !== document.documentElement) {
    const styles = getComputedStyle(element);
    if (/(auto|scroll)/.test(styles.overflowY) && element.scrollHeight > element.clientHeight + 1
      && (direction < 0 ? element.scrollTop > 1
        : element.scrollTop + element.clientHeight < element.scrollHeight - 1)) return true;
    element = element.parentElement;
  }
  return false;
};

export const initFooterDistortion = (host: HTMLElement) => {
  const canvas = host.querySelector('canvas');
  const footer = host.closest<HTMLElement>('.site-footer');
  const spacer = host.closest<HTMLElement>('[data-footer-overscroll]');
  if (!canvas || !footer || !spacer || typeof IntersectionObserver !== 'function' || typeof ResizeObserver !== 'function') return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { passive: true, signal: events.signal };
  const gestureOptions = { passive: false, signal: events.signal };
  let renderer: ReturnType<typeof createRenderer> = null;
  const pull = motionValue(0);
  let visible = false;
  let touchY: number | null = null;
  let opening = 0;
  let expectedScrollY = window.scrollY;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  let painting = false;

  const maxOpening = () => Math.min(320, window.innerHeight * 0.38);
  const restingBottom = () => Math.max(0, root.scrollHeight - opening - window.innerHeight);
  const updateEdge = () => {
    // Set the boundary policy before a trackpad gesture starts, not midway through native bounce.
    root.toggleAttribute('data-footer-edge', !reducedMotion.matches);
  };

  const paint = ({ timestamp }: FrameData) => {
    renderer?.draw(opening / maxOpening(), timestamp / 1000, opening);
  };

  const draw = (distance: number) => {
    // Extend the document itself; the whole page travels into the revealed shader.
    const previousOpening = opening;
    opening = Math.tanh(Math.max(distance, 0) / maxOpening()) * maxOpening();
    const progress = opening / maxOpening();
    root.toggleAttribute('data-footer-pulling', opening > 0);
    spacer.style.setProperty('--footer-overscroll-space', `${opening}px`);
    host.style.setProperty('--footer-glow-opacity', `${smoothstep(0, 0.18, progress)}`);
    host.style.setProperty('--footer-glow-warmth', `${smoothstep(0.12, 0.8, progress) * 100}%`);
    host.style.setProperty('--footer-glow-definition', `${smoothstep(0.18, 0.72, progress)}`);
    const active = opening > 0 && visible && !document.hidden && !reducedMotion.matches;
    host.toggleAttribute('data-moving', active);
    if (active && renderer) {
      // Keep the shader's time moving even while a gesture holds the page still.
      if (!painting) frame.render(paint, true);
      painting = true;
    } else {
      cancelFrame(paint);
      painting = false;
      renderer?.draw(progress, performance.now() / 1000, opening);
    }
    if (opening > 0 || previousOpening > 0) {
      expectedScrollY = Math.max(0, root.scrollHeight - window.innerHeight);
      if (Math.abs(window.scrollY - expectedScrollY) > 0.5) {
        window.scrollTo({ top: expectedScrollY, behavior: 'instant' });
      }
    }
    updateEdge();
  };
  const unsubscribe = pull.on('change', draw);

  const pause = () => {
    clearTimeout(releaseTimer);
    pull.jump(0);
  };

  const release = () => {
    clearTimeout(releaseTimer);
    if (!visible || document.hidden || reducedMotion.matches || pull.get() === 0) return;
    animate(pull, 0, {
      type: 'spring',
      visualDuration: 0.65,
      bounce: 0,
      velocity: 0,
      restDelta: 0.05,
      restSpeed: 0.5,
    });
  };

  const setup = () => {
    pause();
    if (reducedMotion.matches) {
      renderer?.destroy();
      renderer = null;
      host.removeAttribute('data-ready');
      updateEdge();
      return;
    }
    if (!visible) return;
    renderer ??= createRenderer(canvas, host);
    if (renderer) {
      renderer.resize();
      renderer.draw(0, performance.now() / 1000);
      host.setAttribute('data-ready', '');
    }
    updateEdge();
  };

  const drag = (pixels: number, target: EventTarget | null) => {
    if (!visible || reducedMotion.matches || document.hidden || pixels === 0
      || restingBottom() - window.scrollY > 3 || canScrollInside(target, pixels)
      || (pixels < 0 && pull.get() === 0)) return false;
    clearTimeout(releaseTimer);
    // A direct drag interrupts the return; Motion owns the spring and its frame loop.
    pull.jump(clamp(pull.get() + pixels * 0.65, 0, maxOpening() * 2));
    return pull.get() > 0;
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) {
      setup();
    } else {
      pause();
      updateEdge();
    }
  });
  // The reveal has zero height at rest, so observe the stable footer instead.
  observer.observe(footer);

  window.addEventListener('wheel', (event) => {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    if (drag(event.deltaY * units, event.target)) {
      // Trackpads expose movement, not finger release; use one consistent quiet window.
      releaseTimer = setTimeout(release, 140);
      if (event.cancelable) event.preventDefault();
    }
  }, gestureOptions);

  window.addEventListener('touchstart', (event) => {
    touchY = event.touches.length === 1 ? event.touches[0]!.clientY : null;
    if (touchY !== null && opening > 0) {
      clearTimeout(releaseTimer);
      pull.stop();
    } else if (touchY === null) release();
  }, options);

  window.addEventListener('touchmove', (event) => {
    if (event.defaultPrevented || event.touches.length !== 1 || touchY === null) {
      touchY = null;
      release();
      return;
    }
    const nextY = event.touches[0]!.clientY;
    const delta = touchY - nextY;
    if (drag(delta, event.target) && event.cancelable) event.preventDefault();
    touchY = nextY;
  }, gestureOptions);

  const resetTouch = () => {
    touchY = null;
    release();
  };
  window.addEventListener('touchend', resetTouch, options);
  window.addEventListener('touchcancel', resetTouch, options);

  window.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey
      || event.shiftKey || target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === ' ' && target?.closest('button, a, summary')) return;
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) && opening > 0) pause();
    if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) {
      if (drag(event.key === 'ArrowDown' ? 55 : 140, event.target)) {
        release();
        event.preventDefault();
      }
    }
  }, { signal: events.signal });

  const resize = new ResizeObserver(() => {
    if (visible) {
      renderer?.resize();
      draw(pull.get());
    }
  });
  resize.observe(host);

  window.addEventListener('scroll', () => {
    if (visible && !document.hidden && !reducedMotion.matches) {
      const nativeExcess = window.scrollY - Math.max(0, root.scrollHeight - window.innerHeight);
      if (nativeExcess > 1) {
        // Safari can report scrollY beyond the document during its rubber-band gesture.
        // Normalize native/clamping scroll events without injecting another spring impulse.
        expectedScrollY = Math.max(0, root.scrollHeight - window.innerHeight);
        window.scrollTo({ top: expectedScrollY, behavior: 'instant' });
      } else if (opening > 0 && window.scrollY < expectedScrollY - 4) {
        // A scrollbar drag, link or new upward gesture must be free to leave the footer.
        pause();
      }
    }
    updateEdge();
  }, options);

  reducedMotion.addEventListener('change', setup, { signal: events.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  }, { signal: events.signal });
  window.addEventListener('pagehide', pause, { signal: events.signal });
  window.addEventListener('pageshow', setup, { signal: events.signal });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    pause();
    renderer?.destroy();
    renderer = null;
    host.removeAttribute('data-ready');
  }, { signal: events.signal });
  canvas.addEventListener('webglcontextrestored', setup, { signal: events.signal });

  const cleanup = () => {
    pause();
    cancelFrame(paint);
    host.removeAttribute('data-moving');
    unsubscribe();
    pull.destroy();
    events.abort();
    observer.disconnect();
    resize.disconnect();
    renderer?.destroy();
    renderer = null;
    host.removeAttribute('data-ready');
    root.removeAttribute('data-footer-edge');
  };
  document.addEventListener('astro:before-swap', cleanup, { once: true, signal: events.signal });
  return cleanup;
};
