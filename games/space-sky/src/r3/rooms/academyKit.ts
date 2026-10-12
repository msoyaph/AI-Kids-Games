import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector4,
  type Box3,
  type BufferGeometry,
  type CanvasTexture,
  type Group,
  type Material,
} from 'three';
import { markShared } from '../dispose';
import { OUTPUT_GLSL } from '../materials';
import { Kit, M, hot } from '../surface/propKit';

/**
 * The Academy's building kit: one big Kit that merges every static part of the building, its rooms
 * and the hill per material. On top of the shared prop materials it adds
 * - ROOM: a lit vertex-colored material with procedural surface patterns (planks, tiles, wallpaper,
 *   panels, hazard stripes, grass, paving...) picked per part through its uv (x = pattern, y = warm
 *   self-light), so walls and floors get detail without textures or extra draw calls;
 * - BLINK: unlit vertex colors that blink or pulse per part (uv x = phase, y = rate; negative = pulse);
 * - atlas decals (posters, screens, the sign...) cut from one canvas texture.
 */

export const P = {
  none: 0,
  planks: 1,
  tiles: 2,
  stripes: 3,
  panels: 4,
  hazard: 5,
  grass: 6,
  paving: 7,
  carpet: 8,
  siding: 9,
  ribs: 10,
  concrete: 11,
  bricks: 12,
  dots: 13,
  stars: 14,
} as const;
export type Pattern = (typeof P)[keyof typeof P];

const ROOM_PARS = /* glsl */ `
varying vec3 vOP;
varying vec3 vON;
varying vec2 vPat;
`;

const ROOM_FRAG_PARS = /* glsl */ `
varying vec3 vOP;
varying vec3 vON;
varying vec2 vPat;
uniform vec3 uWarm;
float aHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), f.x), mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// 1 on a seam line every 'period' (antialiased), width w (in units).
float aSeam(float x, float period, float w) {
  float d = abs(fract(x / period + 0.5) - 0.5) * period;
  float fw = max(fwidth(x), 1e-4);
  return 1.0 - smoothstep(w, w + fw * 1.5, d);
}
vec3 aPattern(float id, vec3 base, vec3 p, vec3 n) {
  vec3 an = abs(n);
  vec2 q = an.y > 0.55 ? p.xz : (an.x > 0.55 ? p.zy : p.xy);
  float fade = clamp(1.6 - length(fwidth(q)) * 9.0, 0.0, 1.0);
  float k = 1.0;
  if (id < 0.5) return base;
  if (id < 1.5) { // planks
    float row = floor(q.y / 0.5);
    float off = aHash(vec2(row, 3.0)) * 2.4;
    float col = floor((q.x + off) / 2.4);
    float v = aHash(vec2(row, col));
    k = 0.9 + 0.16 * v + 0.03 * sin(q.x * 9.0 + v * 20.0);
    k *= 1.0 - 0.32 * max(aSeam(q.y, 0.5, 0.012), aSeam(q.x + off, 2.4, 0.012));
  } else if (id < 2.5) { // checker tiles
    vec2 c = floor(q / 1.2);
    k = mod(c.x + c.y, 2.0) < 0.5 ? 1.0 : 0.86;
    k *= 1.0 - 0.25 * max(aSeam(q.x, 1.2, 0.015), aSeam(q.y, 1.2, 0.015));
  } else if (id < 3.5) { // wallpaper stripes
    float s = step(0.5, fract(q.x / 0.7));
    k = 1.0 - 0.07 * s;
  } else if (id < 4.5) { // metal panels with rivets
    k = 0.94 + 0.08 * aHash(floor(q / vec2(2.0, 1.5)));
    k *= 1.0 - 0.3 * max(aSeam(q.x, 2.0, 0.02), aSeam(q.y, 1.5, 0.02));
    vec2 r = fract(q / vec2(2.0, 1.5)) * vec2(2.0, 1.5);
    float rv = length(min(r, vec2(2.0, 1.5) - r) - 0.12);
    k *= 1.0 - 0.25 * (1.0 - smoothstep(0.03, 0.05, rv));
  } else if (id < 5.5) { // hazard stripes
    float s = step(0.5, fract((q.x + q.y) / 0.9));
    return mix(vec3(0.04, 0.03, 0.08), base, s);
  } else if (id < 6.5) { // grass
    float nn = aNoise(q * 0.18) * 0.6 + aNoise(q * 0.7) * 0.3 + aNoise(q * 3.0) * 0.1;
    k = 0.78 + 0.42 * nn;
    k *= 0.92 + 0.16 * aHash(floor(q * 9.0)) * fade;
    return base * k * vec3(1.0, 1.0 + 0.05 * (nn - 0.5), 1.0);
  } else if (id < 7.5) { // paving stones
    float row = floor(q.y / 0.7);
    float off = mod(row, 2.0) * 0.45;
    vec2 c = vec2(floor((q.x + off) / 0.9), row);
    k = 0.88 + 0.2 * aHash(c);
    k *= 1.0 - 0.45 * max(aSeam(q.y, 0.7, 0.03), aSeam(q.x + off, 0.9, 0.03));
  } else if (id < 8.5) { // carpet
    k = 0.93 + 0.1 * aNoise(q * 6.0) * fade;
  } else if (id < 9.5) { // siding
    k = 1.0 - 0.14 * aSeam(q.y, 0.6, 0.015);
  } else if (id < 10.5) { // ribs along z
    k = 0.86 + 0.14 * smoothstep(0.2, 0.5, abs(fract(p.z / 0.9) - 0.5) * 2.0);
  } else if (id < 11.5) { // concrete slabs
    k = 0.9 + 0.1 * aNoise(q * 1.3) + 0.06 * aHash(floor(q * 4.0)) * fade;
    k *= 1.0 - 0.3 * max(aSeam(q.x, 3.0, 0.03), aSeam(q.y, 3.0, 0.03));
  } else if (id < 12.5) { // bricks
    float row = floor(q.y / 0.3);
    float off = mod(row, 2.0) * 0.3;
    k = 0.88 + 0.18 * aHash(vec2(floor((q.x + off) / 0.6), row));
    k *= 1.0 - 0.4 * max(aSeam(q.y, 0.3, 0.02), aSeam(q.x + off, 0.6, 0.02));
  } else if (id < 13.5) { // polka dots
    vec2 g = fract(q / 0.6) - 0.5;
    k = 1.0 + 0.12 * (1.0 - smoothstep(0.1, 0.13, length(g)));
  } else { // little stars on wallpaper
    vec2 cell = floor(q / 0.8);
    vec2 g = fract(q / 0.8) - 0.5 + (vec2(aHash(cell), aHash(cell + 7.0)) - 0.5) * 0.4;
    float a = atan(g.y, g.x);
    float r = length(g) / (0.09 * (0.75 + 0.25 * cos(a * 5.0)));
    k = 1.0 + 0.16 * (1.0 - smoothstep(0.9, 1.0, r)) * fade;
  }
  return base * mix(1.0, k, fade * 0.85 + 0.15);
}
`;

let roomMat: MeshStandardMaterial | null = null;

/** The building's lit surface material (vertex colors + procedural patterns + warm self light). */
export function roomMaterial(): MeshStandardMaterial {
  if (roomMat) return roomMat;
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.7 });
  const warm = { value: new Color(1.0, 0.8, 0.62).multiplyScalar(0.55) };
  m.onBeforeCompile = (s) => {
    s.uniforms.uWarm = warm;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>\n${ROOM_PARS}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;\nvON = normal;\nvPat = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${ROOM_FRAG_PARS}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = aPattern(floor(vPat.x + 0.5), diffuseColor.rgb, vOP, normalize(vON));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uWarm * vPat.y;');
  };
  m.customProgramCacheKey = () => 'academyRoom';
  roomMat = markShared(m);
  return m;
}

const BLINK_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vC;
void main() {
  float on = 1.0;
  if (uv.y > 0.0) on = step(0.0, sin((uTime * uv.y + uv.x) * 6.2832));
  else if (uv.y < 0.0) on = 0.5 + 0.5 * sin((uTime * -uv.y + uv.x) * 6.2832);
  vC = color * mix(0.16, 1.0, on);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BLINK_FRAG = /* glsl */ `
varying vec3 vC;
void main() {
  gl_FragColor = vec4(vC, 1.0);
  ${OUTPUT_GLSL}
}`;

/** Blinking / pulsing lights (one per Academy: owns its time uniform). */
export function blinkMaterial(): ShaderMaterial {
  return new ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: BLINK_VERT, fragmentShader: BLINK_FRAG, vertexColors: true });
}

const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vC;
void main() {
  vUv = uv;
  vC = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SCREEN_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform vec4 uScan;
uniform vec4 uRadar;
varying vec2 vUv;
varying vec3 vC;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.4) discard;
  vec3 col = t.rgb * vC;
  // A soft scan line sweeping across the mission screen.
  if (vUv.x > uScan.x && vUv.x < uScan.z && vUv.y > uScan.y && vUv.y < uScan.w) {
    float u = (vUv.x - uScan.x) / (uScan.z - uScan.x);
    float s = fract(uTime * 0.08);
    float d = abs(u - s);
    col += vec3(0.25, 0.6, 1.0) * exp(-d * 60.0) * 0.9 * vC;
    col *= 0.94 + 0.06 * sin(vUv.y * 2600.0);
  }
  // Radar sweep on the console.
  vec2 rp = (vUv - uRadar.xy) / uRadar.zw;
  float rr = length(rp);
  if (rr < 1.0) {
    float a = atan(rp.y, rp.x);
    float sweep = fract((a / 6.2832) - uTime * 0.35);
    col += vec3(0.2, 1.0, 0.6) * pow(sweep, 6.0) * 0.8 * (1.0 - rr);
  }
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}`;

/** Glowing screens and signs cut from the atlas (unlit, vertex colors scale brightness). */
export function screenMaterial(map: CanvasTexture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uMap: { value: map }, uTime: { value: 0 }, uScan: { value: new Vector4(2, 2, 2, 2) }, uRadar: { value: new Vector4(-5, -5, 0.01, 0.01) } },
    vertexShader: SCREEN_VERT,
    fragmentShader: SCREEN_FRAG,
    vertexColors: true,
  });
}

/** Lit atlas decals (posters, stickers, rugs, medal faces...). */
export function decalMaterial(map: CanvasTexture): MeshStandardMaterial {
  return new MeshStandardMaterial({ map, vertexColors: true, roughness: 0.6, metalness: 0, alphaTest: 0.5, envMapIntensity: 0.8, side: DoubleSide });
}

/** Window glass (see-through, glossy). */
export function glassMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: '#cfeeff', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.2, envMapIntensity: 2.6, depthWrite: false, side: DoubleSide });
}

// ------------------------------------------------------------------ the kit

export interface Region { x: number; y: number; w: number; h: number }

type Col = string | Color;
const _m = new Matrix4();
const _m2 = new Matrix4();
const _e = new Euler();
const _c = new Color();

export interface AcademyMats {
  room: MeshStandardMaterial;
  blink: ShaderMaterial;
  screen: ShaderMaterial;
  decal: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  beam: ShaderMaterial;
}

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vC;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vC = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uGain;
varying vec2 vUv;
varying vec3 vC;
varying vec3 vN;
varying vec3 vV;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
  float a = pow(vUv.y, 1.6) * edge * uGain * (0.85 + 0.15 * sin(uTime * 2.0 + vUv.y * 12.0));
  gl_FragColor = vec4(vC * a, 1.0);
  ${OUTPUT_GLSL}
}`;

/** Soft additive light beams (spotlight, projector, holo-table), brightest at uv.y = 1. */
export function beamMaterial(gain = 1): ShaderMaterial {
  return new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uGain: { value: gain } }, vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
}

export function academyMats(map: CanvasTexture, post = true): AcademyMats {
  return { room: roomMaterial(), blink: blinkMaterial(), screen: screenMaterial(map), decal: decalMaterial(map), glass: glassMaterial(), beam: beamMaterial(post ? 1 : 0.6) };
}

/** Kit with placement scopes, pattern/blink uv tagging and atlas decals. */
export class AKit extends Kit {
  private recent: BufferGeometry[] | null = null;

  constructor(readonly mats: AcademyMats) {
    super();
  }

  override add(m: Material, g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    const out = super.add(m, g, c, x, y, z, rx, ry, rz);
    this.recent?.push(out);
    return out;
  }

  /** Run `fn` with everything it adds moved to (x, y, z), turned by ry and scaled by s. */
  at(x: number, y: number, z: number, ry: number, s: number, fn: () => void): void {
    const prev = this.recent;
    const list: BufferGeometry[] = [];
    this.recent = list;
    fn();
    this.recent = prev;
    _m.makeRotationY(ry).premultiply(_m2.makeTranslation(x, y, z));
    if (s !== 1) _m.multiply(_m2.makeScale(s, s, s));
    for (const g of list) {
      g.applyMatrix4(_m);
      prev?.push(g);
    }
  }

  /** A lit building surface with a pattern and warm self-light (0..1). */
  r(g: BufferGeometry, c: Col, pat: number, self: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    const out = this.add(this.mats.room, g, c, x, y, z, rx, ry, rz);
    setUv(out, pat, self);
    return out;
  }

  /** A blinking (rate > 0, Hz) or pulsing (rate < 0) light; color is boosted ×2.2 if a string. */
  blink(g: BufferGeometry, c: Col, phase: number, rate: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    const out = this.add(this.mats.blink, g, typeof c === 'string' ? hot(c) : c, x, y, z, rx, ry, rz);
    setUv(out, phase, rate);
    return out;
  }

  /** A flat w×h decal (facing +z before rotation) showing an atlas region. */
  decal(r: Region, w: number, h: number, glow: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, tint: Col = '#ffffff'): BufferGeometry {
    return this.decalGeo(new PlaneGeometry(w, h), r, glow, tint, x, y, z, rx, ry, rz);
  }

  /** Any geometry with 0..1 uvs mapped into an atlas region (glow > 0 = unlit screen brightness). */
  decalGeo(g: BufferGeometry, r: Region, glow: number, tint: Col = '#ffffff', x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    const uv = g.attributes.uv;
    const A = 2048;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, (r.x + u * r.w) / A, 1 - (r.y + (1 - v) * r.h) / A);
    }
    const col = typeof tint === 'string' ? _c.set(tint).clone() : tint.clone();
    if (glow > 0) col.multiplyScalar(glow);
    return this.add(glow > 0 ? this.mats.screen : this.mats.decal, g, col, x, y, z, rx, ry, rz);
  }

  /** Glass part. */
  glass(g: BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(this.mats.glass, g, '#ffffff', x, y, z, rx, ry, rz);
  }

  /** Additive light beam (uv.y = 1 is the bright end). */
  beam(g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(this.mats.beam, g, c, x, y, z, rx, ry, rz);
  }

  /** Recolor an added part per vertex from its position and normal. */
  recolor(g: BufferGeometry, fn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => Col): void {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const col = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const c = fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
      if (typeof c === 'string') _c.set(c);
      else _c.copy(c);
      col.setXYZ(i, _c.r, _c.g, _c.b);
    }
  }

  /** Copy a baked prop group's vertex-colored meshes into this kit, transformed. */
  addBaked(group: Group, x: number, y: number, z: number, ry = 0, s = 1): void {
    _e.set(0, ry, 0);
    _m.makeRotationFromEuler(_e).premultiply(_m2.makeTranslation(x, y, z));
    if (s !== 1) _m.multiply(_m2.makeScale(s, s, s));
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as Material;
      const geo = mesh.geometry.clone();
      const colors = geo.attributes.color ? (geo.attributes.color.array as Float32Array).slice() : null;
      geo.applyMatrix4(_m2.copy(_m).multiply(mesh.matrixWorld));
      const out = this.add(mat, geo, '#ffffff');
      if (colors) (out.attributes.color.array as Float32Array).set(colors);
    });
  }

  /** Darken vertices near the closed faces of a room box (soft fake ambient occlusion). */
  ao(g: BufferGeometry, b: Box3, amt = 0.34, r = 0.9): void {
    const p = g.attributes.position;
    const col = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      let occ = 0;
      const ds = [y - b.min.y, b.max.y - y, x - b.min.x, b.max.x - x, z - b.min.z];
      for (const d of ds) if (d > 0.03) occ += Math.exp(-d / r);
      const f = 1 - amt * Math.min(1, occ);
      col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
    }
  }

  /** Merge everything into meshes (one per material); geometries are owned (not shared). */
  meshes(shadows: boolean): Mesh[] {
    const out: Mesh[] = [];
    for (const [m, geo] of this.finish()) {
      delete geo.userData.shared;
      const mesh = new Mesh(geo, m);
      const lit = (m as MeshStandardMaterial).isMeshStandardMaterial && !m.transparent;
      mesh.castShadow = shadows && lit;
      mesh.receiveShadow = shadows && lit;
      out.push(mesh);
    }
    return out;
  }
}

export function setUv(g: BufferGeometry, a: number, b: number): void {
  const n = g.attributes.position.count;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = a;
    uv[i * 2 + 1] = b;
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2));
}

/** A subdivided plane facing +z (for surfaces that get baked occlusion). */
export function panel(w: number, h: number, sw = 8, sh = 6): BufferGeometry {
  return new PlaneGeometry(w, h, sw, sh);
}

export { M };
