/**
 * Larkford's square in 3D: the shops and the jetty (one static mesh), your farm stand with a crate on
 * it for every stocked shelf (tinted by what's in it), and a few townsfolk strolling between the shops
 * and the stand. It sits south of the farm, so it is only drawn when the camera pans down to it.
 */
import * as THREE from 'three';
import { PEOPLE } from '../data/cast';
import { ITEMS } from '../data/items';
import { shelves, standOpen } from '../sim/stand';
import type { Farm } from '../sim/state';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { person } from './models/town';
import { squareModel, standCrate, standModel, STAND_AT, STAND_SPOTS } from './models/square';

/** Where townsfolk walk: shop doors, the stand, the fountain and the jetty. */
const SPOTS: [number, number][] = [[39.6, 62.0], [44.4, 61.6], [39.4, 66.3], [39.4, 67.3], [45.6, 66.6], [44.6, 64.7], [47.2, 64.3], [43.0, 68.4]];

export class TownSquare {
  readonly group = new THREE.Group();
  private stand: THREE.Mesh;
  private crates = new InstancedLayer(standCrate(), Materials.flatTintInst, 10, { shadow: true, receive: true });
  private folk: { mesh: THREE.Mesh; from: number; to: number; t: number; speed: number; wait: number }[] = [];
  private key = '';

  constructor() {
    const square = new THREE.Mesh(squareModel(), Materials.flat);
    square.castShadow = true;
    square.receiveShadow = true;
    this.stand = new THREE.Mesh(standModel(), Materials.flat);
    this.stand.castShadow = true;
    this.group.add(square, this.stand, this.crates.mesh);
    // townsfolk in the colours of the people who live there
    const who = PEOPLE.filter(p => p.id !== 'hattie').slice(0, 4);
    who.forEach((p, i) => {
      const mesh = new THREE.Mesh(person(p.color), Materials.smooth);
      mesh.castShadow = true;
      this.group.add(mesh);
      this.folk.push({ mesh, from: i * 2 % SPOTS.length, to: (i * 2 + 3) % SPOTS.length, t: i * 0.3, speed: 0.55 + i * 0.07, wait: 0 });
    });
  }

  update(farm: Farm, dt: number, reduced: boolean) {
    const open = standOpen(farm);
    this.stand.visible = open;
    // a crate on the stand for each stocked shelf
    const list = open ? shelves(farm) : [];
    const key = list.map(s => (s.item && s.n > 0 ? s.item : '')).join(',');
    if (key !== this.key) {
      this.key = key;
      this.crates.begin();
      list.forEach((s, i) => {
        if (!s.item || s.n <= 0) return;
        const [ox, oz] = STAND_SPOTS[i % STAND_SPOTS.length]!;
        this.crates.push(STAND_AT.x + ox, STAND_AT.y, STAND_AT.z + oz, 0, 1, ITEMS[s.item]?.color ?? 0xffffff);
      });
      this.crates.end();
    }
    // townsfolk stroll from spot to spot, pausing to look around
    for (const f of this.folk) {
      const a = SPOTS[f.from]!, b = SPOTS[f.to]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      if (f.wait > 0) f.wait -= dt;
      else f.t += (dt * f.speed) / len;
      if (f.t >= 1) { f.t = 0; f.from = f.to; f.to = (f.to + 3 + Math.floor(Math.random() * 3)) % SPOTS.length; if (f.to === f.from) f.to = (f.to + 1) % SPOTS.length; f.wait = 1.5 + Math.random() * 2.5; }
      const k = Math.min(1, f.t);
      const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k;
      const hop = reduced || f.wait > 0 ? 0 : Math.abs(Math.sin(f.t * len * 9)) * 0.035;
      f.mesh.position.set(x, 0.08 + hop, z);
      f.mesh.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    }
  }
}
