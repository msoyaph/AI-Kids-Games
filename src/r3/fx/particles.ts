import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from 'three';
import { OUTPUT_GLSL } from '../materials';

export type ParticleShape = 'spark' | 'puff' | 'star';

const VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSize;
uniform float uPixelRatio;
uniform float uScreenH;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // World-sized points: aSize is a diameter in world units.
  gl_PointSize = clamp(aSize * projectionMatrix[1][1] * uScreenH * 0.5 / max(0.001, -mv.z), 0.0, 256.0);
  vColor = aColor;
}`;

const FRAG = /* glsl */ `
uniform int uShape;
varying vec4 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a;
  if (uShape == 0) {
    a = exp(-r * r * 5.0) + 0.4 * exp(-r * r * 1.2);
  } else if (uShape == 1) {
    a = smoothstep(1.0, 0.25, r);
  } else {
    float ang = atan(c.y, c.x);
    float star = 0.55 + 0.45 * cos(ang * 5.0);
    a = smoothstep(star, star * 0.6, r) + exp(-r * r * 6.0) * 0.6;
  }
  a *= vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
  ${OUTPUT_GLSL}
}`;

/**
 * A pooled particle system drawn as one Points object (one draw call). No allocation while
 * running: everything lives in typed arrays, and dead particles are swap-removed.
 */
export class Particles3 {
  readonly points: Points;
  private readonly max: number;
  private count = 0;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly base: Float32Array;
  private readonly size: Float32Array;
  private readonly size0: Float32Array;
  private readonly grow: Float32Array;
  private readonly life: Float32Array;
  private readonly life0: Float32Array;
  private readonly geo: BufferGeometry;
  private readonly mat: ShaderMaterial;
  gravity = 0;
  drag = 0.6;
  private readonly tmp = new Color();

  constructor(max: number, shape: ParticleShape = 'spark', additive = true) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.base = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.life = new Float32Array(max);
    this.life0 = new Float32Array(max);
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new BufferAttribute(this.col, 4));
    this.geo.setAttribute('aSize', new BufferAttribute(this.size, 1));
    this.geo.setDrawRange(0, 0);
    this.mat = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: 1 }, uScreenH: { value: 720 }, uShape: { value: shape === 'spark' ? 0 : shape === 'puff' ? 1 : 2 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      premultipliedAlpha: true,
    });
    this.points = new Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }

  /** Physical screen height in pixels (keeps world-sized points correct). */
  setScreen(heightPx: number): void {
    this.mat.uniforms.uScreenH.value = heightPx;
  }

  get alive(): number {
    return this.count;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: string | Color, alpha = 1, grow = 0): void {
    if (this.count >= this.max) return;
    const i = this.count++;
    const c = typeof color === 'string' ? this.tmp.set(color) : color;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.base[i * 4] = c.r;
    this.base[i * 4 + 1] = c.g;
    this.base[i * 4 + 2] = c.b;
    this.base[i * 4 + 3] = alpha;
    this.size0[i] = size;
    this.size[i] = size;
    this.grow[i] = grow;
    this.life[i] = life;
    this.life0[i] = life;
  }

  /** A round burst of particles (fireworks, sparkles, dust puffs). */
  burst(x: number, y: number, z: number, n: number, speed: number, life: number, size: number, color: string, rand: () => number = Math.random): void {
    for (let k = 0; k < n; k++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const s = speed * (0.4 + rand() * 0.6);
      this.spawn(x, y, z, r * Math.cos(t) * s, u * s, r * Math.sin(t) * s, life * (0.6 + rand() * 0.4), size * (0.7 + rand() * 0.6), color);
    }
  }

  update(dt: number): void {
    const damp = Math.exp(-this.drag * dt);
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.kill(i);
        continue;
      }
      const j = i * 3;
      this.vel[j] *= damp;
      this.vel[j + 1] = this.vel[j + 1] * damp - this.gravity * dt;
      this.vel[j + 2] *= damp;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      const t = this.life[i] / this.life0[i];
      const fade = t < 0.3 ? t / 0.3 : 1;
      const k = i * 4;
      this.col[k] = this.base[k];
      this.col[k + 1] = this.base[k + 1];
      this.col[k + 2] = this.base[k + 2];
      this.col[k + 3] = this.base[k + 3] * fade;
      this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - t));
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    (this.geo.attributes.position as BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aColor as BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSize as BufferAttribute).needsUpdate = true;
  }

  private kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.pos.copyWithin(i * 3, last * 3, last * 3 + 3);
    this.vel.copyWithin(i * 3, last * 3, last * 3 + 3);
    this.base.copyWithin(i * 4, last * 4, last * 4 + 4);
    this.col.copyWithin(i * 4, last * 4, last * 4 + 4);
    this.size[i] = this.size[last];
    this.size0[i] = this.size0[last];
    this.grow[i] = this.grow[last];
    this.life[i] = this.life[last];
    this.life0[i] = this.life0[last];
  }

  clear(): void {
    this.count = 0;
    this.geo.setDrawRange(0, 0);
  }
}
