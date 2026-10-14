/**
 * The wild land around the farm: woods, bushes, rocks, reeds by the water, and tufts of grass and
 * flowers. Placed from a fixed noise, so every farm's surroundings look the same. Trees keep two tiles
 * away from farm land so they never hide a tile you might want to tap.
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import type { Season } from '../sim/clock';
import { areaAt, H, STEP_Y, tileAt, W } from '../sim/map';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { bush, flowerTuft, grassTuft, pineTree, reeds, rock, roundTree } from './models/nature';
import { SEASON_PALETTES } from './palette';

/** Tiles of wild land to the nearest farm tile (BFS over the grid). */
function farmDistance(): Int16Array {
  const dist = new Int16Array(W * H).fill(-1);
  const queue: number[] = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (areaAt(x, z)) { dist[z * W + x] = 0; queue.push(z * W + x); }
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!, x = c % W, z = (c / W) | 0;
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]] as const) {
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || dist[nz * W + nx]! >= 0) continue;
      dist[nz * W + nx] = dist[c]! + 1;
      queue.push(nz * W + nx);
    }
  }
  return dist;
}
const DIST = farmDistance();

const nearWater = (x: number, z: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => {
  const nx = x + dx!, nz = z + dz!;
  return nx >= 0 && nz >= 0 && nx < W && nz < H && tileAt(nx, nz).water;
});

export class Scenery {
  readonly group = new THREE.Group();
  private layers: InstancedLayer[] = [];

  build(season: Season, density: number) {
    for (const l of this.layers) { l.dispose(); l.mesh.geometry.dispose(); }
    this.layers = [];
    const pal = SEASON_PALETTES[season];
    const make = (geo: THREE.BufferGeometry, shadow = true) => {
      const l = new InstancedLayer(geo, Materials.flatInst, 64, { shadow, receive: true });
      this.layers.push(l);
      this.group.add(l.mesh);
      l.begin();
      return l;
    };
    const trees = [make(roundTree(pal, 0)), make(roundTree(pal, 1)), make(pineTree(pal))];
    const bushes = make(bush(pal)), rocks = make(rock()), reed = make(reeds(), false);
    const tufts = make(grassTuft(pal), false);
    const flowers = pal.flower.map(c => make(flowerTuft(pal, c), false));

    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = tileAt(x, z);
        if (t.water) continue;
        const y = t.level * STEP_Y;
        const n = noise(x, z, 3), n2 = noise(x, z, 4), n3 = noise(x, z, 5);
        const jx = x + 0.3 + n2 * 0.4, jz = z + 0.3 + n3 * 0.4, rot = n * Math.PI * 2;
        const wildish = t.zone === 'wild' || t.zone === 'bank';
        if (wildish && nearWater(x, z) && n < 0.55) { reed.push(jx, y, jz, rot, 0.9 + n2 * 0.4); continue; }
        if (!wildish) continue;
        const d = DIST[z * W + x]!;
        if (t.zone === 'bank') {
          if (x === W - 1 && n < 0.45) trees[2]!.push(jx, y, jz, rot, 0.75 + n2 * 0.2);
          else if (n < 0.3 * density) bushes.push(jx, y, jz, rot, 0.8);
          else if (n < 0.6 * density) tufts.push(jx, y, jz, rot, 1);
          continue;
        }
        // no trees along the south edge: it is in front of the farm from the usual view
        if (d >= 2 && z < H - 2 && n < 0.62) {
          const kind = t.level >= 2 ? (n2 < 0.6 ? 2 : 0) : n2 < 0.3 ? 2 : n2 < 0.65 ? 0 : 1;
          trees[kind]!.push(jx, y, jz, rot, 0.85 + n3 * 0.45);
        } else if (n < 0.75) bushes.push(jx, y, jz, rot, 0.8 + n3 * 0.4);
        else if (n < 0.8) rocks.push(jx, y, jz, rot, 0.8 + n3 * 0.5);
        else if (n3 < density * 0.7) (n2 < 0.4 ? flowers[Math.floor(n2 * 10) % flowers.length]! : tufts).push(jx, y, jz, rot, 1);
      }
    }
    for (const l of this.layers) l.end();
  }
}
