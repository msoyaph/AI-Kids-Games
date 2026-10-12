// World-side visuals for fishing (shadows, bobber, line, ripples), bugs, held catches and weather.
import * as THREE from 'three';
import { BUG_BY_ID, FISH_BY_ID } from '../data/registry';
import { bugRT } from '../sim/bugs';
import { fishingRT } from '../sim/fishing';
import type { Game } from '../sim/game';
import { facingVec } from '../sim/player';
import { curved } from './curve';
import { buildBug, buildFish, flapWings, type BugModel } from './models/creatures';
import { WATER_Y } from './terrain';

const shadowMat = curved(new THREE.MeshBasicMaterial({ color: 0x1d3a4a, transparent: true, opacity: 0.38, depthWrite: false }));
const rippleMat = () => curved(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));

export class CritterView {
  readonly group = new THREE.Group();
  private shadows: THREE.Mesh[] = [];
  private bobber: THREE.Group;
  private line: THREE.Line;
  private ripples: { m: THREE.Mesh; t: number }[] = [];
  private bugs = new Map<number, BugModel>();
  private held: THREE.Object3D | null = null;
  private heldId = '';
  private rain: THREE.InstancedMesh;
  private rainPos: Float32Array;
  private snow: THREE.InstancedMesh;
  private snowPos: Float32Array;
  private rainbow: THREE.Group;
  private dummy = new THREE.Object3D();
  private exclaim: THREE.Mesh;
  private time = 0;

  constructor(private game: Game) {
    const sg = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(sg, shadowMat);
      m.visible = false;
      m.renderOrder = 3;
      this.shadows.push(m);
      this.group.add(m);
    }
    this.bobber = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), curved(new THREE.MeshLambertMaterial({ color: 0xf26b6b })));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), curved(new THREE.MeshLambertMaterial({ color: 0xffffff })));
    this.bobber.add(top, bot);
    this.bobber.visible = false;
    this.group.add(this.bobber);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.line = new THREE.Line(lg, curved(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
    this.line.frustumCulled = false;
    this.line.visible = false;
    this.group.add(this.line);
    const rg = new THREE.RingGeometry(0.85, 1, 20).rotateX(-Math.PI / 2);
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(rg, rippleMat());
      m.visible = false;
      m.renderOrder = 4;
      this.ripples.push({ m, t: 1 });
      this.group.add(m);
    }
    // "!" bite indicator
    const ex = new THREE.Group();
    void ex;
    this.exclaim = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.42, 0.06).translate(0, 0.32, 0),
      curved(new THREE.MeshBasicMaterial({ color: 0xffd166 })),
    );
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), this.exclaim.material);
    this.exclaim.add(dot);
    this.exclaim.visible = false;
    this.group.add(this.exclaim);
    // rain
    const RAIN = 700;
    this.rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.55, 0.025), curved(new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55 })), RAIN);
    this.rain.frustumCulled = false;
    this.rainPos = new Float32Array(RAIN * 3);
    for (let k = 0; k < RAIN; k++) {
      this.rainPos[k * 3] = (Math.random() - 0.5) * 50;
      this.rainPos[k * 3 + 1] = Math.random() * 14;
      this.rainPos[k * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    this.rain.visible = false;
    this.group.add(this.rain);
    // snow
    const SNOW = 360;
    this.snow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), curved(new THREE.MeshBasicMaterial({ color: 0xffffff })), SNOW);
    this.snow.frustumCulled = false;
    this.snowPos = new Float32Array(SNOW * 3);
    for (let k = 0; k < SNOW; k++) {
      this.snowPos[k * 3] = (Math.random() - 0.5) * 46;
      this.snowPos[k * 3 + 1] = Math.random() * 12;
      this.snowPos[k * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    this.snow.visible = false;
    this.group.add(this.snow);
    // rainbow arc (sky)
    this.rainbow = new THREE.Group();
    const cols = [0xf27c7c, 0xffa45c, 0xffe066, 0x8fd18a, 0x7fb2ff, 0xb48cf0];
    cols.forEach((c, k) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(34 - k * 0.9, 0.45, 4, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, fog: false, depthWrite: false }));
      this.rainbow.add(t);
    });
    this.rainbow.visible = false;
    this.group.add(this.rainbow);
    game.bus.on('fx', (f) => {
      if (f.kind === 'ripple' || f.kind === 'bite' || f.kind === 'splash') this.ripple(f.x, f.z, f.kind === 'bite' || f.kind === 'splash' ? 1.4 : 0.8);
    });
  }

  private ripple(x: number, z: number, size: number): void {
    const r = this.ripples.find((q) => q.t >= 1) ?? this.ripples[0]!;
    r.t = 0;
    r.m.position.set(x, WATER_Y + 0.03, z);
    r.m.userData.size = size;
    r.m.visible = true;
  }

  frame(dt: number, camTarget: THREE.Vector3, night: number): void {
    const g = this.game;
    this.time += dt;
    const onIsland = g.state.player.location === 'island';
    this.group.visible = onIsland;
    if (!onIsland) return;
    const fr = fishingRT(g);
    // shadows
    this.shadows.forEach((m, k) => {
      const s = fr.shadows[k];
      if (!s || s.state === 'gone') {
        m.visible = false;
        return;
      }
      m.visible = true;
      const wob = Math.sin(this.time * 3 + s.id) * 0.04;
      m.position.set(s.x, WATER_Y + 0.02, s.z);
      m.rotation.y = s.heading;
      m.scale.set(0.16 + s.size * 0.07 + wob, 1, 0.3 + s.size * 0.13);
    });
    // bobber + line
    const c = fr.cast;
    const p = g.state.player;
    if (c && c.phase !== 'caught' && c.phase !== 'escaped') {
      const [fx, fz] = facingVec(p.facing);
      const py = g.world.surfaceY(p.x, p.z);
      const tip = new THREE.Vector3(p.x + fx * 1.1, py + 1.75, p.z + fz * 1.1);
      let bx = c.x, bz = c.z, by = WATER_Y + 0.02;
      if (c.phase === 'flying') {
        const t = Math.min(1, c.t / 0.45);
        bx = tip.x + (c.x - tip.x) * t;
        bz = tip.z + (c.z - tip.z) * t;
        by = tip.y + (WATER_Y - tip.y) * t + Math.sin(t * Math.PI) * 1.2;
      } else {
        by += Math.sin(this.time * 2.5) * 0.02;
        if (c.phase === 'nibble' && c.nextEvent > 0 && c.nextEvent < 0.15) by -= 0.06;
        if (c.phase === 'bite') by -= 0.16;
        if (c.phase === 'reel') {
          by -= 0.12;
          bx += Math.sin(this.time * 13) * 0.08;
        }
      }
      this.bobber.visible = true;
      this.bobber.position.set(bx, by, bz);
      this.line.visible = true;
      const pos = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, tip.x, tip.y, tip.z);
      pos.setXYZ(1, bx, by + 0.05, bz);
      pos.needsUpdate = true;
      this.exclaim.visible = c.phase === 'bite';
      if (this.exclaim.visible) {
        this.exclaim.position.set(bx, by + 0.6 + Math.sin(this.time * 20) * 0.05, bz);
        this.exclaim.scale.setScalar(1 + Math.max(0, 0.3 - c.t) * 2);
      }
    } else {
      this.bobber.visible = false;
      this.line.visible = false;
      this.exclaim.visible = false;
    }
    // ripples
    for (const r of this.ripples) {
      if (r.t >= 1) {
        r.m.visible = false;
        continue;
      }
      r.t += dt * 1.1;
      const s = (0.15 + r.t * 0.9) * (r.m.userData.size ?? 1);
      r.m.scale.set(s, 1, s);
      (r.m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - r.t);
    }
    // bugs
    const br = bugRT(g);
    const live = new Set<number>();
    for (const b of br.bugs) {
      live.add(b.id);
      let m = this.bugs.get(b.id);
      if (!m) {
        const def = BUG_BY_ID[b.bug];
        if (!def) continue;
        m = buildBug(def);
        m.group.scale.setScalar(def.shape === 'butterfly' || def.shape === 'moth' ? 1.3 : 1.15);
        this.group.add(m.group);
        this.bugs.set(b.id, m);
      }
      m.group.position.set(b.x, b.y, b.z);
      const moving = b.state === 'flee' || b.habitat === 'air';
      if (b.habitat === 'trees') m.group.rotation.set(-Math.PI / 2.2, 0, 0);
      else if (b.state === 'flee') m.group.rotation.y = Math.atan2(b.vx, b.vz);
      else m.group.rotation.y = b.phase * (b.habitat === 'air' ? 0.6 : 0.05);
      flapWings(m, this.time + b.id, moving ? 30 : b.habitat === 'flowers' ? 6 : 0);
      // glow-in-the-dark fireflies read better at night
      m.group.visible = true;
    }
    for (const [id, m] of this.bugs)
      if (!live.has(id)) {
        this.group.remove(m.group);
        this.bugs.delete(id);
      }
    // held catch above the head during the fanfare
    const a = g.action;
    const lastFish = fr.lastCatch;
    const lastBug = g.runtime.lastBug as string | undefined;
    if (a && a.kind === 'celebrate') {
      const id = (g.runtime.lastCatchId as string) ?? lastFish?.id ?? lastBug ?? '';
      if (id !== this.heldId) {
        if (this.held) this.group.remove(this.held);
        this.held = null;
        const fd = FISH_BY_ID[id];
        const bd = BUG_BY_ID[id];
        if (fd) {
          this.held = buildFish(fd);
          this.held.rotation.set(0, Math.PI / 2, 0.3);
        } else if (bd) {
          this.held = buildBug(bd).group;
          this.held.scale.setScalar(2.2);
        }
        if (this.held) this.group.add(this.held);
        this.heldId = id;
      }
      if (this.held) {
        const py = g.world.surfaceY(p.x, p.z);
        this.held.position.set(p.x, py + 2.25 + Math.sin(a.t * 6) * 0.05, p.z + 0.05);
        this.held.visible = true;
      }
    } else if (this.held) {
      this.held.visible = false;
      this.heldId = '';
    }
    // weather
    const w = g.state.weather.today;
    const winter = (g.state.season?.index ?? 0) === 3;
    this.rain.visible = w === 'rain' && !winter;
    // winter: snow when it would rain, light flurries when cloudy
    const flakes = winter ? (w === 'rain' ? this.snow.instanceMatrix.count : w === 'cloudy' ? 110 : 0) : 0;
    this.snow.visible = flakes > 0;
    if (this.snow.visible) {
      this.snow.count = flakes;
      for (let k = 0; k < flakes; k++) {
        let y = this.snowPos[k * 3 + 1]! - dt * 1.4;
        if (y < -0.3) y += 12;
        this.snowPos[k * 3 + 1] = y;
        const sway = Math.sin(this.time * 0.9 + k) * 0.35;
        this.dummy.position.set(camTarget.x + this.snowPos[k * 3]! + sway, camTarget.y + y, camTarget.z + this.snowPos[k * 3 + 2]! - 6);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.snow.setMatrixAt(k, this.dummy.matrix);
      }
      this.snow.instanceMatrix.needsUpdate = true;
    }
    if (this.rain.visible) {
      for (let k = 0; k < this.rain.count; k++) {
        let y = this.rainPos[k * 3 + 1]! - dt * 16;
        if (y < -0.5) y += 14;
        this.rainPos[k * 3 + 1] = y;
        this.dummy.position.set(camTarget.x + this.rainPos[k * 3]!, camTarget.y + y, camTarget.z + this.rainPos[k * 3 + 2]! - 6);
        this.dummy.rotation.set(0, 0, 0.15);
        this.dummy.updateMatrix();
        this.rain.setMatrixAt(k, this.dummy.matrix);
      }
      this.rain.instanceMatrix.needsUpdate = true;
    }
    this.rainbow.visible = w === 'rainbow' && night < 0.5;
    if (this.rainbow.visible) {
      this.rainbow.position.set(camTarget.x + 6, camTarget.y - 14, camTarget.z - 62);
      this.rainbow.children.forEach((m) => (((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - night * 2)));
    }
  }
}
