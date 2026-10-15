// Copied from games/fieldlark/src/render/sky.ts (the shared engine; see docs/PLAN.md "Engine reuse").
/**
 * The sky: a big dome around the camera, deep blue overhead fading to the hazy horizon colour that
 * the far countryside also fades into, so land and sky meet softly. Vertex colours only.
 */
import * as THREE from 'three';

export class Sky {
  readonly mesh: THREE.Mesh;
  private colors: THREE.BufferAttribute;
  private ys: Float32Array;
  private key = '';

  constructor() {
    const g = new THREE.SphereGeometry(1, 24, 16);
    const pos = g.getAttribute('position');
    this.ys = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) this.ys[i] = pos.getY(i);
    this.colors = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
    g.setAttribute('color', this.colors);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'sky';
    // stars for the lantern night: a fixed scatter over the upper sky, fading in after dusk
    const pts: number[] = [];
    let s = 7;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 420; i++) {
      const y = 0.12 + rnd() * 0.88, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      pts.push(Math.cos(a) * r * 0.98, y * 0.98, Math.sin(a) * r * 0.98);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xfff8e0, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.mesh.add(this.stars);
  }

  private stars: THREE.Points;
  private starMat: THREE.PointsMaterial;

  /** Stars at night (0..1). */
  setStars(amount: number) {
    this.starMat.opacity = Math.max(0, amount * 1.2 - 0.2);
    this.stars.visible = this.starMat.opacity > 0.01;
  }

  /** Recolour (only when the colours change). */
  setColors(zenith: THREE.Color, horizon: THREE.Color) {
    const key = `${zenith.getHexString()}${horizon.getHexString()}`;
    if (key === this.key) return;
    this.key = key;
    const c = new THREE.Color();
    for (let i = 0; i < this.ys.length; i++) {
      const y = this.ys[i]!;
      const t = Math.pow(Math.min(1, Math.max(0, y * 1.25)), 0.7);
      c.copy(horizon).lerp(zenith, t);
      this.colors.setXYZ(i, c.r, c.g, c.b);
    }
    this.colors.needsUpdate = true;
  }

  /** Keep it round the camera, just inside the far plane. */
  follow(cam: THREE.PerspectiveCamera) {
    this.mesh.position.copy(cam.position);
    this.mesh.scale.setScalar(cam.far * 0.92);
  }
}
