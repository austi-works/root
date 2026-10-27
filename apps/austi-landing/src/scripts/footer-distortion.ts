import { animate, cancelFrame, frame, resize, scroll, type AnimationPlaybackControls } from 'motion';

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

export const initFooterDistortion = (host: HTMLElement) => {
  const spacer = host.closest<HTMLElement>('[data-footer-overscroll]')!;
  const renderer = createRenderer(host.querySelector('canvas')!, host);
  const events = new AbortController();
  let opening = 0;
  let pull = 0;
  let restingY = 0;
  let returning: AnimationPlaybackControls | undefined;

  const paint = () => renderer?.draw(pull, performance.now() / 1000, opening);
  const stopReturn = () => {
    // Motion samples once on stop; release ownership before that final sample.
    const animation = returning;
    returning = undefined;
    animation?.stop();
  };
  const stopScroll = scroll((progress, info) => {
    pull = progress;
    restingY = info.y.offset[0]!;
    opening = progress * (info.y.offset[1]! - restingY);
    host.style.setProperty('--footer-overscroll-space', `${opening}px`);
    host.style.setProperty('--footer-glow-opacity', `${smoothstep(0, 0.18, progress)}`);
    if (opening > 0) frame.render(paint, true);
    else cancelFrame(paint);
  }, { target: spacer, offset: ['start end', 'end end'] });

  // Native scrollend waits for finger release and momentum, without a release timer.
  document.addEventListener('scrollend', () => {
    if (returning || window.scrollY <= Math.ceil(restingY)) return;
    returning = animate(window.scrollY, restingY, {
      type: 'spring', visualDuration: 0.55, bounce: 0, restDelta: 1,
      onUpdate: (top) => {
        if (returning) window.scrollTo({ top, behavior: 'instant' });
      },
      onComplete: () => { returning = undefined; },
    });
  }, { signal: events.signal });
  for (const event of ['wheel', 'pointerdown', 'keydown']) {
    window.addEventListener(event, stopReturn, { passive: true, signal: events.signal });
  }
  const stopResize = resize(host, () => renderer?.resize());
  const cleanup = () => {
    events.abort();
    stopReturn();
    stopScroll();
    stopResize();
    cancelFrame(paint);
    renderer?.destroy();
  };
  document.addEventListener('astro:before-swap', cleanup, { once: true, signal: events.signal });
  return cleanup;
};
