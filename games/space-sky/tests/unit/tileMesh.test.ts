import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import type { LevelDef } from '../../src/data/levelTypes';
import { parseLevel } from '../../src/systems/level';
import {
  buildBackTerrain, buildTileMesh, floorProfile, groundBelow, surfaceSpots, TILE_LAYERS, TILE_MESH_DEFAULTS, worldX, worldY, type MeshData,
} from '../../src/systems/tileMesh';

function level(map: string[]): LevelDef {
  return { id: 't', name: 'T', body: 'moon', theme: 'moon', map };
}

/** Checks every mesh is well formed: finite numbers, unit normals, valid indices, front-facing winding. */
function checkMesh(d: MeshData): void {
  const nv = d.pos.length / 3;
  expect(d.nrm.length).toBe(nv * 3);
  expect(d.uv.length).toBe(nv * 2);
  expect(d.shade.length).toBe(nv);
  expect(d.idx.length % 3).toBe(0);
  let bad = 0;
  for (const v of d.pos) if (!Number.isFinite(v)) bad++;
  for (let i = 0; i < nv; i++) {
    const l = Math.hypot(d.nrm[i * 3], d.nrm[i * 3 + 1], d.nrm[i * 3 + 2]);
    if (Math.abs(l - 1) > 1e-4) bad++;
  }
  expect(bad, 'non-finite positions or non-unit normals').toBe(0);
  let wrong = 0;
  for (let t = 0; t < d.idx.length; t += 3) {
    const a = d.idx[t], b = d.idx[t + 1], c = d.idx[t + 2];
    if (Math.max(a, b, c) >= nv) wrong++;
    // Triangle winding agrees with the vertex normal (counter-clockwise = front face).
    const p = (k: number, j: number) => d.pos[k * 3 + j];
    const ux = p(b, 0) - p(a, 0), uy = p(b, 1) - p(a, 1), uz = p(b, 2) - p(a, 2);
    const vx = p(c, 0) - p(a, 0), vy = p(c, 1) - p(a, 1), vz = p(c, 2) - p(a, 2);
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const dot = cx * d.nrm[a * 3] + cy * d.nrm[a * 3 + 1] + cz * d.nrm[a * 3 + 2];
    if (dot < -1e-6) wrong++;
  }
  expect(wrong, 'bad indices or back-facing triangles').toBe(0);
}

const quads = (d: MeshData) => d.idx.length / 6;

describe('tile mesher', () => {
  it('a flat floor: one front face per column, a single surface cap, nothing hidden', () => {
    const m = parseLevel(level(['.....', '..P..', '#####']));
    const out = buildTileMesh(m, { margin: 0, below: 0 });
    for (const k of TILE_LAYERS) checkMesh(out[k]);
    // 5 front faces only: columns past the edges copy the edge column and rows below are solid,
    // so there are no end walls or bottoms.
    expect(quads(out.ground)).toBe(5);
    // One run: a bevelled box = front + 4 chamfers + top + bottom + 2 ends.
    expect(quads(out.lip)).toBe(9);
    expect(quads(out.rock)).toBe(0);
    expect(quads(out.goo)).toBe(0);
  });

  it('walkable tops are exactly at the tile edge (feet stand on y = row top)', () => {
    const m = parseLevel(level(['.....', '..P..', '#####']));
    const out = buildTileMesh(m, { margin: 0, below: 0 });
    let maxY = -Infinity;
    for (let i = 1; i < out.lip.pos.length; i += 3) maxY = Math.max(maxY, out.lip.pos[i]);
    expect(maxY).toBeCloseTo(1, 6);
    expect(worldY(m, 2 * 48)).toBe(1);
    expect(worldX(96)).toBe(2);
  });

  it('bevelled blocks: a free-standing rock gets all its open faces, a wall of rocks shares edges', () => {
    const m = parseLevel(level(['.....', '.%P..', '#####']));
    const out = buildTileMesh(m, { margin: 0, below: 0 });
    // Front + 4 chamfers + top + left + right (bottom rests on ground).
    expect(quads(out.rock)).toBe(8);
    const wall = parseLevel(level(['.%...', '.%P..', '#####']));
    const w2 = buildTileMesh(wall, { margin: 0, below: 0 });
    // Two stacked blocks: 2×(front+4 chamfers) + 1 top + 2 left + 2 right.
    expect(quads(w2.rock)).toBe(15);
    checkMesh(w2.rock);
  });

  it('only exposed ground gets a surface cap; caps stop at walls', () => {
    const m = parseLevel(level(['..#..', '..#P.', '#####']));
    const out = buildTileMesh(m, { margin: 0, below: 0 });
    // Bottom row: caps on columns 0-1 and 3-4 (column 2 is covered by the pillar), pillar top = third run.
    expect(quads(out.lip)).toBe(27);
  });

  it('platforms, goo and glowing trims', () => {
    const m = parseLevel(level(['.....', '.==P.', '#~~##', '#####']));
    const out = buildTileMesh(m, { margin: 0, below: 0 });
    expect(quads(out.platform)).toBe(9);
    expect(quads(out.trim)).toBe(1);
    expect(quads(out.goo)).toBeGreaterThan(0);
    checkMesh(out.goo);
    // Only surface vertices of the goo are flagged to wobble.
    let flagged = 0;
    for (let i = 0; i < out.goo.shade.length; i++) {
      if (out.goo.shade[i] === 1) {
        flagged++;
        expect(out.goo.pos[i * 3 + 1]).toBeCloseTo(1.86, 5);
      }
    }
    expect(flagged).toBeGreaterThan(0);
  });

  it('is deterministic and stays inside its bounds', () => {
    const def = LEVELS.moon_base;
    const m = parseLevel(def);
    const a = buildTileMesh(m);
    const b = buildTileMesh(m);
    for (const k of TILE_LAYERS) expect(Array.from(a[k].pos)).toEqual(Array.from(b[k].pos));
    const o = TILE_MESH_DEFAULTS;
    for (const k of TILE_LAYERS) {
      const p = a[k].pos;
      for (let i = 0; i < p.length; i += 3) {
        expect(p[i]).toBeGreaterThanOrEqual(-o.margin - o.overhang - 1e-6);
        expect(p[i]).toBeLessThanOrEqual(m.w + o.margin + o.overhang + 1e-6);
        expect(p[i + 1]).toBeGreaterThanOrEqual(-o.below - 1e-6);
        expect(p[i + 1]).toBeLessThanOrEqual(m.h + 1e-6);
        expect(p[i + 2]).toBeGreaterThanOrEqual(o.zBack - 1e-6);
        expect(p[i + 2]).toBeLessThanOrEqual(o.zFront + o.overhang + 1e-6);
      }
    }
  });

  it('every level builds into a tablet-friendly mesh', { timeout: 30_000 }, () => {
    for (const def of Object.values(LEVELS)) {
      const m = parseLevel(def);
      const out = buildTileMesh(m);
      let tris = 0;
      for (const k of TILE_LAYERS) {
        checkMesh(out[k]);
        tris += out[k].idx.length / 3;
      }
      const back = buildBackTerrain(m);
      checkMesh(back);
      tris += back.idx.length / 3;
      expect(tris, def.id).toBeLessThan(60_000);
      expect(out.ground.idx.length + out.rock.idx.length + out.ice.idx.length, def.id).toBeGreaterThan(0);
    }
  });

  it('floor profile and ground lookups', () => {
    const m = parseLevel(level(['..=..', '..#P.', '#####']));
    expect(Array.from(floorProfile(m))).toEqual([1, 1, 2, 1, 1]);
    // Standing above the pillar: the pillar top. Above the platform: the platform.
    expect(groundBelow(m, 2.5, 2.5)).toBe(2);
    expect(groundBelow(m, 0.5, 2.9)).toBe(1);
    const p2 = parseLevel(level(['.....', '..=P.', '#####']));
    expect(groundBelow(p2, 2.5, 2.9)).toBe(2);
  });

  it('background terrain starts just below the floor and rises with distance', () => {
    const m = parseLevel(LEVELS.moon_base);
    const back = buildBackTerrain(m, { margin: 0 });
    const floor = floorProfile(m);
    const nx = m.w + 1;
    for (let i = 0; i < m.w; i += 7) {
      const yNear = back.pos[i * 3 + 1];
      let hi = -Infinity;
      let lo = Infinity;
      for (let k = Math.max(0, i - 4); k <= Math.min(m.w - 1, i + 4); k++) {
        hi = Math.max(hi, floor[k]);
        lo = Math.min(lo, floor[k]);
      }
      expect(yNear).toBeLessThan(hi);
      expect(yNear).toBeGreaterThan(lo - 3);
    }
    const nz = back.pos.length / 3 / nx;
    let near = 0;
    let far = 0;
    for (let i = 0; i < nx; i++) {
      near += back.pos[i * 3 + 1];
      far += back.pos[((nz - 1) * nx + i) * 3 + 1];
    }
    expect(far / nx).toBeGreaterThan(near / nx + 1);
  });

  it('surface details sit on open ground tops, away from the walking line', () => {
    const m = parseLevel(LEVELS.moon_base);
    const spots = surfaceSpots(m, 3);
    expect(spots.length).toBeGreaterThan(m.w / 2);
    for (const s of spots) {
      expect(Math.abs(s.z)).toBeGreaterThan(0.3);
      const tx = Math.floor(s.x);
      const ty = m.h - s.y;
      expect(m.tiles[ty * m.w + tx], `solid under ${s.x},${s.y}`).not.toBe(0);
      if (ty > 0) expect(m.tiles[(ty - 1) * m.w + tx]).toBe(0);
    }
    expect(surfaceSpots(m, 3)).toEqual(spots);
  });
});

