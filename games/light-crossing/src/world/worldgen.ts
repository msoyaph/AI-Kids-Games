// Procedural island generation. Pure and deterministic: same seed -> same island.
//
// Layout template (noise adds the variety):
//   north band ............ plateau (level 1) with a summit (level 2) + lighthouse
//   pond carved into the cliff base, river flowing south to the sea, with an
//   eastward fork -> three lowland regions: West (start, plaza), NE, SE.
import { fbm1, fbm2 } from '../core/noise';
import { Rng, hashInts } from '../core/rng';
import {
  DIRS4,
  DIRS8,
  Ground,
  Region,
  WORLD_SIZE,
  isWaterGround,
  type GenObject,
  type LotId,
  type Rect,
} from './types';

export interface IslandGen {
  seed: number;
  size: number;
  ground: Uint8Array;
  height: Uint8Array;
  region: Uint8Array;
  oceanDist: Uint8Array;
  lots: Record<LotId, Rect>;
  objects: GenObject[];
  spawn: { x: number; z: number };
  pond: { x: number; z: number };
  nativeFruit: number;
  riverMainX: number;
  attempts: number;
}

const N = WORLD_SIZE;
const I = (x: number, z: number) => z * N + x;
const inb = (x: number, z: number) => x >= 0 && z >= 0 && x < N && z < N;

export const FRUIT_COUNT = 5;

export function generateIsland(seed: number): IslandGen {
  for (let attempt = 0; attempt < 60; attempt++) {
    const g = tryGenerate(seed, attempt);
    if (g) {
      g.attempts = attempt + 1;
      return g;
    }
  }
  throw new Error(`World generation failed for seed ${seed}`);
}

function components(
  mask: (i: number) => boolean,
): { id: Int32Array; sizes: number[]; cells: number[][] } {
  const id = new Int32Array(N * N).fill(-1);
  const sizes: number[] = [];
  const cells: number[][] = [];
  const stack: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (id[i] !== -1 || !mask(i)) continue;
    const c = sizes.length;
    const list: number[] = [];
    id[i] = c;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      list.push(j);
      const x = j % N, z = (j / N) | 0;
      for (const [dx, dz] of DIRS4) {
        const nx = x + dx, nz = z + dz;
        if (!inb(nx, nz)) continue;
        const k = I(nx, nz);
        if (id[k] === -1 && mask(k)) {
          id[k] = c;
          stack.push(k);
        }
      }
    }
    sizes.push(list.length);
    cells.push(list);
  }
  return { id, sizes, cells };
}

function tryGenerate(seed: number, sub: number): IslandGen | null {
  const rng = new Rng(hashInts(seed, sub, 0x15ad));
  const ns = rng.nextU32();
  const land = new Uint8Array(N * N);
  const height = new Uint8Array(N * N);
  const ground = new Uint8Array(N * N);

  // 1. Land mask: rounded-square falloff + noise.
  const p = 2.6;
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const dx = Math.abs((x + 0.5 - N / 2) / (N / 2));
      const dz = Math.abs((z + 0.5 - N / 2) / (N / 2));
      const r = Math.pow(Math.pow(dx, p) + Math.pow(dz, p), 1 / p);
      const n = fbm2(ns, x * 0.07, z * 0.07, 3);
      const edge = x < 4 || z < 4 || x >= N - 4 || z >= N - 4;
      land[I(x, z)] = !edge && r + n * 0.13 < 0.84 ? 1 : 0;
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const copy = land.slice();
    for (let z = 1; z < N - 1; z++) {
      for (let x = 1; x < N - 1; x++) {
        let c = 0;
        for (const [dx, dz] of DIRS8) c += copy[I(x + dx, z + dz)]!;
        if (c >= 5) land[I(x, z)] = 1;
        else if (c <= 3) land[I(x, z)] = 0;
      }
    }
  }
  {
    const comp = components((i) => land[i] === 1);
    let best = -1, bestSize = 0;
    comp.sizes.forEach((s, c) => {
      if (s > bestSize) {
        bestSize = s;
        best = c;
      }
    });
    for (let i = 0; i < N * N; i++) land[i] = comp.id[i] === best ? 1 : 0;
    // fill enclosed lakes of ocean
    const sea = components((i) => land[i] === 0);
    const edgeComp = sea.id[0]!;
    for (let i = 0; i < N * N; i++) if (land[i] === 0 && sea.id[i] !== edgeComp) land[i] = 1;
  }

  // 2. Distance to ocean (BFS).
  const oceanDist = new Uint8Array(N * N).fill(255);
  {
    const q: number[] = [];
    for (let i = 0; i < N * N; i++)
      if (!land[i]) {
        oceanDist[i] = 0;
        q.push(i);
      }
    for (let h = 0; h < q.length; h++) {
      const j = q[h]!;
      const x = j % N, z = (j / N) | 0;
      for (const [dx, dz] of DIRS4) {
        const nx = x + dx, nz = z + dz;
        if (!inb(nx, nz)) continue;
        const k = I(nx, nz);
        if (oceanDist[k] === 255) {
          oceanDist[k] = oceanDist[j]! + 1;
          q.push(k);
        }
      }
    }
  }

  // 3. Elevation: plateau across the north, summit inside it.
  const c1 = rng.range(0.29, 0.34);
  const c2 = rng.range(0.15, 0.2);
  const cx2 = N * rng.range(0.38, 0.6);
  const halfW2 = N * rng.range(0.17, 0.23);
  for (let x = 0; x < N; x++) {
    const zc1 = N * (c1 + 0.055 * fbm1(ns + 11, x * 0.06));
    const zc2 = N * (c2 + 0.04 * fbm1(ns + 23, x * 0.08));
    const hw = halfW2 * (1 + 0.18 * fbm1(ns + 31, x * 0.1));
    for (let z = 0; z < N; z++) {
      const i = I(x, z);
      if (!land[i]) continue;
      if (z < zc1) height[i] = 1;
      if (z < zc2 && Math.abs(x + 0.5 - cx2) < hw && oceanDist[i]! >= 5) height[i] = 2;
    }
  }
  const lvl = (x: number, z: number) => (inb(x, z) ? height[I(x, z)]! : 0);
  const isLand = (x: number, z: number) => inb(x, z) && land[I(x, z)] === 1;
  for (let pass = 0; pass < 4; pass++) {
    const copy = height.slice();
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const i = I(x, z);
        const L = copy[i]!;
        if (L === 0 || !land[i]) continue;
        let c = 0;
        for (const [dx, dz] of DIRS8) {
          const nx = x + dx, nz = z + dz;
          const nl = inb(nx, nz) ? copy[I(nx, nz)]! : 0;
          const nland = isLand(nx, nz);
          // For level 1, the sea counts as "wall" so sea cliffs stay put.
          if (nl >= L || (L === 1 && !nland)) c++;
        }
        if (c < 5) height[i] = L - 1;
      }
    }
  }
  // Summit must never touch level 0 directly.
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++) {
      if (height[I(x, z)] !== 2) continue;
      for (const [dx, dz] of DIRS8) if (lvl(x + dx, z + dz) === 0) height[I(x, z)] = 1;
    }
  // Drop tiny plateau fragments.
  for (const L of [2, 1]) {
    const comp = components((i) => land[i] === 1 && height[i]! >= L);
    let best = -1, bestSize = 0;
    comp.sizes.forEach((s, c) => {
      if (s > bestSize) {
        bestSize = s;
        best = c;
      }
    });
    comp.cells.forEach((cells, c) => {
      if (c === best) return;
      if (L === 2 || comp.sizes[c]! < 40) for (const i of cells) height[i] = L - 1;
    });
  }

  // 4. Pond carved into the cliff base.
  const pondX = Math.floor(N * rng.range(0.47, 0.6));
  let baseZ = -1;
  for (let z = 0; z < N; z++) {
    if (land[I(pondX, z)] && height[I(pondX, z)] === 0) {
      baseZ = z;
      break;
    }
  }
  if (baseZ < 8 || baseZ > N * 0.6) return null;
  const pcx = pondX + 0.5, pcz = baseZ + 0.6;
  const prx = rng.range(2.8, 3.8), prz = rng.range(2.2, 2.9);
  let pondMaxZ = 0;
  let pondTiles = 0;
  for (let z = baseZ - 5; z <= baseZ + 5; z++) {
    for (let x = pondX - 6; x <= pondX + 6; x++) {
      if (!inb(x, z)) continue;
      const i = I(x, z);
      const e = ((x + 0.5 - pcx) / prx) ** 2 + ((z + 0.5 - pcz) / prz) ** 2;
      if (e + 0.2 * fbm2(ns + 41, x * 0.5, z * 0.5, 2) < 1) {
        if (!land[i] || height[i] === 2) return null;
        ground[i] = Ground.Pond;
        height[i] = 0;
        pondMaxZ = Math.max(pondMaxZ, z);
        pondTiles++;
      }
    }
  }
  if (pondTiles < 14) return null;
  // Summit must not border the pond.
  for (let z = baseZ - 7; z <= baseZ + 1; z++)
    for (let x = pondX - 8; x <= pondX + 8; x++) {
      if (!inb(x, z) || height[I(x, z)] !== 2) continue;
      for (const [dx, dz] of DIRS8)
        if (inb(x + dx, z + dz) && ground[I(x + dx, z + dz)] === Ground.Pond) return null;
    }

  // 5. Rivers (random walk toward a coastal target, carving lowland only).
  const river = new Uint8Array(N * N);
  const carve = (px: number, pz: number, r: number) => {
    for (let z = Math.floor(pz - r - 1); z <= Math.ceil(pz + r + 1); z++)
      for (let x = Math.floor(px - r - 1); x <= Math.ceil(px + r + 1); x++) {
        if (!inb(x, z)) continue;
        const i = I(x, z);
        if ((x + 0.5 - px) ** 2 + (z + 0.5 - pz) ** 2 > r * r) continue;
        if (land[i] && height[i] === 0 && ground[i] !== Ground.Pond) river[i] = 1;
      }
  };
  const walk = (sx: number, sz: number, tx: number, tz: number, r: number, label: number) => {
    const path: [number, number][] = [];
    let px = sx, pz = sz;
    for (let step = 0; step < 600; step++) {
      path.push([px, pz]);
      carve(px, pz, r);
      const tix = Math.floor(px), tiz = Math.floor(pz);
      if (!inb(tix, tiz) || !land[I(tix, tiz)]) return path;
      let dx = tx - px, dz = tz - pz;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const wob = 1.4 * fbm1(ns + label, step * 0.05);
      const c = Math.cos(wob), s = Math.sin(wob);
      let ndx = dx * c - dz * s, ndz = dx * s + dz * c;
      // Steer away from cliffs ahead.
      const ax = Math.floor(px + ndx * 2.5), az = Math.floor(pz + ndz * 2.5);
      if (inb(ax, az) && land[I(ax, az)] && height[I(ax, az)]! > 0) {
        ndz = Math.abs(ndz) + 0.8;
        const l2 = Math.hypot(ndx, ndz);
        ndx /= l2;
        ndz /= l2;
      }
      px += ndx * 0.5;
      pz += ndz * 0.5;
    }
    return null;
  };
  const mainTx = pcx + N * rng.range(-0.02, 0.12);
  const mainPath = walk(pcx, pondMaxZ + 0.5, mainTx, N + 2, 1.15, 101);
  if (!mainPath || mainPath.length < 20) return null;
  const forkIdx = Math.floor(mainPath.length * rng.range(0.35, 0.5));
  const [fx, fz] = mainPath[forkIdx]!;
  const branchPath = walk(fx, fz, N + 2, fz + N * rng.range(-0.08, 0.06), 1.05, 202);
  if (!branchPath || branchPath.length < 12) return null;
  for (let i = 0; i < N * N; i++) if (river[i]) ground[i] = Ground.River;

  // 6. Base ground classes.
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++) {
      const i = I(x, z);
      if (!land[i]) {
        ground[i] = Ground.Ocean;
        height[i] = 0;
        continue;
      }
      if (ground[i] === Ground.River || ground[i] === Ground.Pond) continue;
      const beachW = z > N * 0.62 ? 3 : 2;
      ground[i] = height[i] === 0 && oceanDist[i]! <= beachW ? Ground.Sand : Ground.Grass;
    }

  // 7. Regions. Tiny lowland pockets become river so nothing is unreachable.
  const walkable0 = (i: number) => height[i] === 0 && land[i] === 1 && !isWaterGround(ground[i]!);
  let comp0 = components(walkable0);
  let changed = false;
  comp0.cells.forEach((cells, c) => {
    if (comp0.sizes[c]! < 40) {
      for (const i of cells) ground[i] = Ground.River;
      changed = true;
    }
  });
  if (changed) comp0 = components(walkable0);
  if (comp0.sizes.length !== 3) return null;
  const stats = comp0.cells.map((cells) => {
    let sx = 0, sz = 0;
    for (const i of cells) {
      sx += i % N;
      sz += (i / N) | 0;
    }
    return { cx: sx / cells.length, cz: sz / cells.length, size: cells.length };
  });
  const order = [0, 1, 2].sort((a, b) => stats[a]!.cx - stats[b]!.cx);
  const westC = order[0]!;
  const others = order.slice(1).sort((a, b) => stats[a]!.cz - stats[b]!.cz);
  const neC = others[0]!, seC = others[1]!;
  if (stats[westC]!.size < 900 || stats[neC]!.size < 150 || stats[seC]!.size < 200) return null;
  const region = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    if (!land[i] || isWaterGround(ground[i]!)) continue;
    if (height[i] === 2) region[i] = Region.Summit;
    else if (height[i] === 1) region[i] = Region.Plateau;
    else {
      const c = comp0.id[i]!;
      region[i] = c === westC ? Region.West : c === neC ? Region.NE : Region.SE;
    }
  }
  let plateauN = 0, summitN = 0;
  for (let i = 0; i < N * N; i++) {
    if (region[i] === Region.Plateau) plateauN++;
    if (region[i] === Region.Summit) summitN++;
  }
  if (plateauN < 400 || summitN < 60) return null;
  // Plateau must border the West region (so a ladder/ramp from the start area works).
  let plateauTouchesWest = false;
  for (let i = 0; i < N * N && !plateauTouchesWest; i++) {
    if (region[i] !== Region.West) continue;
    const x = i % N, z = (i / N) | 0;
    for (const [dx, dz] of DIRS4)
      if (inb(x + dx, z + dz) && region[I(x + dx, z + dz)] === Region.Plateau) plateauTouchesWest = true;
  }
  if (!plateauTouchesWest) return null;

  // 8. Lots.
  const reserved = new Uint8Array(N * N);
  const okTile = (x: number, z: number, reg: number, lv: number) =>
    inb(x, z) && region[I(x, z)] === reg && height[I(x, z)] === lv && ground[I(x, z)] === Ground.Grass;
  const rectOk = (r: Rect, reg: number, lv: number, margin: number) => {
    for (let z = r.z - margin; z < r.z + r.d + margin; z++)
      for (let x = r.x - margin; x < r.x + r.w + margin; x++) {
        if (!okTile(x, z, reg, lv)) return false;
        if (reserved[I(x, z)]) return false;
      }
    return true;
  };
  const reserve = (r: Rect, margin: number, val = 1) => {
    for (let z = r.z - margin; z < r.z + r.d + margin; z++)
      for (let x = r.x - margin; x < r.x + r.w + margin; x++) if (inb(x, z)) reserved[I(x, z)] = val;
  };
  const place = (
    w: number,
    d: number,
    prefX: number,
    prefZ: number,
    reg: number,
    lv: number,
    margin: number,
    radius = 22,
  ): Rect | null => {
    let best: Rect | null = null;
    let bestScore = Infinity;
    for (let z = Math.floor(prefZ - radius); z <= prefZ + radius; z++)
      for (let x = Math.floor(prefX - radius); x <= prefX + radius; x++) {
        const r = { x: Math.round(x - w / 2), z: Math.round(z - d / 2), w, d };
        const score = (x - prefX) ** 2 + (z - prefZ) ** 2;
        if (score >= bestScore) continue;
        if (rectOk(r, reg, lv, margin)) {
          best = r;
          bestScore = score;
        }
      }
    return best;
  };
  const W0 = stats[westC]!;
  const plaza = place(9, 7, W0.cx + 1, W0.cz + N * 0.06, Region.West, 0, 2);
  if (!plaza) return null;
  reserve(plaza, 1);
  const pcxT = plaza.x + plaza.w / 2, pczT = plaza.z + plaza.d / 2;
  const hall = place(6, 4, pcxT, plaza.z - 3, Region.West, 0, 1, 10);
  if (!hall) return null;
  reserve(hall, 1);
  const shop = place(5, 4, plaza.x + plaza.w + 4, pczT - 1, Region.West, 0, 1, 12);
  if (!shop) return null;
  reserve(shop, 1);
  const museum = place(6, 5, plaza.x - 5, pczT - 3, Region.West, 0, 1, 14);
  if (!museum) return null;
  reserve(museum, 1);
  const home = place(4, 4, plaza.x - 3, plaza.z + plaza.d + 4, Region.West, 0, 1, 14);
  if (!home) return null;
  reserve(home, 1);

  // Dock on the south shore of the West region, nearest the plaza.
  let dock: Rect | null = null;
  {
    let bestScore = Infinity;
    for (let x = 2; x < N - 3; x++) {
      for (let z = N - 3; z > N / 2; z--) {
        // sand pair whose south neighbours are open sea for 5 tiles
        if (region[I(x, z)] !== Region.West || region[I(x + 1, z)] !== Region.West) continue;
        if (ground[I(x, z)] !== Ground.Sand || ground[I(x + 1, z)] !== Ground.Sand) continue;
        let ok = true;
        for (let k = 1; k <= 5 && ok; k++)
          for (let dx = -1; dx <= 2; dx++)
            if (!inb(x + dx, z + k) || ground[I(x + dx, z + k)] !== Ground.Ocean) ok = false;
        if (!ok) continue;
        const score = Math.abs(x + 1 - pcxT) + Math.abs(z - pczT) * 0.3;
        if (score < bestScore) {
          bestScore = score;
          dock = { x, z: z + 1, w: 2, d: 4 };
        }
      }
    }
  }
  if (!dock) return null;
  reserve({ x: dock.x, z: dock.z - 2, w: 2, d: 2 }, 1);

  // Lighthouse on the summit, as far north as possible.
  let lighthouse: Rect | null = null;
  for (let z = 0; z < N && !lighthouse; z++)
    for (let x = 0; x < N && !lighthouse; x++) {
      const r = { x, z, w: 2, d: 2 };
      let ok = true;
      for (let zz = z - 1; zz < z + 3 && ok; zz++)
        for (let xx = x - 1; xx < x + 3 && ok; xx++)
          if (!inb(xx, zz) || region[I(xx, zz)] !== Region.Summit) ok = false;
      if (ok) lighthouse = r;
    }
  if (!lighthouse) return null;
  reserve(lighthouse, 1);

  // 9. Dirt paths: plaza -> dock, plaza -> each building door.
  const carvePath = (sx: number, sz: number, tx: number, tz: number) => {
    // BFS over West-region lowland, preferring straight lines.
    const prev = new Int32Array(N * N).fill(-1);
    const start = I(sx, sz);
    const goal = I(tx, tz);
    prev[start] = start;
    const q = [start];
    for (let h = 0; h < q.length; h++) {
      const j = q[h]!;
      if (j === goal) break;
      const x = j % N, z = (j / N) | 0;
      for (const [dx, dz] of DIRS4) {
        const nx = x + dx, nz = z + dz;
        if (!inb(nx, nz)) continue;
        const k = I(nx, nz);
        if (prev[k] !== -1 || region[k] !== Region.West) continue;
        prev[k] = j;
        q.push(k);
      }
    }
    if (prev[goal] === -1) return;
    for (let j = goal; j !== start; j = prev[j]!) {
      if (ground[j] === Ground.Grass && !reserved[j]) ground[j] = Ground.Dirt;
      if (ground[j] === Ground.Grass && reserved[j] === 1) ground[j] = Ground.Dirt;
    }
  };
  for (let z = plaza.z; z < plaza.z + plaza.d; z++)
    for (let x = plaza.x; x < plaza.x + plaza.w; x++) ground[I(x, z)] = Ground.Dirt;
  const plazaMidX = plaza.x + Math.floor(plaza.w / 2);
  carvePath(plazaMidX, plaza.z + plaza.d - 1, dock.x, dock.z - 1);
  carvePath(plazaMidX, plaza.z, hall.x + Math.floor(hall.w / 2), hall.z + hall.d);
  carvePath(plaza.x + plaza.w - 1, plaza.z + 3, shop.x + Math.floor(shop.w / 2), shop.z + shop.d);
  carvePath(plaza.x, plaza.z + 3, museum.x + Math.floor(museum.w / 2), museum.z + museum.d);
  carvePath(plaza.x, plaza.z + plaza.d - 1, home.x + Math.floor(home.w / 2), home.z + home.d);
  const isPath = (i: number) => ground[i] === Ground.Dirt;

  // 10. Objects.
  const objects: GenObject[] = [];
  const occupied = new Uint8Array(N * N);
  const nearKind = (x: number, z: number, r: number) => {
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) if (inb(x + dx, z + dz) && occupied[I(x + dx, z + dz)]) return true;
    return false;
  };
  const free = (x: number, z: number) => {
    if (!inb(x, z)) return false;
    const i = I(x, z);
    return !reserved[i] && !occupied[i] && !isPath(i) && region[i] !== 0;
  };
  const add = (x: number, z: number, k: GenObject['k'], v: number) => {
    objects.push({ x, z, k, v });
    occupied[I(x, z)] = 1;
  };
  // Keep a 1-tile clear ring at the foot of every cliff wall where ladders land.
  const order2 = rng.shuffle(Array.from({ length: N * N }, (_, i) => i));
  const fs = rng.nextU32();
  const nativeFruit = rng.int(0, FRUIT_COUNT - 1);
  // fruit trees near the plaza first
  {
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < 7; tries++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(7, 13);
      const x = Math.floor(pcxT + Math.cos(a) * r), z = Math.floor(pczT + Math.sin(a) * r);
      if (!free(x, z) || ground[I(x, z)] !== Ground.Grass || region[I(x, z)] !== Region.West) continue;
      if (nearKind(x, z, 1)) continue;
      add(x, z, 'fruitTree', nativeFruit);
      placed++;
    }
  }
  for (const i of order2) {
    const x = i % N, z = (i / N) | 0;
    if (!free(x, z)) continue;
    const g = ground[i]!;
    if (g === Ground.Sand) {
      if (oceanDist[i]! >= 1 && rng.chance(0.05) && !nearKind(x, z, 2)) add(x, z, 'palm', rng.int(0, 2));
      continue;
    }
    if (g !== Ground.Grass) continue;
    const forest = fbm2(fs, x * 0.09, z * 0.09, 3) + (height[i]! > 0 ? 0.22 : 0);
    const townD = Math.hypot(x + 0.5 - pcxT, z + 0.5 - pczT);
    if (townD < 10) continue;
    const pTree = forest > 0.12 ? (height[i]! > 0 ? 0.4 : 0.3) : townD < 16 ? 0.01 : 0.025;
    if (!rng.chance(pTree) || nearKind(x, z, 1)) continue;
    const pine = height[i]! > 0 ? rng.chance(0.55) : rng.chance(0.18);
    add(x, z, pine ? 'pine' : 'tree', rng.int(0, 3));
  }
  // rocks: per-region quotas
  const rockQuota: [number, number][] = [
    [Region.West, 2],
    [Region.SE, 1],
    [Region.NE, 1],
    [Region.Plateau, 2],
    [Region.Summit, 1],
  ];
  for (const [reg, count] of rockQuota) {
    let placed = 0;
    for (const i of order2) {
      if (placed >= count) break;
      const x = i % N, z = (i / N) | 0;
      if (region[i] !== reg || !free(x, z) || ground[i] !== Ground.Grass || nearKind(x, z, 2)) continue;
      add(x, z, 'rock', rng.int(0, 2));
      placed++;
    }
  }
  // flower patches (species 0..2 native with base colors)
  {
    let patches = 0;
    for (const i of order2) {
      if (patches >= 14) break;
      const x = i % N, z = (i / N) | 0;
      if (!free(x, z) || ground[i] !== Ground.Grass || region[i] === Region.Summit) continue;
      if (rng.next() > 0.02) continue;
      const species = rng.int(0, 5);
      const color = rng.int(0, 2); // red / yellow / white
      let n = 0;
      for (let k = 0; k < 10 && n < 5; k++) {
        const fx2 = x + rng.int(-2, 2), fz2 = z + rng.int(-2, 2);
        if (!free(fx2, fz2) || ground[I(fx2, fz2)] !== Ground.Grass) continue;
        if (height[I(fx2, fz2)] !== height[i]) continue;
        add(fx2, fz2, 'flower', species * 16 + color);
        n++;
      }
      patches++;
    }
  }

  const spawn = { x: dock.x + 1, z: dock.z + dock.d - 0.6 };
  return {
    seed,
    size: N,
    ground,
    height,
    region,
    oceanDist,
    lots: { plaza, hall, shop, museum, home, dock, lighthouse },
    objects,
    spawn,
    pond: { x: pcx, z: pcz },
    nativeFruit,
    riverMainX: mainTx,
    attempts: 0,
  };
}

/** Debug helper: ASCII map of an island. */
export function asciiMap(g: IslandGen): string {
  const chars: string[] = [];
  const objAt = new Map<number, string>();
  for (const o of g.objects) objAt.set(I(o.x, o.z), { tree: 'T', pine: 'P', palm: 'Y', fruitTree: 'F', rock: 'R', flower: '*' }[o.k]);
  const lotAt = new Map<number, string>();
  for (const [id, r] of Object.entries(g.lots))
    for (let z = r.z; z < r.z + r.d; z++) for (let x = r.x; x < r.x + r.w; x++) lotAt.set(I(x, z), id[0]!.toUpperCase());
  for (let z = 0; z < N; z++) {
    let line = '';
    for (let x = 0; x < N; x++) {
      const i = I(x, z);
      const lot = lotAt.get(i);
      if (lot) {
        line += lot;
        continue;
      }
      const o = objAt.get(i);
      if (o) {
        line += o;
        continue;
      }
      const gr = g.ground[i]!;
      if (gr === Ground.Ocean) line += '~';
      else if (gr === Ground.River) line += '=';
      else if (gr === Ground.Pond) line += 'o';
      else if (gr === Ground.Sand) line += ':';
      else if (gr === Ground.Dirt) line += '#';
      else line += g.height[i] === 2 ? '^' : g.height[i] === 1 ? '+' : '.';
    }
    chars.push(line);
  }
  return chars.join('\n');
}
