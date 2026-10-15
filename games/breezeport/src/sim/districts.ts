/**
 * Districts appear by themselves: each 10 × 10 part of town gets a character from what stands there:
 * Downtown (mostly shops and workplaces), the Waterfront (by the beach), a Park district (lots of
 * green), or the Suburbs (mostly homes). Neighbouring parts with the same character join into one.
 * City Hall lists them, and their names float over the town when you zoom out.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import { H, inland, W } from './map';
import type { Town } from './state';

export type DistrictKind = 'Downtown' | 'Waterfront' | 'Park district' | 'Suburbs';
export interface District { kind: DistrictKind; x: number; z: number; homes: number; shops: number; works: number; parks: number }

const CELL = 10;

export function districts(town: Town): District[] {
  const nx = Math.ceil(W / CELL), nz = Math.ceil(H / CELL);
  const cells = Array.from({ length: nx * nz }, () => ({ homes: 0, shops: 0, works: 0, parks: 0, sx: 0, sz: 0, n: 0 }));
  for (const t of town.things) {
    const d = THING[t.def];
    if (!d) continue;
    const c = cells[Math.min(nz - 1, Math.floor(t.z / CELL)) * nx + Math.min(nx - 1, Math.floor(t.x / CELL))]!;
    if (d.class === 'home') c.homes++;
    else if (d.class === 'shop') c.shops++;
    else if (d.class === 'work') c.works++;
    else if (d.class === 'park' || d.class === 'tree') c.parks += d.class === 'park' ? 2 : 1;
    else continue;
    c.sx += t.x; c.sz += t.z; c.n++;
  }
  const kinds: (DistrictKind | null)[] = cells.map((c, i) => {
    if (c.homes + c.shops + c.works < 3) return c.parks >= 10 ? 'Park district' : null;
    const z0 = Math.floor(i / nx) * CELL, x0 = (i % nx) * CELL;
    const shore = inland(x0 + CELL / 2, z0) < 8;
    if (c.parks >= 12 && c.parks > (c.homes + c.shops + c.works) * 1.2) return 'Park district';
    if (shore && c.shops + c.works >= 2) return 'Waterfront';
    if (c.shops + c.works >= c.homes) return 'Downtown';
    return 'Suburbs';
  });
  // join neighbours with the same character
  const seen = new Uint8Array(cells.length);
  const out: District[] = [];
  for (let i = 0; i < cells.length; i++) {
    const k = kinds[i];
    if (!k || seen[i]) continue;
    const d: District = { kind: k, x: 0, z: 0, homes: 0, shops: 0, works: 0, parks: 0 };
    let n = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      const c = cells[j]!;
      d.homes += c.homes; d.shops += c.shops; d.works += c.works; d.parks += c.parks;
      if (c.n) { d.x += c.sx / c.n; d.z += c.sz / c.n; n++; }
      const x = j % nx, z = Math.floor(j / nx);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ax = x + dx, az = z + dz;
        if (ax < 0 || az < 0 || ax >= nx || az >= nz) continue;
        const a = az * nx + ax;
        if (!seen[a] && kinds[a] === k) { seen[a] = 1; stack.push(a); }
      }
    }
    if (n) { d.x /= n; d.z /= n; out.push(d); }
  }
  return out;
}
