/**
 * The Bay Festival's night: strings of paper lanterns along the streets round the festival stage
 * (or City Hall), kites dancing over the beach, and soft fireworks blooming over the bay. Only on
 * while the festival scene plays (and in the showcase capture). With reduced motion the lanterns
 * and kites stay still and there are no fireworks.
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';
import { H, inMap, seaEdge, W } from '../sim/map';
import { isRoad } from '../sim/roads';
import type { Town } from '../sim/state';
import { centerOf } from '../sim/world';

const LANTERN_COLORS = [0xff7a5c, 0xffd34d, 0x4fd1c5, 0xff9fd0, 0xb59cff, 0x8fe07a];
const KITE_COLORS = [0xef6a55, 0xffc23d, 0x2fa3b0, 0xb08ae0, 0x5fbf7a, 0xff8a5a];
const MAX_LANTERNS = 220, KITES = 9, BURSTS = 4, SPARKS = 70;

interface Kite { x: number; z: number; y: number; phase: number; color: number }
interface Burst { x: number; y: number; z: number; t: number; color: THREE.Color; dirs: Float32Array }

export class FestivalView {
  readonly group = new THREE.Group();
  private lanterns: THREE.InstancedMesh;
  private halos: THREE.InstancedMesh;
  private kites: THREE.InstancedMesh;
  private tails: THREE.InstancedMesh;
  private sparks: THREE.Points;
  private sparkPos: Float32Array;
  private sparkCol: Float32Array;
  private kiteList: Kite[] = [];
  private bursts: Burst[] = [];
  private rng = new Rng(2026);
  private t = 0;
  private nextBurst = 0;
  private burstCount = 0;
  private key = '';
  on = false;

  constructor() {
    this.group.name = 'festival';
    this.group.visible = false;
    // paper lanterns: round, glowing in their own colour (bloom picks them up at night)
    const lantern = new THREE.SphereGeometry(0.1, 10, 8).scale(1, 1.25, 1);
    this.lanterns = new THREE.InstancedMesh(lantern, new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_LANTERNS);
    this.lanterns.count = 0;
    // a soft glow round each lantern
    this.halos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), MAX_LANTERNS);
    this.halos.count = 0;
    // a kite: a diamond with a cross spar; its tail is a ribbon below
    const kite = new THREE.BufferGeometry();
    kite.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.32, 0, 0.2, 0.05, 0, 0, -0.3, 0, -0.2, 0.05, 0], 3));
    kite.setIndex([0, 1, 2, 0, 2, 3]);
    kite.computeVertexNormals();
    this.kites = new THREE.InstancedMesh(kite, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), KITES);
    const tail = new THREE.PlaneGeometry(0.03, 0.9).translate(0, -0.75, 0);
    this.tails = new THREE.InstancedMesh(tail, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), KITES);
    // firework sparks
    this.sparkPos = new Float32Array(BURSTS * SPARKS * 3);
    this.sparkCol = new Float32Array(BURSTS * SPARKS * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.sparks = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, map: glowDot(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.sparks.frustumCulled = false;
    for (const m of [this.lanterns, this.halos, this.kites, this.tails]) m.frustumCulled = false;
    this.group.add(this.lanterns, this.halos, this.kites, this.tails, this.sparks);
  }

  /** Turn the festival on or off, hanging lanterns round the stage (or City Hall) in this town. */
  set(town: Town, on: boolean) {
    this.on = on;
    this.group.visible = on;
    if (!on) return;
    const key = `${town.version}`;
    if (key === this.key) return;
    this.key = key;
    const heart = town.things.find(t => t.def === 'stage') ?? town.things.find(t => t.def === 'cityhall');
    const c = heart ? centerOf(heart) : { x: 40, z: 10 };
    // the road tiles nearest the heart of the festival
    const tiles: [number, number, number][] = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (isRoad(town, x, z)) tiles.push([x, z, Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z)]);
    tiles.sort((a, b) => a[2] - b[2]);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let n = 0;
    for (const [x, z] of tiles) {
      if (n >= MAX_LANTERNS - 1) break;
      // a string across the street: two lanterns over each sidewalk, and one over the middle
      const ns = isRoad(town, x, z - 1) || isRoad(town, x, z + 1);
      for (const k of [0.12, 0.5, 0.88]) {
        if (n >= MAX_LANTERNS) break;
        const px = ns ? x + k : x + 0.5, pz = ns ? z + 0.5 : z + k;
        m.makeTranslation(px, 0.95 + Math.sin(k * Math.PI) * -0.12, pz);
        this.lanterns.setMatrixAt(n, m);
        this.halos.setMatrixAt(n, m);
        col.setHex(LANTERN_COLORS[(x + z * 3 + Math.round(k * 4)) % LANTERN_COLORS.length]!);
        this.lanterns.setColorAt(n, col);
        this.halos.setColorAt(n, col);
        n++;
      }
    }
    this.lanterns.count = this.halos.count = n;
    for (const l of [this.lanterns, this.halos]) { l.instanceMatrix.needsUpdate = true; if (l.instanceColor) l.instanceColor.needsUpdate = true; }
    // kites over the beach in front of town
    this.kiteList = [];
    for (let i = 0; i < KITES; i++) {
      const x = c.x - 12 + (24 * i) / (KITES - 1) + this.rng.float() * 1.5;
      const z = inMap(Math.round(x), 0) ? seaEdge(x) + 0.6 : 1.5;
      this.kiteList.push({ x, z, y: 2.2 + this.rng.float() * 1.3, phase: this.rng.float() * 6.28, color: KITE_COLORS[i % KITE_COLORS.length]! });
    }
    for (let i = 0; i < KITES; i++) { this.kites.setColorAt(i, col.setHex(this.kiteList[i]!.color)); this.tails.setColorAt(i, col.setHex(0xfff4dc)); }
    this.bursts = [];
    this.nextBurst = 0.5;
    this.place(0);
  }

  private place(t: number) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    this.kiteList.forEach((k, i) => {
      const sway = Math.sin(t * 0.9 + k.phase);
      p.set(k.x + sway * 0.5, k.y + Math.sin(t * 1.3 + k.phase) * 0.25, k.z - 1.5 + Math.cos(t * 0.7 + k.phase) * 0.3);
      q.setFromEuler(e.set(-0.5, 0, sway * 0.35));
      m.compose(p, q, s);
      this.kites.setMatrixAt(i, m);
      q.setFromEuler(e.set(-0.5 + Math.sin(t * 2.4 + k.phase) * 0.2, 0, sway * 0.6));
      m.compose(p, q, s);
      this.tails.setMatrixAt(i, m);
    });
    this.kites.instanceMatrix.needsUpdate = true;
    this.tails.instanceMatrix.needsUpdate = true;
    if (this.kites.instanceColor) this.kites.instanceColor.needsUpdate = true;
    if (this.tails.instanceColor) this.tails.instanceColor.needsUpdate = true;
  }

  update(dt: number, reducedMotion: boolean, center: { x: number; z: number }) {
    if (!this.on) return;
    if (reducedMotion) { this.sparks.visible = false; return; }
    this.sparks.visible = true;
    this.t += dt;
    this.place(this.t);
    // a new firework every couple of seconds, over the bay in front of the view
    this.nextBurst -= dt;
    if (this.nextBurst <= 0) {
      this.nextBurst = 1.4 + this.rng.float() * 1.6;
      const dirs = new Float32Array(SPARKS * 3);
      for (let i = 0; i < SPARKS; i++) {
        const u = this.rng.float() * 2 - 1, a = this.rng.float() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        dirs[i * 3] = r * Math.cos(a); dirs[i * 3 + 1] = u; dirs[i * 3 + 2] = r * Math.sin(a);
      }
      // spread across the view in turn, each a different colour
      const k = this.burstCount++;
      const color = new THREE.Color(LANTERN_COLORS[k % LANTERN_COLORS.length]!);
      const across = [-6, 3, -1.5, 6.5, -4, 1][k % 6]! + (this.rng.float() - 0.5) * 2;
      // over the town between the stage and the beach, high enough to bloom above the roofs
      this.bursts.push({ x: center.x + across, y: 5.5 + this.rng.float() * 2, z: center.z + 1 - this.rng.float() * 5, t: 0, color, dirs });
      if (this.bursts.length > BURSTS) this.bursts.shift();
    }
    this.sparkPos.fill(0);
    this.sparkCol.fill(0);
    this.bursts.forEach((b, k) => {
      b.t += dt;
      const r = 4 * (1 - Math.exp(-b.t * 2.4)), fall = 0.3 * b.t * b.t, fade = Math.max(0, 1 - b.t / 2.4) * 1.6;
      for (let i = 0; i < SPARKS; i++) {
        const o = (k * SPARKS + i) * 3;
        this.sparkPos[o] = b.x + b.dirs[i * 3]! * r;
        this.sparkPos[o + 1] = b.y + b.dirs[i * 3 + 1]! * r - fall;
        this.sparkPos[o + 2] = b.z + b.dirs[i * 3 + 2]! * r;
        this.sparkCol[o] = b.color.r * fade; this.sparkCol[o + 1] = b.color.g * fade; this.sparkCol[o + 2] = b.color.b * fade;
      }
    });
    const g = this.sparks.geometry;
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** A soft round dot for the sparks (made in code: a radial falloff in a tiny texture). */
function glowDot(): THREE.DataTexture {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
    const a = Math.max(0, 1 - d) ** 2;
    const o = (y * n + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = 255;
    data[o + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}
