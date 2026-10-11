import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  varying vec4 vColor;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, aSize * uScale / max(0.5, -mv.z));
  }
`;

const FRAG = /* glsl */ `
  varying vec4 vColor;
  uniform float uSoft;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float a = mix(1.0, 1.0 - d * d, uSoft);
    gl_FragColor = vec4(vColor.rgb, vColor.a * a);
  }
`;

/**
 * Fixed-capacity particle pool rendered as one THREE.Points draw call.
 * Struct-of-arrays, no allocation after construction. Dead particles are swap-removed.
 */
export class ParticlePool {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  readonly capacity: number;
  /** Max live particles allowed by the current quality profile. */
  budget: number;
  count = 0;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size0: Float32Array;
  private readonly size1: Float32Array;
  private readonly alpha0: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private readonly geo: THREE.BufferGeometry;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;

  constructor(capacity: number, additive: boolean, soft = 0.8) {
    this.capacity = capacity;
    this.budget = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 4);
    this.size = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.size1 = new Float32Array(capacity);
    this.alpha0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aColor', this.colAttr);
    this.geo.setAttribute('aSize', this.sizeAttr);
    this.geo.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uScale: { value: 400 }, uSoft: { value: soft } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
  }

  /** Set the projection scale for the viewport about to be rendered. */
  setViewport(heightPx: number, fovDeg: number): void {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number, color: number, alpha = 1, gravity = 0, drag = 0): void {
    if (this.count >= Math.min(this.budget, this.capacity)) return;
    const i = this.count++;
    const i3 = i * 3;
    const i4 = i * 4;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size0[i] = s0;
    this.size1[i] = s1;
    this.size[i] = s0;
    this.col[i4] = ((color >> 16) & 255) / 255;
    this.col[i4 + 1] = ((color >> 8) & 255) / 255;
    this.col[i4 + 2] = (color & 255) / 255;
    this.col[i4 + 3] = alpha;
    this.alpha0[i] = alpha;
    this.grav[i] = gravity;
    this.drag[i] = drag;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.kill(i);
        continue;
      }
      const i3 = i * 3;
      const dr = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= dr;
      this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt;
      this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      this.col[i * 4 + 3] = this.alpha0[i] * (1 - t * t);
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    if (this.count > 0) {
      this.posAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
      this.sizeAttr.needsUpdate = true;
    }
  }

  private kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    const i3 = i * 3;
    const l3 = last * 3;
    const i4 = i * 4;
    const l4 = last * 4;
    for (let k = 0; k < 3; k++) {
      this.pos[i3 + k] = this.pos[l3 + k];
      this.vel[i3 + k] = this.vel[l3 + k];
    }
    for (let k = 0; k < 4; k++) this.col[i4 + k] = this.col[l4 + k];
    this.size[i] = this.size[last];
    this.life[i] = this.life[last];
    this.maxLife[i] = this.maxLife[last];
    this.size0[i] = this.size0[last];
    this.size1[i] = this.size1[last];
    this.alpha0[i] = this.alpha0[last];
    this.grav[i] = this.grav[last];
    this.drag[i] = this.drag[last];
  }

  clear(): void {
    this.count = 0;
    this.geo.setDrawRange(0, 0);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** Ring buffer of skid-mark quads laid on the road while drifting. */
export class SkidMarks {
  readonly mesh: THREE.Mesh;
  private readonly pos: Float32Array;
  private readonly alpha: Float32Array;
  private readonly attr: THREE.BufferAttribute;
  private readonly aAttr: THREE.BufferAttribute;
  private next = 0;
  private readonly max: number;
  /** Last point per (kart, wheel) for continuous strips. */
  private readonly last = new Map<number, { x: number; y: number; z: number; rx: number; rz: number }>();

  constructor(max = 600) {
    this.max = max;
    this.pos = new Float32Array(max * 6 * 3);
    this.alpha = new Float32Array(max * 6);
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aAttr = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.setAttribute('aAlpha', this.aAttr);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.08,0.07,0.1, vA * 0.45); }`,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  /** Add a mark segment for key (kart*4+wheel) at a point. width ~0.25. */
  add(key: number, x: number, y: number, z: number, dirX: number, dirZ: number, on: boolean): void {
    const prev = this.last.get(key);
    if (!on) {
      this.last.delete(key);
      return;
    }
    const rx = -dirZ * 0.14;
    const rz = dirX * 0.14;
    if (prev && Math.hypot(x - prev.x, z - prev.z) < 4) {
      if (Math.hypot(x - prev.x, z - prev.z) < 0.6) return;
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const o = i * 18;
      const p = this.pos;
      const y0 = prev.y + 0.03;
      const y1 = y + 0.03;
      // two triangles
      p[o] = prev.x - prev.rx;
      p[o + 1] = y0;
      p[o + 2] = prev.z - prev.rz;
      p[o + 3] = prev.x + prev.rx;
      p[o + 4] = y0;
      p[o + 5] = prev.z + prev.rz;
      p[o + 6] = x + rx;
      p[o + 7] = y1;
      p[o + 8] = z + rz;
      p[o + 9] = prev.x - prev.rx;
      p[o + 10] = y0;
      p[o + 11] = prev.z - prev.rz;
      p[o + 12] = x + rx;
      p[o + 13] = y1;
      p[o + 14] = z + rz;
      p[o + 15] = x - rx;
      p[o + 16] = y1;
      p[o + 17] = z - rz;
      for (let k = 0; k < 6; k++) this.alpha[i * 6 + k] = 1;
      this.attr.needsUpdate = true;
      this.aAttr.needsUpdate = true;
      prev.x = x;
      prev.y = y;
      prev.z = z;
      prev.rx = rx;
      prev.rz = rz;
    } else {
      this.last.set(key, { x, y, z, rx, rz });
    }
  }

  /** Fade all marks slowly. */
  fade(dt: number): void {
    let any = false;
    for (let i = 0; i < this.alpha.length; i++) {
      if (this.alpha[i] > 0) {
        this.alpha[i] = Math.max(0, this.alpha[i] - dt * 0.08);
        any = true;
      }
    }
    if (any) this.aAttr.needsUpdate = true;
  }
}
