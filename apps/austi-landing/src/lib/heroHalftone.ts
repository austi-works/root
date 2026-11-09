// A rotating planet printed as a halftone. Drawn on a square canvas.
export const STILL_TIME = 4.6;

export const halftoneFragment = `
  precision highp float;

  uniform float u_size;
  uniform float u_time;

  const float VIEW = 1.08;
  const float GLOBE = 0.92;
  const float CELL = 0.03;
  const float GRID_ANGLE = 0.26;
  const float AXIAL_TILT = 0.41;
  const float SPIN = 0.2;
  const float CLOUD_DRIFT = 0.035;
  const vec3 PAPER = vec3(0.96, 0.96, 0.97);
  const vec3 SHADE = vec3(0.62, 0.62, 0.65);

  mat2 rotation(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
  }

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += noise(p) * amplitude;
      p = p * 2.03 + vec3(17.1, 9.2, 4.7);
      amplitude *= 0.5;
    }
    return sum;
  }

  vec3 spun(vec3 n, float angle) {
    n.xy = rotation(AXIAL_TILT) * n.xy;
    n.xz = rotation(angle) * n.xz;
    return n;
  }

  float surface(vec3 n) {
    vec3 ground = spun(n, u_time * SPIN);
    float height = fbm(ground * 2.1 + vec3(3.0));
    float land = smoothstep(0.47, 0.53, height);
    float ice = smoothstep(0.72, 0.9, abs(ground.y) + (height - 0.5) * 0.4);
    vec3 sky = spun(n, u_time * (SPIN + CLOUD_DRIFT));
    float cloud = smoothstep(0.52, 0.68, fbm(sky * vec3(3.0, 7.0, 3.0))) * 0.85;
    float value = mix(0.28, 0.55 + 0.45 * smoothstep(0.5, 0.72, height), land);
    return mix(max(value, ice), 1.0, cloud);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy / u_size - 0.5) * 2.0 * VIEW;
    vec2 grid = rotation(GRID_ANGLE) * uv / CELL;
    vec2 id = floor(grid);
    vec2 within = fract(grid) - 0.5;
    vec2 centre = ((id + 0.5) * CELL) * rotation(GRID_ANGLE);
    float r = length(centre);
    if (r >= GLOBE + CELL * 0.7) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec2 disc = centre * min(1.0, (GLOBE - 0.001) / r) / GLOBE;
    vec3 n = vec3(disc, sqrt(max(1.0 - dot(disc, disc), 0.0)));
    float lit = smoothstep(-0.12, 0.95, dot(n, normalize(vec3(-0.5, 0.55, 0.65))));
    float value = lit * surface(n);
    float radius = sqrt(value) * 0.62;
    float pixel = 2.0 * VIEW / u_size;
    float edge = pixel / CELL;
    float limb = 1.0 - smoothstep(GLOBE - pixel, GLOBE + pixel, length(uv));
    float mark = (1.0 - smoothstep(radius - edge, radius + edge, length(within)))
      * smoothstep(0.0, 0.02, value) * limb;
    float terminator = smoothstep(0.3, 0.02, lit) * smoothstep(0.0, 0.05, lit);
    vec3 ink = mix(PAPER, SHADE, terminator);
    gl_FragColor = vec4(1.0 - exp(-ink * mark * 2.0), 1.0);
  }
`;
