// The backdrop behind the garden, in screen space so it frames the board without taking room from
// it: each world's sky, two layers of clouds drifting at different speeds (gentle parallax), the
// world's far scenery (round trees and picnic bunting, greenhouse panes, pumpkins and a moon,
// desert mesas, floating islands) and its near edge (a woven willow fence, a brick planter wall,
// hay bales, an adobe wall, cloud puffs), all toon-shaded and outlined. Drawn first with its own
// orthographic camera, in the strip above the beds; the 3D garden is drawn over it. Our own design.
import * as THREE from 'three';
import { ball, buildOutlined, capsule, cone, cyl, softBox, type Piece } from './geo';
import { Materials } from './materials';
import type { Theme } from './worlds';

const OUTLINE = 0.03;
type Outlined = { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null };

function cloud(shade: number): Outlined {
  const puffs: [number, number, number][] = [[-0.3, 0, 0.2], [-0.1, 0.1, 0.27], [0.12, 0.06, 0.24], [0.32, -0.01, 0.17], [0, -0.06, 0.2]];
  return buildOutlined(puffs.map(([x, y, r]): Piece => ({ geo: ball(r, 14, 10), color: (_px: number, py: number) => (py < y - r * 0.2 ? shade : 0xffffff), at: [x, y, 0], scale: [1, 0.85, 0.4] })), OUTLINE);
}

/** The far scenery, 1 unit tall. */
function far(t: Theme): Outlined {
  switch (t.decor) {
    case 'greenhouse': return buildOutlined([{ geo: softBox(1, 1.1, 0.05, 0.05), color: 0xd8f4f0, at: [0, 0.55, 0] }, ...[-0.48, 0, 0.48].map((x): Piece => ({ geo: softBox(0.05, 1.12, 0.07, 0.3), color: 0xffffff, at: [x, 0.56, 0.02] })), ...[0.2, 0.62, 1.04].map((y): Piece => ({ geo: softBox(1, 0.05, 0.07, 0.3), color: 0xffffff, at: [0, y, 0.02] })), { geo: ball(0.16, 10, 8), color: 0x58c240, at: [-0.24, 0.32, 0.05] }, { geo: cyl(0.1, 0.07, 0.14, 10), color: 0xd9733f, at: [-0.24, 0.12, 0.05] }], OUTLINE);
    case 'dusk': return buildOutlined([{ geo: ball(0.3, 14, 10), color: 0xff9a3a, at: [0, 0.22, 0], scale: [1.3, 0.85, 0.6] }, { geo: cyl(0.03, 0.04, 0.12, 5), color: 0x5fb33a, at: [0, 0.5, 0] }, { geo: ball(0.18, 12, 8), color: 0xffb04d, at: [0.38, 0.14, 0.04], scale: [1.3, 0.8, 0.6] }], OUTLINE);
    case 'desert': return buildOutlined([{ geo: softBox(1.4, 0.7, 0.2, 0.15), color: 0xe08a50, at: [0, 0.35, 0] }, { geo: softBox(1.42, 0.08, 0.22, 0.4), color: 0xc86a3a, at: [0, 0.7, 0] }, { geo: capsule(0.07, 0.4, 3, 8), color: 0x5fb87a, at: [0.62, 0.3, 0.12] }, { geo: capsule(0.045, 0.16, 3, 8), color: 0x5fb87a, at: [0.72, 0.36, 0.12], rot: [0, 0, -0.9] }], OUTLINE);
    case 'cloud': return buildOutlined([{ geo: ball(0.4, 14, 10), color: 0xffffff, at: [0, 0.18, 0], scale: [1.4, 0.45, 0.5] }, { geo: cone(0.32, 0.3, 10), color: 0x8a5432, at: [0, 0.02, 0], rot: [Math.PI, 0, 0], scale: [1.4, 1, 0.5] }, { geo: ball(0.18, 12, 8), color: 0x6bd04a, at: [-0.12, 0.42, 0.04], scale: [1, 1, 0.5] }, { geo: cyl(0.03, 0.04, 0.16, 5), color: 0x9a5f34, at: [-0.12, 0.28, 0.04] }], OUTLINE);
    default: return buildOutlined([{ geo: cyl(0.06, 0.09, 0.4, 8), color: 0x9a5f34, at: [0, 0.2, -0.1] }, { geo: ball(0.34, 16, 12), color: 0x4cb83a, at: [0, 0.62, 0], scale: [1, 0.95, 0.5] }, { geo: ball(0.2, 12, 10), color: 0x6bd04a, at: [-0.22, 0.55, 0.05], scale: [1, 1, 0.5] }, { geo: ball(0.19, 12, 10), color: 0x3fa12f, at: [0.24, 0.58, 0.04], scale: [1, 1, 0.5] }, { geo: ball(0.16, 12, 8), color: 0x7ddc58, at: [-0.05, 0.86, 0.03], scale: [1, 1, 0.5] }], OUTLINE);
  }
}

/** The near edge, one panel 1 unit wide. */
function edge(t: Theme): Outlined {
  switch (t.decor) {
    case 'greenhouse': return buildOutlined([0, 1, 2].flatMap(row => [0, 1].map((k): Piece => ({ geo: softBox(0.48, 0.14, 0.12, 0.2), color: (row + k) % 2 ? 0xc96f45 : 0xb85e38, at: [-0.25 + k * 0.5 + (row % 2) * 0.1, 0.08 + row * 0.15, 0] }))), OUTLINE * 0.6);
    case 'dusk': return buildOutlined([{ geo: softBox(0.9, 0.42, 0.4, 0.3), color: 0xe8c460, at: [0, 0.21, 0] }, { geo: softBox(0.92, 0.04, 0.42, 0.5), color: 0xb89030, at: [0, 0.14, 0.01] }], OUTLINE * 0.6);
    case 'desert': return buildOutlined([{ geo: softBox(1, 0.5, 0.2, 0.25), color: 0xe8b07a, at: [0, 0.25, 0] }, { geo: softBox(1.02, 0.08, 0.22, 0.5), color: 0xd09060, at: [0, 0.5, 0] }], OUTLINE * 0.6);
    case 'cloud': return buildOutlined([{ geo: ball(0.32, 14, 10), color: 0xffffff, at: [0, 0.2, 0], scale: [1.6, 0.8, 0.5] }], OUTLINE * 0.6);
    default: {
      // woven willow fence (wattle): stakes with bands weaving in and out
      const pieces: Piece[] = [];
      for (const x of [-0.5, 0, 0.5]) pieces.push({ geo: cyl(0.035, 0.04, 0.62, 6), color: 0x8a5530, at: [x, 0.31, 0] });
      for (let row = 0; row < 4; row++) for (let seg = 0; seg < 2; seg++) { const front = (row + seg) % 2 === 0; pieces.push({ geo: capsule(0.045, 0.42, 3, 8), color: front ? 0xc98c52 : 0xb07843, at: [-0.25 + seg * 0.5, 0.1 + row * 0.12, front ? 0.03 : -0.01], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.6] }); }
      return buildOutlined(pieces, OUTLINE * 0.6);
    }
  }
}

const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number, color = false) => {
  const m = new THREE.InstancedMesh(geo, mat, n);
  if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
  m.frustumCulled = false;
  return m;
};

interface Layer { mesh: THREE.InstancedMesh; hull: THREE.InstancedMesh | null }

export class Backdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  private readonly sky: THREE.Mesh;
  private readonly group = new THREE.Group();
  private farClouds!: Layer;
  private nearClouds!: Layer;
  private scenery!: Layer;
  private edges!: Layer;
  private flags: THREE.InstancedMesh | null = null;
  private moon: THREE.Mesh | null = null;
  private theme: Theme | null = null;
  private w = 1;
  private ground = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly hemi = new THREE.HemisphereLight(0xffffff, 0xb6d98c, 1.3);
  private readonly sun = new THREE.DirectionalLight(0xfff0d6, 1.4);

  constructor() {
    const skyGeo = new THREE.PlaneGeometry(1, 1);
    skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(1), 3));
    this.sky = new THREE.Mesh(skyGeo, Materials.basic);
    this.sky.renderOrder = -10;
    this.sun.position.set(-0.4, 1, 1);
    this.scene.add(this.sky, this.hemi, this.sun, this.group);
  }

  /** Builds the backdrop for a world. */
  setTheme(t: Theme) {
    this.theme = t;
    for (const o of [...this.group.children]) { o.removeFromParent(); (o as THREE.Mesh).geometry?.dispose(); }
    const col = this.sky.geometry.attributes.color as THREE.BufferAttribute, top = new THREE.Color(t.skyTop), low = new THREE.Color(t.skyLow);
    [top, top, low, low].forEach((c, i) => col.setXYZ(i, c.r, c.g, c.b));
    col.needsUpdate = true;
    const layer = (part: Outlined, n: number, color = false): Layer => {
      const mesh = inst(part.geo, Materials.toonInst, n, color), hull = part.hull ? inst(part.hull, Materials.outlineInst, n) : null;
      if (hull) { hull.instanceMatrix = mesh.instanceMatrix; this.group.add(hull); }
      this.group.add(mesh);
      return { mesh, hull };
    };
    const shade = t.decor === 'dusk' ? 0xf0c0d8 : 0xcfe7ff;
    this.farClouds = layer(cloud(shade), 6);
    this.nearClouds = layer(cloud(shade), 5);
    this.scenery = layer(far(t), 16);
    this.edges = layer(edge(t), 40);
    this.flags = null;
    if (t.decor === 'meadow' || t.decor === 'dusk') {
      this.flags = inst(buildOutlined([{ geo: cone(0.32, 1, 3), color: 0xffffff, at: [0, -0.5, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.2] }], 0).geo, Materials.toonInst, 40, true);
      this.group.add(this.flags);
    }
    this.moon = null;
    if (t.decor === 'dusk') { this.moon = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); this.group.add(this.moon); }
    this.hemi.color.setHex(t.fillSky);
    this.sun.color.setHex(t.sun);
    if (this.w > 1) this.resize(this.w, 0, this.ground);
  }

  /** Lays the backdrop out for a w-wide screen whose garden begins `ground` px from the top. */
  resize(w: number, h: number, ground: number) {
    this.w = w; this.ground = ground;
    if (h) { this.camera.left = 0; this.camera.right = w; this.camera.top = 0; this.camera.bottom = -h; this.camera.updateProjectionMatrix(); }
    if (!this.theme) return;
    this.sky.scale.set(w, Math.max(ground + 60, 1), 1);
    this.sky.position.set(w / 2, -this.sky.scale.y / 2, -5);
    const band = Math.max(ground, 40), size = Math.min(Math.max(band * 1.15, 70), 220);
    const n = Math.min(16, Math.ceil(w / (size * 0.7)) + 1);
    for (let i = 0; i < 16; i++) {
      const x = (i + 0.3 * ((i * 7) % 3)) * size * 0.7 - size * 0.3, s = size * (0.85 + ((i * 5) % 4) * 0.08);
      this.put(this.scenery, i, x, -(ground + size * 0.08), -2, i < n ? s : 0);
    }
    const panel = Math.min(Math.max(band * 0.55, 34), 90), np = Math.min(40, Math.ceil(w / panel) + 1);
    for (let i = 0; i < 40; i++) this.put(this.edges, i, i * panel, -(ground + panel * 0.06), -1, i < np ? panel : 0);
    if (this.flags) {
      const flagH = Math.min(Math.max(band * 0.16, 9), 28), gap = flagH * 1.4, colours = this.theme.decor === 'dusk' ? [0xffb04d, 0xfff4d0, 0xb98cff, 0xff8ad8] : [0xff4f5e, 0xfff6e6, 0xffd23a, 0x47c4f0];
      for (let i = 0; i < 40; i++) {
        const x = i * gap, sag = Math.sin((x / w) * Math.PI * 3) * flagH * 0.4;
        this.v.set(x, -(ground - size * 0.62) + sag, -1.5);
        this.q.identity();
        this.s.setScalar(x < w + gap ? flagH : 0);
        this.m.compose(this.v, this.q, this.s);
        this.flags.setMatrixAt(i, this.m);
        this.flags.setColorAt(i, this.c.setHex(colours[i % 4]!, THREE.SRGBColorSpace));
      }
      this.flags.instanceMatrix.needsUpdate = true;
      if (this.flags.instanceColor) this.flags.instanceColor.needsUpdate = true;
    }
    if (this.moon) { const r = Math.min(band * 0.35, 46); this.moon.scale.set(r, r, 1); this.moon.position.set(w * 0.78, -Math.max(r + 6, ground * 0.3), -4.5); }
  }

  private put(l: Layer, i: number, x: number, y: number, z: number, s: number) {
    this.v.set(x, y, z);
    this.q.identity();
    this.s.set(s, s, s);
    this.m.compose(this.v, this.q, this.s);
    l.mesh.setMatrixAt(i, this.m);
    l.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Clouds drift slowly (the near layer faster: gentle parallax); still with reduced motion. */
  update(t: number, reduced: boolean) {
    if (!this.theme) return;
    const band = Math.max(this.ground, 40), span = this.w + band * 3;
    for (const [l, n, speed, scale, height, z] of [[this.farClouds, 6, 4, 1.4, 0.55, -4], [this.nearClouds, 5, 9, 2.0, 0.35, -3]] as const) {
      for (let i = 0; i < n; i++) {
        const base = (i / n) * span, x = ((base + (reduced ? 0 : t * speed)) % span) - band * 1.5;
        const y = -Math.max(8, this.ground - band * (height + 0.25 * ((i * 3) % 2)));
        this.put(l, i, x, y, z, band * scale * (0.8 + ((i * 7) % 3) * 0.15));
      }
    }
  }
}
