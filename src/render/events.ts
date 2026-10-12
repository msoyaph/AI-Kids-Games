// Event visuals on the island: festival decorations around the plaza, the frozen pond and its
// lantern rings for the Skate, shooting stars, and Wanda's stall by the dock.
import * as THREE from 'three';
import { Ground, LEVEL_HEIGHT } from '../world/types';
import type { Game } from '../sim/game';
import { festivalState, festivalToday, merchantHere, meteorsNow, pondFrozen, skateRings } from '../sim/happenings';
import { merchantSpot } from '../sim/agents';
import { curved, vcolMat } from './curve';
import { box, cone, cyl, merge, part, sphere, torus } from './models/geo';
import { WATER_Y } from './terrain';

const mat = vcolMat();
const glow = (color: number) => curved(new THREE.MeshBasicMaterial({ color }));

export class EventsView {
  readonly group = new THREE.Group();
  private decor = new THREE.Group();
  private decorKey = '';
  private ice: THREE.Mesh | null = null;
  private rings: THREE.Mesh[] = [];
  private ringKey = '';
  private stall = new THREE.Group();
  private meteors: { m: THREE.Mesh; t: number; vx: number; vy: number }[] = [];
  private meteorT = 0;
  private time = 0;

  constructor(private game: Game) {
    this.group.add(this.decor, this.stall);
    // Wanda's stall: two poles, a striped canopy and a crate of goods
    const P = [part(cyl(0.05, 0.05, 1.8, 5), 0x9b6a4a, { pos: [-0.7, 0.9, 0] }), part(cyl(0.05, 0.05, 1.8, 5), 0x9b6a4a, { pos: [0.7, 0.9, 0] }), part(box(1.7, 0.08, 1.0), 0x7cc7c2, { pos: [0, 1.8, 0.1], rot: [0.25, 0, 0] }), part(box(1.7, 0.1, 0.25), 0xfff3dc, { pos: [0, 1.72, 0.6], rot: [0.25, 0, 0] }), part(box(1.1, 0.45, 0.5), 0xc98d62, { pos: [0, 0.22, 0.2] }), part(sphere(0.12, 6, 4), 0xf27c7c, { pos: [-0.3, 0.55, 0.2] }), part(sphere(0.12, 6, 4), 0xffd966, { pos: [0, 0.55, 0.25] }), part(box(0.22, 0.16, 0.22), 0x9fd0ec, { pos: [0.32, 0.53, 0.2] })];
    const stall = new THREE.Mesh(merge(P), mat);
    stall.castShadow = true;
    this.stall.add(stall);
    this.stall.visible = false;
  }

  /** Bunting, lanterns and a banner around the plaza on festival days. */
  private buildDecor(g: Game): void {
    this.decor.clear();
    const f = festivalToday(g);
    this.decorKey = f ? `${f.id}|${g.state.clock.day}` : '';
    if (!f) return;
    const pl = g.world.gen.lots.plaza;
    const corners: [number, number][] = [
      [pl.x - 0.5, pl.z - 0.5],
      [pl.x + pl.w + 0.5, pl.z - 0.5],
      [pl.x + pl.w + 0.5, pl.z + pl.d + 0.5],
      [pl.x - 0.5, pl.z + pl.d + 0.5],
    ];
    const P: THREE.BufferGeometry[] = [];
    const L: THREE.BufferGeometry[] = [];
    for (const [x, z] of corners) P.push(part(cyl(0.06, 0.08, 2.4, 6), 0xc9945f, { pos: [x, 1.2, z] }), part(sphere(0.12, 6, 4), f.colors[1], { pos: [x, 2.45, z] }));
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k]!;
      const [bx, bz] = corners[(k + 1) % 4]!;
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.6);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const sag = Math.sin(t * Math.PI) * 0.45;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        P.push(part(cone(0.13, 0.26, 3), f.colors[i % 3]!, { pos: [x, 2.15 - sag, z], rot: [Math.PI, Math.atan2(bx - ax, bz - az), 0] }));
        if (i % 3 === 0) L.push(part(sphere(0.08, 6, 4), 0xffe6a0, { pos: [x, 2.0 - sag, z] }));
      }
    }
    if (f.id === 'harvestFeast') {
      const cx = pl.x + pl.w / 2 + 1.2, cz = pl.z + pl.d / 2 - 1.2;
      P.push(part(cyl(0.5, 0.42, 0.55, 12), 0x5b4a5e, { pos: [cx, 0.28, cz] }), part(torus(0.5, 0.05, 5, 14), 0x8a7a8a, { pos: [cx, 0.55, cz], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.44, 0.44, 0.04, 12), 0xf2953c, { pos: [cx, 0.5, cz] }));
    }
    if (f.id === 'flowerFair')
      for (const [x, z] of corners) for (let k = 0; k < 3; k++) P.push(part(sphere(0.1, 6, 4), [0xff7f9f, 0xffd966, 0xb48cf0][k]!, { pos: [x + Math.cos(k * 2) * 0.3, 0.2, z + Math.sin(k * 2) * 0.3] }));
    const m = new THREE.Mesh(merge(P), mat);
    m.castShadow = true;
    this.decor.add(m);
    if (L.length) this.decor.add(new THREE.Mesh(merge(L), glow(0xffe6a0)));
  }

  private buildIce(g: Game): void {
    const w = g.world;
    const P: THREE.BufferGeometry[] = [];
    for (let i = 0; i < w.size * w.size; i++) {
      if (w.ground(i) !== Ground.Pond) continue;
      const x = i % w.size, z = Math.floor(i / w.size);
      P.push(part(box(1.0, 0.06, 1.0), (x + z) % 2 ? 0xe8f4fb : 0xd8ecf6, { pos: [x + 0.5, WATER_Y + 0.1, z + 0.5] }));
    }
    this.ice = new THREE.Mesh(merge(P), curved(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92 })));
    this.ice.renderOrder = 3;
    this.ice.receiveShadow = true;
    this.group.add(this.ice);
  }

  frame(dt: number, camTarget: THREE.Vector3): void {
    const g = this.game;
    this.time += dt;
    const island = g.state.player.location === 'island';
    this.group.visible = island;
    if (!island) return;
    // festival decorations (rebuilt once per festival day)
    const f = festivalToday(g);
    const key = f ? `${f.id}|${g.state.clock.day}` : '';
    if (key !== this.decorKey) this.buildDecor(g);
    // the frozen pond + lantern rings
    const frozen = pondFrozen(g);
    if (frozen && !this.ice) this.buildIce(g);
    if (this.ice) this.ice.visible = frozen;
    const st = frozen ? festivalState(g) : null;
    const rk = frozen ? `frozen|${st?.got.join(',')}` : '';
    if (rk !== this.ringKey) {
      this.ringKey = rk;
      for (const r of this.rings) this.group.remove(r);
      this.rings = [];
      if (frozen)
        skateRings(g).forEach((r, k) => {
          if (st?.got.includes(`ring${k}`)) return;
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 20), glow(0xffd27a));
          ring.position.set(r.x, 0.45, r.z);
          this.rings.push(ring);
          this.group.add(ring);
        });
    }
    for (const [k, r] of this.rings.entries()) r.rotation.y = this.time * 1.2 + k;
    // Wanda's stall
    this.stall.visible = merchantHere(g);
    if (this.stall.visible) {
      const s = merchantSpot(g);
      this.stall.position.set(s.x, g.world.height(g.world.idx(Math.floor(s.x), Math.floor(s.z))) * LEVEL_HEIGHT, s.z - 1.1);
    }
    // shooting stars
    if (meteorsNow(g)) {
      this.meteorT -= dt;
      if (this.meteorT <= 0) {
        this.meteorT = 0.5 + Math.random() * 1.2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), curved(new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.9, fog: false })));
        m.position.set(camTarget.x + (Math.random() - 0.3) * 40, camTarget.y + 16 + Math.random() * 6, camTarget.z - 30 - Math.random() * 20);
        const vx = -14 - Math.random() * 8, vy = -6 - Math.random() * 3;
        m.rotation.set(0, Math.PI / 2, Math.atan2(vy, -vx));
        this.group.add(m);
        this.meteors.push({ m, t: 1.1, vx, vy });
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const s = this.meteors[i]!;
      s.t -= dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y += s.vy * dt;
      (s.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.t);
      if (s.t <= 0) {
        this.group.remove(s.m);
        s.m.geometry.dispose();
        this.meteors.splice(i, 1);
      }
    }
  }
}
