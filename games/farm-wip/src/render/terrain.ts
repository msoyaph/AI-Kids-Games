/**
 * The ground: one merged mesh of tile tops (soft colours blended at the corners), terrace sides,
 * and the diorama's cut-away base around the edge (grass lip, soil, darker earth). Rebuilt when an
 * area unlocks or the season changes, which is rare.
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import type { Season } from '../sim/clock';
import { H, STEP_Y, tileAt, W, WATER_Y, type AreaId } from '../sim/map';
import { Materials } from './materials';
import { EARTH, lockedTint, mixHex, SEASON_PALETTES } from './palette';

/** How far the diorama's base goes down under the land. */
export const BASE_Y = -1.7;

const tmp = new THREE.Color();

export function buildTerrain(season: Season, unlocked: readonly AreaId[]): THREE.Mesh {
  const pal = SEASON_PALETTES[season];
  const pos: number[] = [], col: number[] = [];
  const open = new Set<string>(unlocked);

  const tileColor = (x: number, z: number): number => {
    const t = tileAt(x, z);
    const n = noise(x, z, 17);
    if (t.water) return pal.bed;
    if (t.zone === 'wild') return n < 0.5 ? pal.wild : pal.wildAlt;
    if (t.zone === 'bank') return pal.bank;
    if (t.zone === 'river') return pal.bed;
    // farm land: a very faint checker so the grid can be read without lines
    const base = (x + z) % 2 === 0 ? pal.grass : pal.grassAlt;
    return open.has(t.zone) ? base : lockedTint(base);
  };
  const levelOf = (x: number, z: number) => (x < 0 || z < 0 || x >= W || z >= H ? -99 : tileAt(x, z).level);
  const topOf = (x: number, z: number) => tileAt(x, z).level * STEP_Y;

  // corner colours: the average of the tiles at the same level that share the corner
  const cornerColor = (cx: number, cz: number, level: number): THREE.Color => {
    let r = 0, g = 0, bl = 0, n = 0;
    for (const [x, z] of [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]] as const) {
      if (levelOf(x, z) !== level) continue;
      tmp.setHex(tileColor(x, z));
      r += tmp.r; g += tmp.g; bl += tmp.b; n++;
    }
    return new THREE.Color(r / n, g / n, bl / n);
  };

  const quad = (p: number[][], c: THREE.Color[]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...p[i]!); col.push(c[i]!.r, c[i]!.g, c[i]!.b); }
  };
  const flat = (hex: number) => { const c = new THREE.Color(hex); return [c, c, c, c]; };

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const t = tileAt(x, z), y = topOf(x, z);
      // top, wound so it faces up
      quad([[x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z]], [cornerColor(x, z, t.level), cornerColor(x, z + 1, t.level), cornerColor(x + 1, z + 1, t.level), cornerColor(x + 1, z, t.level)]);
      // sides wherever the neighbour is lower (or there is no neighbour: the diorama's edge)
      const sides: [number, number, number[][]][] = [
        [x, z - 1, [[x + 1, 0, z], [x, 0, z]]], // north edge, facing -z
        [x, z + 1, [[x, 0, z + 1], [x + 1, 0, z + 1]]], // south, facing +z
        [x - 1, z, [[x, 0, z], [x, 0, z + 1]]], // west, facing -x
        [x + 1, z, [[x + 1, 0, z + 1], [x + 1, 0, z]]], // east, facing +x
      ];
      for (const [nx, nz, [a, b]] of sides) {
        const nl = levelOf(nx, nz);
        if (nl >= t.level) continue;
        const edge = nl === -99;
        const bottom = edge ? BASE_Y : nl * STEP_Y;
        if (edge) {
          // cut-away base: a thin grass lip, then soil bands, then dark earth
          const lip = Math.max(bottom, y - 0.08);
          const band1 = Math.max(bottom, y - 0.55), band2 = Math.max(bottom, y - 1.1);
          const topHex = t.water ? EARTH.waterSide : tileColor(x, z);
          const layers: [number, number, number][] = t.water
            ? [[WATER_Y, y - 0.05, EARTH.waterSide], [y - 0.05, band2, EARTH.soilDark], [band2, bottom, EARTH.baseDark]]
            : [[y, lip, topHex], [lip, band1, EARTH.soil], [band1, band2, mixHex(EARTH.soil, EARTH.soilDark, 0.6)], [band2, bottom, EARTH.base]];
          for (const [top, bot, hex] of layers) {
            if (top <= bot) continue;
            quad([[a![0]!, top, a![2]!], [a![0]!, bot, a![2]!], [b![0]!, bot, b![2]!], [b![0]!, top, b![2]!]], flat(hex));
          }
        } else {
          const lip = Math.max(bottom, y - 0.07);
          const sideHex = noise(x, z, nx, nz) < 0.5 ? EARTH.soil : mixHex(EARTH.soil, EARTH.rock, 0.35);
          quad([[a![0]!, y, a![2]!], [a![0]!, lip, a![2]!], [b![0]!, lip, b![2]!], [b![0]!, y, b![2]!]], flat(tileColor(x, z)));
          quad([[a![0]!, lip, a![2]!], [a![0]!, bottom, a![2]!], [b![0]!, bottom, b![2]!], [b![0]!, lip, b![2]!]], flat(sideHex));
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, Materials.ground);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
