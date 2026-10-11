import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector3,
  type Camera,
  type CubeTexture,
  type WebGLCubeRenderTarget,
  type WebGLRenderer,
} from 'three';
import { Rng } from '../../core/rng';
import { bakeCube } from '../bake';
import { markShared } from '../dispose';
import { OUTPUT_GLSL } from '../materials';

export interface SkyStyle {
  /** Cache key and random seed. */
  key: string;
  /** Nebula colors (two or three), linear-ish hex strings. */
  nebula: string[];
  /** 0..1 how much nebula shows. */
  nebulaAmount: number;
  /** Deep background color. */
  base: string;
  /** Faint band of our galaxy across the sky. */
  milkyWay: boolean;
  /** Direction toward the Sun (world space) and its look. Null = no Sun in this sky. */
  sun: { dir: Vector3; color: string; size: number } | null;
  /** A second, smaller sun (Zephyra's companion star). */
  sun2?: { dir: Vector3; color: string; size: number } | null;
}

export const SKIES: Record<string, SkyStyle> = {
  title: { key: 'title', nebula: ['#6a3dff', '#ff4fa8', '#2a7bff'], nebulaAmount: 0.9, base: '#05031a', milkyWay: true, sun: { dir: new Vector3(0.75, 0.32, -0.58), color: '#fff1c9', size: 1 } },
  menu: { key: 'menu', nebula: ['#5b3dff', '#ff6ad0', '#2fa8ff'], nebulaAmount: 0.8, base: '#05031a', milkyWay: true, sun: null },
  space: { key: 'space', nebula: ['#4b35c9', '#c2459c', '#1f5fd1'], nebulaAmount: 0.6, base: '#030212', milkyWay: true, sun: { dir: new Vector3(-1, 0.18, 0.1), color: '#fff3d6', size: 1 } },
  zephyra: { key: 'zephyra', nebula: ['#2fe0c4', '#b04dff', '#ff8fd0'], nebulaAmount: 1.0, base: '#05041a', milkyWay: false, sun: { dir: new Vector3(-0.8, 0.3, 0.2), color: '#ffb36b', size: 1.15 }, sun2: { dir: new Vector3(-0.55, 0.52, -0.45), color: '#ffd6f2', size: 0.55 } },
};

const SKY_SHADER = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uNeb0, uNeb1, uNeb2;
uniform float uAmount;
uniform float uSeed;
uniform float uMilky;
vec4 bake(vec3 d) {
  vec3 p = d * 1.35 + vec3(uSeed * 3.1, uSeed * 1.7, -uSeed * 2.3);
  // Domain-warped clouds that only show in patches, so most of the sky stays deep and dark.
  vec3 q = vec3(fbm(p), fbm(p + 5.2), fbm(p - 3.7));
  float warp = fbm(p * 1.4 + q * 1.3);
  float mask = smoothstep(0.08, 0.6, fbm(p * 0.55 - 2.0) * 0.8 + 0.25);
  float cloud = smoothstep(0.0, 0.85, warp) * mask * uAmount;
  float fil = pow(1.0 - abs(fbm(p * 2.2 + q * 1.6)), 9.0) * mask * cloud * uAmount;
  vec3 neb = mix(uNeb0, uNeb1, smoothstep(-0.35, 0.45, q.x));
  neb = mix(neb, uNeb2, smoothstep(0.0, 0.6, q.y));
  vec3 c = uBase;
  c += neb * (cloud * cloud) * 0.5 + neb * fil * 0.4;
  // Dark dust lanes cut through the brightest parts.
  c *= 1.0 - 0.6 * smoothstep(0.15, 0.6, fbm(p * 3.3 - 4.0)) * cloud;
  // Milky Way: a soft band around a tilted great circle, with grainy star clouds.
  vec3 axis = normalize(vec3(0.25, 0.92, 0.3));
  float band = exp(-pow(dot(d, axis) / 0.18, 2.0));
  float grain = smoothstep(-0.1, 0.8, fbm(d * 10.0)) * 0.7 + 0.3;
  c += vec3(0.62, 0.62, 0.85) * band * grain * 0.10 * uMilky;
  c += vec3(1.0, 0.85, 0.68) * pow(band, 4.0) * grain * 0.07 * uMilky;
  return vec4(c, 1.0);
}`;

interface SkyBake {
  rt: WebGLCubeRenderTarget;
  size: number;
}

const bakes = new Map<string, SkyBake>();

function hexVec(hex: string): Vector3 {
  const c = new Color(hex);
  return new Vector3(c.r, c.g, c.b);
}

/** Nebula + Milky Way baked once per sky style and size; shared across scenes. */
export function skyCube(renderer: WebGLRenderer, style: SkyStyle, size: number, octaves: number): CubeTexture {
  const key = `${style.key}:${size}`;
  let b = bakes.get(key);
  if (!b) {
    // Keep the cache tiny: drop older bakes of other styles.
    if (bakes.size >= 3) {
      const first = bakes.keys().next().value as string;
      bakes.get(first)?.rt.dispose();
      bakes.delete(first);
    }
    const rt = bakeCube(renderer, {
      size,
      shader: SKY_SHADER,
      hdr: true,
      defines: { OCTAVES: Math.max(3, octaves) },
      uniforms: {
        uBase: { value: hexVec(style.base) },
        uNeb0: { value: hexVec(style.nebula[0]) },
        uNeb1: { value: hexVec(style.nebula[1] ?? style.nebula[0]) },
        uNeb2: { value: hexVec(style.nebula[2] ?? style.nebula[0]) },
        uAmount: { value: style.nebulaAmount },
        uSeed: { value: (new Rng(style.key).next() * 10) | 0 },
        uMilky: { value: style.milkyWay ? 1 : 0 },
      },
    });
    markShared(rt.texture);
    b = { rt, size };
    bakes.set(key, b);
  }
  return b.rt.texture;
}

/** Forget bakes (the GPU context was lost and restored). */
export function clearSkyBakes(): void {
  for (const b of bakes.values()) b.rt.dispose();
  bakes.clear();
}

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
varying vec3 vColor;
varying float vBright;
void main() {
  // Stars live at infinity: rotate with the camera but never move.
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
  float tw = 0.78 + 0.22 * sin(uTime * (1.3 + aPhase * 2.1) + aPhase * 40.0);
  vBright = tw;
  vColor = aColor;
  gl_PointSize = max(1.0, aSize * uPixelRatio * uScale);
}`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vBright;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float core = exp(-r2 * 6.0);
  float halo = exp(-r2 * 1.6) * 0.35;
  float a = (core + halo) * vBright;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
  ${OUTPUT_GLSL}
}`;

const SUN_VERT = /* glsl */ `
uniform vec3 uDir;
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  // A camera-facing quad pinned to a direction at infinity.
  vec3 d = normalize(mat3(viewMatrix) * uDir);
  vec4 c = projectionMatrix * vec4(d * 100.0, 1.0);
  vec2 off = position.xy * uSize * vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * 0.2;
  gl_Position = vec4(c.xy + off * c.w, c.w * 0.99999, c.w);
}`;

const SUN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float disc = smoothstep(0.2, 0.17, r);
  float glow = exp(-r * 5.0) * 1.6 + exp(-r * 2.2) * 0.35;
  float a = atan(p.y, p.x);
  float rays = pow(max(0.0, sin(a * 6.0 + uTime * 0.15)), 18.0) * exp(-r * 3.5) * 0.35;
  vec3 col = uColor * (disc * 7.0 + glow * 1.6 + rays);
  float alpha = clamp(disc + glow + rays, 0.0, 1.0);
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(col * alpha, 1.0);
  ${OUTPUT_GLSL}
}`;

/**
 * The deep-space backdrop: a baked nebula/Milky Way cube as the scene background,
 * twinkling stars at infinity, and an HDR Sun (or Zephyra's two suns) that blooms.
 */
export class SpaceSky {
  readonly group = new Group();
  readonly background: CubeTexture;
  private starMat: ShaderMaterial;
  private sunMats: ShaderMaterial[] = [];

  constructor(renderer: WebGLRenderer, style: SkyStyle, opts: { skySize: number; octaves: number; stars: number; pixelRatio: number }) {
    this.background = skyCube(renderer, style, opts.skySize, opts.octaves);
    const rng = new Rng(`stars:${style.key}`);
    const n = opts.stars;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const tints = [new Color('#ffffff'), new Color('#cfe0ff'), new Color('#a9c8ff'), new Color('#fff1d6'), new Color('#ffd9a8'), new Color('#ffc2b8')];
    const axis = new Vector3(0.25, 0.92, 0.3).normalize();
    const v = new Vector3();
    for (let i = 0; i < n; i++) {
      // Uniform on the sphere, with extra stars near the Milky Way band.
      for (;;) {
        const z = rng.range(-1, 1);
        const t = rng.range(0, Math.PI * 2);
        const r = Math.sqrt(1 - z * z);
        v.set(r * Math.cos(t), z, r * Math.sin(t));
        if (!style.milkyWay) break;
        const band = Math.exp(-Math.pow(v.dot(axis) / 0.25, 2));
        if (rng.next() < 0.45 + band * 0.55) break;
      }
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      const u = rng.next();
      size[i] = u < 0.86 ? 1.2 + rng.next() * 1.3 : u < 0.98 ? 2.6 + rng.next() * 1.8 : 4.5 + rng.next() * 2.5;
      phase[i] = rng.next();
      const c = tints[Math.floor(rng.next() * tints.length)];
      const b = (size[i] > 4 ? 2.4 : size[i] > 2.5 ? 1.4 : 0.85) * (0.6 + rng.next() * 0.5);
      col[i * 3] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new BufferAttribute(phase, 1));
    geo.setAttribute('aColor', new BufferAttribute(col, 3));
    this.starMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: opts.pixelRatio }, uScale: { value: 1 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const stars = new Points(geo, this.starMat);
    stars.frustumCulled = false;
    stars.renderOrder = -10;
    this.group.add(stars);
    const addSun = (s: { dir: Vector3; color: string; size: number }) => {
      const mat = new ShaderMaterial({
        uniforms: { uDir: { value: s.dir.clone().normalize() }, uSize: { value: s.size }, uColor: { value: new Color(s.color) }, uTime: { value: 0 } },
        vertexShader: SUN_VERT,
        fragmentShader: SUN_FRAG,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      const quad = new Mesh(new PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      quad.renderOrder = -9;
      this.group.add(quad);
      this.sunMats.push(mat);
    };
    if (style.sun) addSun(style.sun);
    if (style.sun2) addSun(style.sun2);
  }

  setPixelRatio(pr: number): void {
    this.starMat.uniforms.uPixelRatio.value = pr;
  }

  update(time: number, _camera?: Camera): void {
    this.starMat.uniforms.uTime.value = time;
    for (const m of this.sunMats) m.uniforms.uTime.value = time;
  }
}
