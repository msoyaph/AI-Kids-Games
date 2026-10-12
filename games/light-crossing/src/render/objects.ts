// Renders all tile objects (trees, rocks, flowers, items...) through instanced layers.
import * as THREE from 'three';
import { hash01 } from '../core/rng';
import { FRUITS, COCONUT } from '../data/fruit';
import { Ground, LEVEL_HEIGHT } from '../world/types';
import type { World } from '../sim/world';
import { InstancedLayer } from './instanced';
import { natureGeo } from './models/nature';
import { PAL, FLOWER_COLORS, SEASON_PALETTES, type SeasonPalette } from './palette';
import { vcolMat } from './curve';
import { furnitureObject } from './interior';

export const FLOWER_COLOR_ORDER = ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'];

export type ItemVisual = (id: string) => { shape: 'branch' | 'shell' | 'bundle' | 'bottle' | 'fruit' | 'stone'; color: number };

export class ObjectRenderer {
  readonly group = new THREE.Group();
  private layers: Record<string, InstancedLayer> = {};
  private decor = new THREE.Group();
  private decorMap = new Map<number, { key: string; obj: THREE.Object3D }>();
  dirty = true;
  private P: SeasonPalette = SEASON_PALETTES.summer;
  private season = 'summer';
  /** quality: share of grass tufts drawn, and whether canopies sway */
  private grassDensity = 1;
  private plainMat: THREE.Material;
  private treeMat: THREE.Material;

  constructor(private world: World, private itemVisual: ItemVisual) {
    const mat = vcolMat();
    const sway = vcolMat({ sway: true });
    this.plainMat = mat;
    this.treeMat = vcolMat({ swayTree: true });
    const L = (name: string, geo: THREE.BufferGeometry, m: THREE.Material, cap: number, shadow = true) => {
      const layer = new InstancedLayer(geo, m, cap, { shadow });
      this.layers[name] = layer;
      this.group.add(layer.mesh);
    };
    L('trunk', natureGeo.trunk(), mat, 256);
    L('canopy', natureGeo.canopy(), mat, 256);
    L('pineTrunk', natureGeo.pineTrunk(), mat, 256);
    L('pineCanopy', natureGeo.pineCanopy(), mat, 256);
    L('palm', natureGeo.palm(), mat, 64);
    L('fruit', natureGeo.fruit(), mat, 128);
    L('rock', natureGeo.rock(), mat, 32);
    L('flowerStem', natureGeo.flowerStem(), sway, 256, false);
    L('flowerPetals', natureGeo.flowerPetals(), sway, 256, false);
    L('weed', natureGeo.weed(), sway, 128, false);
    L('sapling', natureGeo.sapling(), mat, 64);
    L('dig', natureGeo.digSpot(), mat, 32, false);
    L('hole', natureGeo.hole(), mat, 32, false);
    L('stone', natureGeo.stoneChunk(), mat, 64);
    L('stick', natureGeo.stick(), mat, 64);
    L('shell', natureGeo.shell(), mat, 32);
    L('ball', natureGeo.ball(), mat, 64);
    L('bottle', natureGeo.bottle(), mat, 8);
    L('bundle', natureGeo.bundle(), mat, 32);
    L('grass', natureGeo.grass(), sway, 2048, false);
    this.group.add(this.decor);
    this.buildGrass();
  }

  /** Quality tier: grass density and canopy sway. */
  setQuality(grass: number, treeSway: boolean): void {
    for (const n of ['canopy', 'pineCanopy', 'palm']) this.layers[n]!.setMaterial(treeSway ? this.treeMat : this.plainMat);
    if (grass !== this.grassDensity) {
      this.grassDensity = grass;
      this.buildGrass();
    }
  }

  /** Recolor canopies and grass for a season. */
  setSeason(season: string): void {
    if (season === this.season) return;
    this.season = season;
    this.P = SEASON_PALETTES[season as keyof typeof SEASON_PALETTES] ?? SEASON_PALETTES.summer;
    this.buildGrass();
    this.dirty = true;
  }

  private buildGrass(): void {
    const g = this.world.gen;
    const layer = this.layers.grass!;
    layer.begin();
    const blades = this.P.blades;
    if (!blades) {
      // snow covers the grass
      layer.end();
      return;
    }
    for (let z = 0; z < g.size; z++)
      for (let x = 0; x < g.size; x++) {
        const i = z * g.size + x;
        if (g.ground[i] !== Ground.Grass) continue;
        const h = hash01(x, z, 401);
        if (h > 0.4 * this.grassDensity) continue;
        const n = h < 0.12 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const ox = hash01(x, z, 402 + k) * 0.8 + 0.1, oz = hash01(x, z, 403 + k) * 0.8 + 0.1;
          const lvl = g.height[i]!;
          const col = blades[Math.min(2, lvl)]!;
          layer.push(x + ox, lvl * LEVEL_HEIGHT, z + oz, h * 30, 0.8 + hash01(x, z, 404) * 0.5, col);
        }
      }
    layer.end();
  }

  rebuild(): void {
    this.dirty = false;
    const w = this.world;
    const N = w.size;
    const names = Object.keys(this.layers).filter((n) => n !== 'grass');
    for (const n of names) this.layers[n]!.begin();
    const Ls = this.layers;
    const seenDecor = new Set<number>();
    for (const key in w.state.world.objects) {
      const i = +key;
      const o = w.state.world.objects[i]!;
      const tx = i % N, tz = (i / N) | 0;
      const x = tx + 0.5, z = tz + 0.5;
      const y = w.height(i) * LEVEL_HEIGHT;
      const rot = hash01(i, 5) * Math.PI * 2;
      const s = 0.9 + hash01(i, 6) * 0.22;
      switch (o.k) {
        case 'tree':
        case 'fruitTree': {
          Ls.trunk!.push(x, y, z, rot, s, 0xffffff);
          const P = this.P;
          const leaf = o.k === 'fruitTree' ? (this.season === 'winter' ? 0xdfe9e2 : this.season === 'autumn' ? 0xc9c46a : 0x8ccf7d) : P.leaf[(o.v ?? 0) % P.leaf.length]!;
          Ls.canopy!.push(x, y, z, rot, s, leaf);
          if (o.k === 'fruitTree' && (o.f ?? 0) > 0) {
            const fc = FRUITS[o.v ?? 0]?.color ?? 0xffffff;
            const slots = [
              [0.52, 1.25, 0.3],
              [-0.42, 1.4, 0.42],
              [0.08, 1.2, -0.55],
            ];
            for (let k = 0; k < Math.min(3, o.f ?? 0); k++) {
              const [fx, fy, fz] = slots[k]!;
              const c = Math.cos(rot), sn = Math.sin(rot);
              Ls.fruit!.push(x + (fx! * c + fz! * sn) * s, y + fy! * s, z + (-fx! * sn + fz! * c) * s, 0, 1, fc);
            }
          }
          break;
        }
        case 'pine':
          Ls.pineTrunk!.push(x, y, z, rot, s, 0xffffff);
          Ls.pineCanopy!.push(x, y, z, rot, s, this.P.pine[(o.v ?? 0) % this.P.pine.length]!);
          break;
        case 'palm': {
          Ls.palm!.push(x, y, z, rot, s, 0xffffff);
          const c = Math.cos(rot), sn = Math.sin(rot);
          for (let k = 0; k < Math.min(2, o.f ?? 0); k++) {
            const fx = 0.3 + (k ? 0.1 : -0.06), fz = k ? 0.1 : -0.1;
            Ls.fruit!.push(x + (fx * c + fz * sn) * s, y + 1.5 * s, z + (-fx * sn + fz * c) * s, 0, 1.15, COCONUT.color);
          }
          break;
        }
        case 'rock':
          Ls.rock!.push(x, y, z, rot, 1, PAL.rock[(o.v ?? 0) % PAL.rock.length]!);
          break;
        case 'flower': {
          const grown = (o.g ?? 3) >= 2;
          const fs = grown ? 1 : 0.6;
          const color = FLOWER_COLORS[FLOWER_COLOR_ORDER[(o.v ?? 0) % 16] ?? 'red'] ?? 0xffffff;
          Ls.flowerStem!.push(x, y, z, rot, fs, 0xffffff);
          if (grown) Ls.flowerPetals!.push(x, y, z, rot, fs, color);
          if (o.w) Ls.stone!.push(x + 0.25, y - 0.05, z + 0.2, 0, 2.2, 0x6fa0c8, 0.15);
          break;
        }
        case 'weed':
          Ls.weed!.push(x, y, z, rot, s, 0xffffff);
          break;
        case 'sapling': {
          const g = o.g ?? 0;
          const sc = 0.7 + g * 0.25;
          Ls.sapling!.push(x, y, z, rot, sc, o.item === 'sapling_pine' ? PAL.pine[0]! : PAL.leaf[1]!);
          break;
        }
        case 'dig':
          Ls.dig!.push(x, y, z, rot, 1, 0xffffff);
          break;
        case 'hole':
          Ls.hole!.push(x, y, z, rot, 1, 0xffffff);
          break;
        case 'deco': {
          if (o.tag === 'fill') break;
          seenDecor.add(i);
          const dk = `${o.item}|${o.r ?? 0}|${o.nx ?? 0}|${o.nz ?? 0}`;
          const cur = this.decorMap.get(i);
          if (cur && cur.key === dk) break;
          if (cur) this.decor.remove(cur.obj);
          const obj = furnitureObject(o.item ?? '');
          if (!obj) break;
          const f = obj;
          // anchor is the min tile of the footprint; center the model on its footprint
          let maxX = tx, maxZ = tz;
          for (const k2 in w.state.world.objects) {
            const o2 = w.state.world.objects[+k2]!;
            if (o2.k === 'deco' && o2.tag === 'fill' && o2.v === i) {
              maxX = Math.max(maxX, +k2 % N);
              maxZ = Math.max(maxZ, Math.floor(+k2 / N));
            }
          }
          f.position.set((tx + maxX + 1) / 2 + (o.nx ?? 0), y, (tz + maxZ + 1) / 2 + (o.nz ?? 0));
          f.rotation.y = -(o.r ?? 0) * (Math.PI / 2);
          this.decor.add(f);
          this.decorMap.set(i, { key: dk, obj: f });
          break;
        }
        case 'item': {
          const vis = this.itemVisual(o.item ?? '');
          const bob = o.tag === 'lost' ? 0.05 : 0;
          switch (vis.shape) {
            case 'branch':
              Ls.stick!.push(x, y, z, rot, 1, 0xffffff);
              break;
            case 'shell':
              Ls.shell!.push(x, y, z, rot, 1.1, vis.color);
              break;
            case 'fruit':
              Ls.ball!.push(x, y, z, rot, 1, vis.color);
              break;
            case 'bottle':
              Ls.bottle!.push(x, y, z, rot, 1.2, 0xffffff);
              break;
            case 'stone':
              Ls.stone!.push(x, y, z, rot, 1.5, vis.color);
              break;
            default:
              Ls.bundle!.push(x, y + bob, z, rot, 1.1, vis.color);
          }
          break;
        }
        default:
          break;
      }
    }
    for (const n of names) this.layers[n]!.end();
    for (const [i, v] of this.decorMap)
      if (!seenDecor.has(i)) {
        this.decor.remove(v.obj);
        this.decorMap.delete(i);
      }
  }
}
