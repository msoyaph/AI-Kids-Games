/**
 * Little bits of life around the farm, all made in code and cheap: chimney smoke, a gentle sparkle
 * over crops that are ready to pick, butterflies around the flowers, a few birds crossing the sky,
 * leaves drifting down in autumn, and the farmhands (render/helpers.ts). Butterflies, birds and leaves
 * stay away with reduced motion; smoke and sparkles stand still.
 *
 * Flash safety: sparkles are small, soft and slow (well under three a second), and never in sync.
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';
import type { Farm } from '../sim/state';
import type { View } from './camera';
import { patchMaterial } from './fx';
import { Helpers } from './helpers';
import { InstancedLayer, NO_AO } from './instanced';
import { groundY } from './land';
import { STEP_Y, tileAt } from '../sim/map';
import { COTTAGE_CHIMNEY } from './models/buildings';
import { ico, merge, part } from './geo';

const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();

const smokeMat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xf2efe9 }), { key: 'smoke', clouds: false });
const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const wingMat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), { key: 'wing', clouds: false });
const birdMat = new THREE.MeshLambertMaterial({ color: 0x4a4f5a, side: THREE.DoubleSide });

function star(): THREE.BufferGeometry {
  // a soft four-point star, flat, facing +z
  const pos: number[] = [];
  const pts = 8;
  for (let i = 0; i < pts; i++) {
    const a0 = (i / pts) * Math.PI * 2, a1 = ((i + 1) / pts) * Math.PI * 2;
    const r0 = i % 2 ? 0.035 : 0.13, r1 = (i + 1) % 2 ? 0.035 : 0.13;
    pos.push(0, 0, 0, Math.cos(a0) * r0, Math.sin(a0) * r0, 0, Math.cos(a1) * r1, Math.sin(a1) * r1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function wing(): THREE.BufferGeometry {
  // one wing to the +x side of the body, a rounded fan
  const g = new THREE.BufferGeometry();
  const pos = [0, 0, 0.02, 0.09, 0, 0.07, 0.11, 0, -0.02, 0, 0, 0.02, 0.11, 0, -0.02, 0.06, 0, -0.08, 0, 0, 0.02, 0.06, 0, -0.08, 0, 0, -0.03];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: pos.length / 3 }, () => [0, 1, 0]).flat(), 3));
  return g;
}

function birdGeo(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = [0, 0, 0.06, -0.22, 0.04, -0.04, 0, 0.02, -0.04, 0, 0, 0.06, 0, 0.02, -0.04, 0.22, 0.04, -0.04];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const BUTTERFLY_COLORS = [0xffffff, 0xffd34d, 0xff9f4a, 0x9fd0ff, 0xf6a6d0];
const LEAF_COLORS = [0xe8742c, 0xf0a030, 0xd9452c, 0xe8c040];

export class Life {
  readonly group = new THREE.Group();
  readonly helpers = new Helpers();
  private smoke = new InstancedLayer(merge([part(ico(1, 1), 0xffffff, { round: true })], { ao: false }), smokeMat, 16, { shadow: false, receive: false, layer: NO_AO });
  private sparkles = new InstancedLayer(star(), sparkleMat, 32, { shadow: false, receive: false, layer: NO_AO });
  /** Both wings of every butterfly (the left is the right one mirrored). */
  private wings = new InstancedLayer(wing(), wingMat, 32, { shadow: false, receive: false, layer: NO_AO });
  private birds = new InstancedLayer(birdGeo(), birdMat, 8, { shadow: false, receive: false, layer: NO_AO });
  private leaves = new InstancedLayer(new THREE.PlaneGeometry(0.07, 0.05), wingMat, 32, { shadow: false, receive: false, layer: NO_AO });
  private chimneys: THREE.Vector3[] = [];
  private ready: { x: number; z: number; y: number }[] = [];
  private season: Season = 'spring';
  private t = 0;

  constructor() {
    for (const l of [this.smoke, this.sparkles, this.wings, this.birds, this.leaves]) this.group.add(l.mesh);
    this.sparkles.mesh.renderOrder = 4;
    this.group.add(this.helpers.group);
  }

  setSeason(s: Season) { this.season = s; }

  /** Where the chimneys are and which crops are ready (when the farm changes). */
  setFarm(farm: Farm, ready: { x: number; z: number; y: number }[] = []) {
    this.chimneys = [];
    for (const o of farm.objects) {
      if (o.def !== 'cottage') continue;
      // the model is built from its north-west corner on a 3 × 3 footprint, turned about its middle
      const [lx, ly, lz] = COTTAGE_CHIMNEY;
      const a = (-o.rot * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
      const dx = lx - 1.5, dz = lz - 1.5;
      this.chimneys.push(new THREE.Vector3(o.x + 1.5 + dx * c + dz * s, ly + tileAt(o.x, o.z).level * STEP_Y, o.z + 1.5 - dx * s + dz * c));
    }
    this.ready = ready;
    this.helpers.setFarm(farm);
  }

  setReady(ready: { x: number; z: number; y: number }[]) { this.ready = ready; }

  update(dt: number, cam: THREE.Camera, v: View, amount: number, reduced: boolean) {
    if (!reduced) this.t += dt;
    const t = this.t;
    // chimney smoke: soft puffs that rise, drift and grow
    this.smoke.begin();
    for (const c of this.chimneys) {
      for (let i = 0; i < 6; i++) {
        const f = (t * 0.11 + i / 6) % 1;
        // puffs leave the chimney small, swell, lean away on the breeze and thin out at the top
        const s = (0.06 + f * 0.17) * (1 - Math.pow(Math.max(0, f - 0.65) / 0.35, 1.6)) * (0.85 + 0.3 * Math.sin(i * 2.3));
        this.smoke.push(c.x + f * f * 1.1 + Math.sin(t * 0.7 + i * 1.9) * 0.08 * f, c.y + 0.05 + f * 1.15, c.z - f * 0.35, i * 1.3, Math.max(0.001, s));
      }
    }
    this.smoke.end();
    // sparkles over ready crops: two per field, each on its own slow twinkle
    this.sparkles.begin();
    q.copy(cam.quaternion);
    for (const r of this.ready) {
      for (let i = 0; i < 2; i++) {
        const seed = r.x * 13.1 + r.z * 7.7 + i * 3.3;
        const ph = (t * 0.55 + (Math.sin(seed) * 0.5 + 0.5)) % 1;
        const s = reduced ? 0.55 : Math.sin(ph * Math.PI) ** 2;
        if (s < 0.02) continue;
        p.set(r.x + 0.25 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 0.5, r.y + 0.45 + (Math.cos(seed * 1.7) * 0.5 + 0.5) * 0.3, r.z + 0.25 + (Math.cos(seed * 3.3) * 0.5 + 0.5) * 0.5);
        sc.setScalar(s * 0.7);
        e.set(0, 0, ph * 1.2);
        m.compose(p, q.clone().multiply(new THREE.Quaternion().setFromEuler(e)), sc);
        this.sparkles.pushMatrix(m);
      }
    }
    this.sparkles.end();
    const moving = !reduced && amount > 0;
    // butterflies: loops around points near the middle of the view
    this.wings.begin();
    const nb = moving && this.season !== 'winter' ? Math.round(7 * amount) : 0;
    for (let i = 0; i < nb; i++) {
      const hx = Math.floor(v.x / 6) * 6 + ((i * 2.7) % 9) - 3, hz = Math.floor(v.z / 6) * 6 + ((i * 4.1) % 9) - 4;
      const a = t * (0.5 + (i % 3) * 0.12) + i * 1.7;
      const x = hx + Math.sin(a) * 1.6 + Math.sin(a * 2.3) * 0.4, z = hz + Math.sin(a * 0.8 + i) * 1.3;
      const y = groundY(x, z) + 0.45 + Math.sin(a * 3.1) * 0.15;
      const heading = Math.atan2(Math.cos(a) * 1.6, Math.cos(a * 0.8 + i) * 1.04);
      const flap = Math.sin(t * 22 + i * 3) * 0.9;
      const col = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length]!;
      for (const side of [-1, 1]) {
        e.set(0, heading, side * (0.3 + flap), 'YXZ');
        q.setFromEuler(e);
        sc.set(side, 1, 1);
        m.compose(p.set(x, y, z), q, sc);
        this.wings.pushMatrix(m, col);
      }
    }
    this.wings.end();
    // birds: a little flock crosses the sky now and then
    this.birds.begin();
    if (moving) {
      const cycle = 34, k = (t % cycle) / cycle;
      if (k < 0.45) {
        const along = (k / 0.45) * 70 - 35, side = Math.floor(t / cycle) % 2 ? 1 : -1;
        for (let i = 0; i < 4; i++) {
          const bx = v.x + along * side + (i % 2 ? -0.6 : 0.6) * i * 0.5, bz = v.z - 6 + i * 0.7 + Math.sin(t + i) * 0.2;
          e.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
          q.setFromEuler(e);
          sc.set(1.4, 1 + Math.sin(t * 9 + i) * 0.8, 1.4);
          m.compose(p.set(bx, 5.5 + i * 0.25, bz), q, sc);
          this.birds.pushMatrix(m);
        }
      }
    }
    this.birds.end();
    // autumn leaves drifting down around the view
    this.leaves.begin();
    if (moving && this.season === 'autumn') {
      const n = Math.round(24 * amount);
      for (let i = 0; i < n; i++) {
        const f = (t * 0.09 + i / n) % 1;
        const x = v.x + Math.sin(i * 12.9) * 9 + Math.sin(t * 0.7 + i) * 0.6 + f * 1.5, z = v.z + Math.cos(i * 7.3) * 6;
        const y = groundY(x, z) + 3.2 * (1 - f) + 0.05;
        e.set(t * 2 + i, t * 1.3 + i, t * 1.7);
        q.setFromEuler(e);
        m.compose(p.set(x, y, z), q, sc.setScalar(1));
        this.leaves.pushMatrix(m, LEAF_COLORS[i % LEAF_COLORS.length]);
      }
    }
    this.leaves.end();
    this.helpers.update(dt, reduced);
  }
}
