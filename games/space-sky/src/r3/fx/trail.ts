import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, ShaderMaterial, Vector3, type Camera } from 'three';
import { OUTPUT_GLSL } from '../materials';

const VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
varying float vT;
varying float vSide;
void main() {
  vT = aT;
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uHead;
uniform vec3 uTail;
uniform float uPower;
varying float vT;
varying float vSide;
void main() {
  float edge = 1.0 - abs(vSide);
  float a = pow(1.0 - vT, 1.6) * smoothstep(0.0, 0.7, edge) * uPower;
  vec3 col = mix(uHead, uTail, vT);
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}`;

/**
 * A glowing ribbon left behind a moving point (engine trails, comets, sparkles).
 * Points live in a ring buffer; the ribbon always faces the camera. No allocation per frame.
 */
export class Trail {
  readonly mesh: Mesh;
  private readonly n: number;
  private readonly pts: Float32Array;
  private head = 0;
  private count = 0;
  private readonly pos: Float32Array;
  private readonly geo: BufferGeometry;
  private readonly mat: ShaderMaterial;
  width: number;
  /** Minimum distance between stored points. */
  spacing: number;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly dir = new Vector3();
  private readonly view = new Vector3();
  private readonly side = new Vector3();

  constructor(points: number, width: number, head: string, tail: string, spacing = 0.15) {
    this.n = points;
    this.width = width;
    this.spacing = spacing;
    this.pts = new Float32Array(points * 3);
    this.pos = new Float32Array(points * 2 * 3);
    const t = new Float32Array(points * 2);
    const side = new Float32Array(points * 2);
    for (let i = 0; i < points; i++) {
      t[i * 2] = t[i * 2 + 1] = i / (points - 1);
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
    }
    const index: number[] = [];
    for (let i = 0; i < points - 1; i++) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aT', new BufferAttribute(t, 1));
    this.geo.setAttribute('aSide', new BufferAttribute(side, 1));
    this.geo.setIndex(index);
    this.geo.setDrawRange(0, 0);
    this.mat = new ShaderMaterial({
      uniforms: { uHead: { value: new Color(head) }, uTail: { value: new Color(tail) }, uPower: { value: 1 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
      side: DoubleSide,
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }

  set power(p: number) {
    this.mat.uniforms.uPower.value = p;
  }

  setColors(head: string, tail: string): void {
    (this.mat.uniforms.uHead.value as Color).set(head);
    (this.mat.uniforms.uTail.value as Color).set(tail);
  }

  clear(): void {
    this.count = 0;
    this.geo.setDrawRange(0, 0);
  }

  /** Add the current head position (world space). Returns true if a new point was stored. */
  push(p: Vector3): boolean {
    if (this.count >= 2) {
      // The newest point follows the head; a new point is laid down once it is far enough
      // from the previous one.
      const prev = ((this.head - 1 + this.n) % this.n) * 3;
      const dx = p.x - this.pts[prev];
      const dy = p.y - this.pts[prev + 1];
      const dz = p.z - this.pts[prev + 2];
      if (dx * dx + dy * dy + dz * dz < this.spacing * this.spacing) {
        const i = this.head * 3;
        this.pts[i] = p.x;
        this.pts[i + 1] = p.y;
        this.pts[i + 2] = p.z;
        return false;
      }
    }
    this.head = (this.head + 1) % this.n;
    const i = this.head * 3;
    this.pts[i] = p.x;
    this.pts[i + 1] = p.y;
    this.pts[i + 2] = p.z;
    if (this.count < this.n) this.count++;
    return true;
  }

  /** Rebuild the ribbon facing the camera. Call once per frame after `push`. */
  update(camera: Camera): void {
    const c = this.count;
    if (c < 2) {
      this.geo.setDrawRange(0, 0);
      return;
    }
    const cam = camera.position;
    for (let k = 0; k < c; k++) {
      // k = 0 is the newest point.
      const idx = ((this.head - k + this.n) % this.n) * 3;
      const nidx = ((this.head - Math.min(k + 1, c - 1) + this.n) % this.n) * 3;
      const pidx = ((this.head - Math.max(k - 1, 0) + this.n) % this.n) * 3;
      this.a.set(this.pts[pidx], this.pts[pidx + 1], this.pts[pidx + 2]);
      this.b.set(this.pts[nidx], this.pts[nidx + 1], this.pts[nidx + 2]);
      this.dir.subVectors(this.a, this.b);
      const px = this.pts[idx];
      const py = this.pts[idx + 1];
      const pz = this.pts[idx + 2];
      this.view.set(cam.x - px, cam.y - py, cam.z - pz);
      this.side.crossVectors(this.dir, this.view);
      const len = this.side.length() || 1;
      const t = k / (this.n - 1);
      const w = (this.width * (1 - t * 0.7)) / len;
      const o = k * 6;
      this.pos[o] = px - this.side.x * w;
      this.pos[o + 1] = py - this.side.y * w;
      this.pos[o + 2] = pz - this.side.z * w;
      this.pos[o + 3] = px + this.side.x * w;
      this.pos[o + 4] = py + this.side.y * w;
      this.pos[o + 5] = pz + this.side.z * w;
    }
    (this.geo.attributes.position as BufferAttribute).needsUpdate = true;
    this.geo.setDrawRange(0, (c - 1) * 6);
  }
}
