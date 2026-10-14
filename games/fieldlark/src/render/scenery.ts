/**
 * The countryside around the farm: woods on the wild land and out across the hills (thicker further
 * out, with cheap trees in the far haze), a hedge along the farm's south and west edges, bushes in
 * flower, mossy rocks, logs and stumps with toadstools, reeds and cattails along every bank, and lily
 * pads on the ponds. Placed from a fixed hash, so every farm's surroundings look the same. Trees keep
 * two tiles away from farm land so they never hide a tile you might want to tap.
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import type { Season } from '../sim/clock';
import { areaAt, H, inSquare, POND, HOME_POND, W } from '../sim/map';
import { InstancedLayer, NO_AO } from './instanced';
import { groundY, landTile, outside, SPAN, waterSdf, WORLD0 } from './land';
import { Materials } from './materials';
import { bush, forestTree, lilyPad, log, pineTree, reeds, rock, roundTree, stump, tintFor } from './models/nature';
import { SEASON_PALETTES } from './palette';

/** Tiles of wild land to the nearest farm tile (BFS over the farm's grid). */
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
let DIST: Int16Array | null = null;

const inPond = (x: number, z: number) => [POND, HOME_POND].some(p => ((x - p.cx) / p.rx) ** 2 + ((z - p.cz) / p.rz) ** 2 < 1.3);

export class Scenery {
  readonly group = new THREE.Group();
  /** Every layer culls single instances to the view (FarmView's Culler). */
  layers: InstancedLayer[] = [];

  build(season: Season, density: number) {
    for (const l of this.layers) { l.dispose(); l.mesh.geometry.dispose(); }
    this.layers = [];
    DIST ??= farmDistance();
    const pal = SEASON_PALETTES[season];
    const make = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true, noAo = false) => {
      const l = new InstancedLayer(geo, mat, 64, { shadow, receive: true, cull: true, layer: noAo ? NO_AO : undefined });
      this.layers.push(l);
      this.group.add(l.mesh);
      l.begin();
      return l;
    };
    /** Two looks from one layer: the canopy is tinted per tree by the instance colour (the season's two leaf colours). */
    const looks = [tintFor(pal.leaf), tintFor(pal.leafAlt)];
    const twoLooks = (l: InstancedLayer) => looks.map(c => ({ push: (x: number, y: number, z: number, rot: number, sc: number) => l.push(x, y, z, rot, sc, c) }));
    const tree = Materials.treeTintInst, prop = Materials.flatInst;
    const fine = make(roundTree(pal, 0, true, true), tree), lite = make(roundTree(pal, 0, false, true), tree);
    const pine = density < 0.5 ? lite : make(pineTree(pal), tree);
    const trees = [...twoLooks(fine), pine];
    const woods = [...twoLooks(lite), pine];
    const far = twoLooks(make(forestTree(pal, 0, true), tree, false, true));
    const bloom = season === 'spring' ? 0xffffff : season === 'summer' ? 0xff9fd0 : 0;
    const plainBush = make(bush(pal), tree);
    const bushes = [plainBush, density < 0.5 ? plainBush : make(bush(pal, bloom), tree)];
    const rocks = make(rock(), prop), logs = make(log(), prop), stumps = density < 0.5 ? logs : make(stump(), prop);
    const reed = make(reeds(), Materials.plantInst, false, true);
    // Low: plain pads, plain bushes, logs without stumps and round trees for pines (fewer kinds to draw)
    const low = density < 0.5;
    const plainPad = make(lilyPad(false), prop, false, true);
    const pads = [plainPad, low ? plainPad : make(lilyPad(true), prop, false, true)];

    for (let z = WORLD0; z < WORLD0 + SPAN; z++) {
      for (let x = WORLD0; x < WORLD0 + SPAN; x++) {
        const t = landTile(x, z);
        const n = noise(x, z, 3), n2 = noise(x, z, 4), n3 = noise(x, z, 5), n4 = noise(x, z, 6);
        const jx = x + 0.2 + n2 * 0.6, jz = z + 0.2 + n3 * 0.6, rot = n * Math.PI * 2;
        const d = waterSdf(jx, jz);
        // lily pads on still water (two chances a tile), reeds and a few mossy stones along every bank
        if (inPond(x + 0.5, z + 0.5)) for (const [k, ox, oz] of [[0, jx, jz], [1, x + 1 - (jx - x), z + 1 - (jz - z)]] as const) {
          const dk = waterSdf(ox, oz);
          if (dk < -0.4 && dk > -2.6 && noise(x, z, 20 + k) < 0.45 * density + 0.25) (noise(x, z, 30 + k) < 0.3 ? pads[1] : pads[0])!.push(ox, -0.17, oz, rot + k * 2, 0.75 + noise(x, z, 40 + k) * 0.6);
        }
        if (t.water) continue;
        // the town square stays clear (its own trees and planters are part of it)
        if (inSquare(x + 0.5, z + 0.5, 1.2)) continue;
        // Low keeps the farm and its edges as they are and thins the far countryside
        const out0 = outside(x + 0.5, z + 0.5);
        if (d < 0.7 && d > -0.15) {
          if (low && out0 > 1 && n2 < 0.5) continue;
          if (inPond(jx, jz) && n3 > 0.78) rocks.push(jx, groundY(jx, jz) - 0.04, jz, rot, 0.6 + n2 * 0.5);
          if (n < 0.75) reed.push(jx, groundY(jx, jz) - 0.03, jz, rot, 0.85 + n2 * 0.5);
          if (n4 < 0.4) { const kx = x + 0.5 + (n4 - 0.2) * 1.5, kz = z + 0.5 + (n3 - 0.5); if (waterSdf(kx, kz) > -0.1 && waterSdf(kx, kz) < 0.8) reed.push(kx, groundY(kx, kz) - 0.03, kz, rot + 1, 0.7 + n3 * 0.4); }
          continue;
        }
        const inMap = x >= 0 && z >= 0 && x < W && z < H;
        if (inMap && t.zone !== 'wild' && t.zone !== 'bank') continue;
        const y = groundY(jx, jz) - 0.03;
        const dFarm = inMap ? DIST![z * W + x]! : 2 + outside(x + 0.5, z + 0.5);
        const out = outside(x + 0.5, z + 0.5);
        // a hedge along the south and west edges of the farm
        if (inMap && ((z === H - 1 && x < 50) || (x === 0 && z > 35))) { bushes[0]!.push(x + 0.5, groundY(x + 0.5, z + 0.5) - 0.02, z + 0.5, rot, 1.05 + n2 * 0.25); continue; }
        if (out > 9) {
          // the far woods: thick, cheap and hazy (bigger trees, fewer of them)
          if (n < (low ? 0.2 : 0.42 * Math.max(0.6, density))) far[n2 < 0.5 ? 0 : 1]!.push(jx, y, jz, rot, low ? 1.4 + n3 * 0.6 : 1.15 + n3 * 0.55);
          continue;
        }
        if (low && (out > 3 || dFarm >= 5) && n4 > 0.4) continue;
        // keep the first two tiles south of the farm low (they are in front of the camera)
        const front = z >= H && out < 3;
        const treeChance = (dFarm < 2 || front ? 0 : out > 3 ? 0.55 : 0.42) * Math.max(0.6, density);
        const bushTop = treeChance + (low && dFarm >= 3 ? 0.12 * density + 0.02 : 0.22 * density + 0.04);
        if (n < treeChance) {
          // Low: the cheap far-wood trees from a few tiles out
          if (low && out > 3) { far[n2 < 0.5 ? 0 : 1]!.push(jx, y, jz, rot, 1.0 + n3 * 0.5); continue; }
          const kind = t.level >= 2 || out > 5 ? (n2 < 0.55 ? 2 : n2 < 0.8 ? 0 : 1) : n2 < 0.25 ? 2 : n2 < 0.65 ? 0 : 1;
          // near the farm the rounder trees; further out the lighter ones
          (out > 2 || (low && (out > 0 || dFarm >= 4)) ? woods : trees)[kind]!.push(jx, y, jz, rot, 0.85 + n3 * 0.45);
        } else if (low && out > 3) continue;
        else if (n < bushTop) (n4 < 0.35 ? bushes[1] : bushes[0])!.push(jx, y, jz, rot, 0.75 + n3 * 0.5);
        else if (low && out > 0) continue;
        else if (n < bushTop + 0.05 * density + 0.02) rocks.push(jx, y + 0.02, jz, rot, 0.7 + n3 * 0.7);
        else if (n < bushTop + 0.1 * density + 0.03) (n4 < 0.5 ? logs : stumps).push(jx, y + 0.02, jz, rot, 0.85 + n3 * 0.3);
      }
    }
    for (const l of this.layers) l.end();
  }
}
