// The backdrop behind the garden, in screen space so it frames the board without taking room from
// it: a fresh blue sky, two layers of clouds drifting at different speeds (gentle parallax), a row
// of round lush trees with picnic bunting, and a woven willow fence (wattle) along the bottom, where
// the garden begins. Drawn first with its own orthographic camera, in the strip above the beds; the
// 3D garden is drawn over it. All toon-shaded and outlined like the rest. Our own design.
import * as THREE from 'three';
import { ball, buildOutlined, capsule, cone, cyl, type Piece } from './geo';
import { Materials } from './materials';
import { PALETTE } from './palette';

const OUTLINE = 0.03;

/** A puffy cloud, 1 unit wide (white on top, soft blue underneath). */
function cloud(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const puffs: [number, number, number][] = [[-0.3, 0, 0.2], [-0.1, 0.1, 0.27], [0.12, 0.06, 0.24], [0.32, -0.01, 0.17], [0, -0.06, 0.2]];
  return buildOutlined(puffs.map(([x, y, r]) => ({ geo: ball(r, 14, 10), color: (_px: number, py: number) => (py < y - r * 0.2 ? PALETTE.cloudShade : PALETTE.cloud), at: [x, y, 0] as const, scale: [1, 0.85, 0.4] as const })), OUTLINE);
}

/** A round lush tree, 1 unit tall. */
function tree(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  return buildOutlined([
    { geo: cyl(0.06, 0.09, 0.4, 8), color: 0x9a5f34, at: [0, 0.2, -0.1] },
    { geo: ball(0.34, 16, 12), color: 0x4cb83a, at: [0, 0.62, 0], scale: [1, 0.95, 0.5] },
    { geo: ball(0.2, 12, 10), color: 0x6bd04a, at: [-0.22, 0.55, 0.05], scale: [1, 1, 0.5] },
    { geo: ball(0.19, 12, 10), color: 0x3fa12f, at: [0.24, 0.58, 0.04], scale: [1, 1, 0.5] },
    { geo: ball(0.16, 12, 8), color: 0x7ddc58, at: [-0.05, 0.86, 0.03], scale: [1, 1, 0.5] },
  ], OUTLINE);
}

/** One panel of woven willow fence, 1 unit wide: stakes with bands weaving in and out. */
function wattle(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const pieces: Piece[] = [];
  for (const x of [-0.5, 0, 0.5]) pieces.push({ geo: cyl(0.035, 0.04, 0.62, 6), color: 0x8a5530, at: [x, 0.31, 0] });
  for (let row = 0; row < 4; row++) {
    for (let seg = 0; seg < 2; seg++) {
      const front = (row + seg) % 2 === 0;
      pieces.push({ geo: capsule(0.045, 0.42, 3, 8), color: front ? 0xc98c52 : 0xb07843, at: [-0.25 + seg * 0.5, 0.1 + row * 0.12, front ? 0.03 : -0.01], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.6] });
    }
  }
  return buildOutlined(pieces, OUTLINE * 0.6);
}

/** A bunting pennant, 1 unit tall (the instance colour paints it). */
function pennant(): THREE.BufferGeometry {
  return buildOutlined([{ geo: cone(0.32, 1, 3), color: 0xffffff, at: [0, -0.5, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.2] }], 0).geo;
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
  private readonly far: Layer;
  private readonly near: Layer;
  private readonly trees: Layer;
  private readonly fence: Layer;
  private readonly flags: THREE.InstancedMesh;
  private w = 1;
  /** Where the beds' back edge is on screen (CSS px from the top): the fence stands there. */
  private ground = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor() {
    const skyGeo = new THREE.PlaneGeometry(1, 1);
    const col = new Float32Array(4 * 3), top = new THREE.Color(PALETTE.skyTop), low = new THREE.Color(PALETTE.skyLow);
    // PlaneGeometry's vertices: top-left, top-right, bottom-left, bottom-right
    [top, top, low, low].forEach((c, i) => col.set([c.r, c.g, c.b], i * 3));
    skyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sky = new THREE.Mesh(skyGeo, Materials.basic);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb6d98c, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d6, 1.4);
    sun.position.set(-0.4, 1, 1);
    this.scene.add(sun);
    const layer = (part: { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null }, n: number): Layer => {
      const mesh = inst(part.geo, Materials.toonInst, n), hull = part.hull ? inst(part.hull, Materials.outlineInst, n) : null;
      if (hull) { hull.instanceMatrix = mesh.instanceMatrix; this.scene.add(hull); }
      this.scene.add(mesh);
      return { mesh, hull };
    };
    this.far = layer(cloud(), 6);
    this.near = layer(cloud(), 5);
    this.trees = layer(tree(), 16);
    this.fence = layer(wattle(), 40);
    this.flags = inst(pennant(), Materials.toonInst, 40, true);
    this.scene.add(this.flags);
  }

  /** Lays the backdrop out for a w × h screen whose beds begin `ground` px from the top. */
  resize(w: number, h: number, ground: number) {
    this.w = w; this.ground = ground;
    this.camera.left = 0; this.camera.right = w; this.camera.top = 0; this.camera.bottom = -h;
    this.camera.updateProjectionMatrix();
    this.sky.scale.set(w, Math.max(ground + 40, 1), 1);
    this.sky.position.set(w / 2, -this.sky.scale.y / 2, -5);
    // trees: a row along the band's bottom, sized to the band (at least a sliver shows on phones)
    const band = Math.max(ground, 40), size = Math.min(Math.max(band * 1.15, 70), 220);
    const nTrees = Math.min(16, Math.ceil(w / (size * 0.7)) + 1);
    for (let i = 0; i < 16; i++) {
      const on = i < nTrees, x = (i + 0.3 * ((i * 7) % 3)) * size * 0.7 - size * 0.3, s = size * (0.85 + ((i * 5) % 4) * 0.08);
      this.put(this.trees, i, x, -(ground + size * 0.08), -2, on ? s : 0);
    }
    this.trees.mesh.count = 16;
    // the fence: panels along the bottom of the band
    const panel = Math.min(Math.max(band * 0.55, 34), 90), nPanels = Math.min(40, Math.ceil(w / panel) + 1);
    for (let i = 0; i < 40; i++) this.put(this.fence, i, i * panel, -(ground + panel * 0.06), -1, i < nPanels ? panel : 0);
    // bunting strung across the trees
    const flagH = Math.min(Math.max(band * 0.16, 9), 28), gap = flagH * 1.4, colours = [0xff4f5e, 0xfff6e6, 0xffd23a, 0x47c4f0];
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
    const band = Math.max(this.ground, 40), span = this.w + band * 3;
    for (const [l, n, speed, scale, height] of [[this.far, 6, 4, 1.4, 0.55], [this.near, 5, 9, 2.0, 0.35]] as const) {
      for (let i = 0; i < n; i++) {
        const base = (i / n) * span, x = ((base + (reduced ? 0 : t * speed)) % span) - band * 1.5;
        const y = -Math.max(8, this.ground - band * (height + 0.25 * ((i * 3) % 2)));
        this.put(l, i, x, y, l === this.far ? -4 : -3, band * scale * (0.8 + ((i * 7) % 3) * 0.15));
      }
    }
  }
}
