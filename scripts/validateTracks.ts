/**
 * Track validator + top-down SVG previews.
 *   npx tsx scripts/validateTracks.ts            # all tracks
 *   npx tsx scripts/validateTracks.ts beach-*    # filter by id glob
 *   npx tsx scripts/validateTracks.ts --no-sim   # geometry checks only
 * Writes sim-report/tracks/<id>.svg and prints a summary. Exit code 1 on errors.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index';
import type { TrackData } from '../src/data/types';
import { TrackModel, EDGE_DROP, EDGE_WALL, F_GAP, type Ribbon, F_ICE } from '../src/sim/track/trackModel';
import { World } from '../src/sim/world';
import { RaceTracker } from '../src/sim/race';
import { AiController } from '../src/sim/ai/aiController';
import { ItemSystem } from '../src/sim/items/itemSystem';
import { HazardSystem } from '../src/sim/hazards';
import { SIM_DT } from '../src/core/loop';
import { RACERS } from '../src/data/racers';

const args = process.argv.slice(2);
const noSim = args.includes('--no-sim');
const filters = args.filter((a) => !a.startsWith('--'));
const match = (id: string): boolean => filters.length === 0 || filters.some((f) => new RegExp('^' + f.replace(/\*/g, '.*') + '$').test(id));

mkdirSync('sim-report/tracks', { recursive: true });

interface Report {
  id: string;
  errors: string[];
  warnings: string[];
  info: string[];
}

function geometryChecks(t: TrackModel, r: Report): void {
  const rb = t.main;
  const L = t.length;
  r.info.push(`length ${L.toFixed(0)} m, ${t.data.points.length} pts, ${t.itemBoxes.length} item boxes, ${t.shortcuts.length} shortcuts, width ${t.data.width}`);
  if (L < 700) r.warnings.push(`short lap (${L.toFixed(0)} m)`);
  if (L > 1700) r.warnings.push(`long lap (${L.toFixed(0)} m)`);
  if (t.shortcuts.length < 1) r.errors.push('needs at least one shortcut');
  if ((t.data.itemRows ?? []).length < 2) r.warnings.push('fewer than 2 item rows');
  // overlaps between non-adjacent parts of the main road
  const cell = 20;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < rb.n; i += 2) {
    const k = `${Math.floor(rb.px[i] / cell)},${Math.floor(rb.pz[i] / cell)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  }
  const reported = new Set<string>();
  for (let i = 0; i < rb.n; i += 2) {
    const cx = Math.floor(rb.px[i] / cell);
    const cz = Math.floor(rb.pz[i] / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
          let sep = Math.abs(i - j);
          sep = Math.min(sep, rb.n - sep);
          if (sep * rb.ds < 60) continue;
          const dy = Math.abs(rb.py[i] - rb.py[j]);
          if (dy > 5.5) continue; // bridge / overpass
          const bi = rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]);
          const bj = rb.hw[j] + Math.max(rb.shL[j], rb.shR[j]);
          const d = Math.hypot(rb.px[i] - rb.px[j], rb.pz[i] - rb.pz[j]);
          if (d < bi + bj + 1) {
            const key = `${Math.round(rb.u[i])}-${Math.round(rb.u[j])}`;
            if (!reported.has(key)) {
              reported.add(key);
              r.errors.push(`road overlaps itself near u=${rb.u[i].toFixed(1)} and u=${rb.u[j].toFixed(1)} (gap ${(d - bi - bj).toFixed(1)} m, dy ${dy.toFixed(1)})`);
            }
          }
        }
      }
  }
  // slopes, radii
  let maxSlope = 0;
  let minR = Infinity;
  for (let i = 0; i < rb.n; i++) {
    maxSlope = Math.max(maxSlope, Math.abs(rb.ty[i]));
    if (Math.abs(rb.curv[i]) > 1e-4) minR = Math.min(minR, 1 / Math.abs(rb.curv[i]));
  }
  r.info.push(`max slope ${(maxSlope * 100).toFixed(0)}%, tightest radius ${minR.toFixed(0)} m, elevation ${t.minY.toFixed(1)}..${Math.max(...rb.py).toFixed(1)}`);
  if (maxSlope > 0.42) r.warnings.push(`steep slope ${(maxSlope * 100).toFixed(0)}%`);
  // ice coverage (main road + icy shortcuts)
  let iceM = 0;
  for (let i = 0; i < rb.n; i++) if (rb.flags[i] & F_ICE) iceM += rb.ds;
  const iceSc = t.shortcuts.filter((sc) => sc.flags[0] & F_ICE).length;
  if (iceM > 0 || iceSc) r.info.push(`ice: ${iceM.toFixed(0)} m of road (${((iceM / t.length) * 100).toFixed(0)}%)${iceSc ? `, ${iceSc} icy shortcut(s)` : ''}`);
  for (let i = 0; i < rb.n; i++) {
    // icy hairpins without a wall are a trap
    if (rb.flags[i] & F_ICE && Math.abs(rb.curv[i]) > 1 / 18 && (rb.edgeL[i] === EDGE_DROP || rb.edgeR[i] === EDGE_DROP)) {
      r.warnings.push(`tight icy bend beside a drop near u=${rb.u[i].toFixed(1)}`);
      break;
    }
  }
  if (minR < 11) r.warnings.push(`very tight corner (R ${minR.toFixed(0)} m)`);
  // shortcuts join the road
  t.shortcuts.forEach((sc, idx) => {
    const ends = [0, sc.n - 1];
    for (const e of ends) {
      const hint = { ribbon: 0, sample: 0 };
      t.resetHint(sc.px[e], sc.py[e], sc.pz[e], hint);
      const i = hint.sample;
      const d = Math.hypot(sc.px[e] - rb.px[i], sc.pz[e] - rb.pz[i]);
      const B = rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]) + 2;
      if (d > B) r.errors.push(`shortcut ${idx} ${e === 0 ? 'start' : 'end'} is ${d.toFixed(1)} m from the road (limit ${B.toFixed(1)})`);
      if (Math.abs(sc.py[e] - rb.py[i]) > 1.5) r.warnings.push(`shortcut ${idx} ${e === 0 ? 'start' : 'end'} height differs by ${(sc.py[e] - rb.py[i]).toFixed(1)} m`);
      const side = e === 0 ? rb.edgeL[i] === EDGE_WALL || rb.edgeR[i] === EDGE_WALL : false;
      void side;
    }
    let span = sc.mainS1 - sc.mainS0;
    if (span < 0) span += t.length;
    r.info.push(`shortcut ${idx}: ${sc.length.toFixed(0)} m vs ${span.toFixed(0)} m of road (${((1 - sc.length / span) * 100).toFixed(0)}% shorter)`);
    if (sc.length > span) r.warnings.push(`shortcut ${idx} is longer than the road it skips`);
  });
}

function simCheck(data: TrackData, mirror: boolean, r: Report): void {
  const t = new TrackModel(data, mirror);
  const racers = RACERS.slice(0, 8);
  const world = new World({
    ground: t,
    speedClass: 'pro',
    seed: 7,
    racers: Array.from({ length: 8 }, (_, i) => ({ racerId: racers[i % racers.length].id, kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, player: -1 })),
    countdownTime: 3,
  });
  world.events.enabled = false;
  const race = new RaceTracker(world, t, 3);
  race.placeGrid([0, 1, 2, 3, 4, 5, 6, 7]);
  const ai = new AiController(world, t, { noRubberBand: true });
  const items = new ItemSystem(world, t, t, { set: 'all' });
  ai.attachItems(items);
  new HazardSystem(world, t, items.hazards);
  let steps = 0;
  while (world.phase !== 'done' && steps < 60 * 420) {
    world.step(SIM_DT);
    steps++;
  }
  const real = world.karts.filter((k) => k.finished && !k.projected);
  const falls = world.karts.reduce((s, k) => s + k.raceStats.falls, 0);
  const sc = world.karts.reduce((s, k) => s + k.raceStats.shortcuts, 0);
  const mt = world.karts.reduce((s, k) => s + k.raceStats.miniTurbos[0] + k.raceStats.miniTurbos[1] + k.raceStats.miniTurbos[2], 0);
  const best = Math.min(...world.karts.map((k) => k.bestLap));
  const winner = Math.min(...world.karts.map((k) => k.finishTime));
  const tag = mirror ? 'mirror' : 'normal';
  r.info.push(`[${tag}] AI: ${real.length}/8 finished, winner ${winner.toFixed(1)} s, best lap ${best.toFixed(1)} s, falls ${falls}, shortcuts ${sc}, mini-turbos ${mt}`);
  if (real.length < 7) r.errors.push(`[${tag}] only ${real.length}/8 AI finished`);
  if (falls > 8) r.warnings.push(`[${tag}] AI fell ${falls} times`);
  if (best < 25 || best > 70) r.warnings.push(`[${tag}] best lap ${best.toFixed(1)} s outside 25-70 s`);
}

function svg(t: TrackModel): string {
  const rb = t.main;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const all = [rb, ...t.shortcuts];
  for (const r of all) {
    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minZ = Math.min(minZ, r.minZ);
    maxZ = Math.max(maxZ, r.maxZ);
  }
  const pad = 20;
  const W = maxX - minX + pad * 2;
  const H = maxZ - minZ + pad * 2;
  // SVG y axis goes down; map world -Z up so the map reads naturally from above (x to the right flipped to keep handedness)
  const X = (x: number): number => +(maxX + pad - x).toFixed(1);
  const Y = (z: number): number => +(maxZ + pad - z).toFixed(1);
  const parts: string[] = [];
  const edgePath = (r: Ribbon, side: -1 | 1, off: (i: number) => number): string => {
    let d = '';
    for (let i = 0; i < r.n; i++) {
      const o = off(i) * side;
      d += `${i ? 'L' : 'M'}${X(r.px[i] + r.rx[i] * o)},${Y(r.pz[i] + r.rz[i] * o)}`;
    }
    return d + (r.closed ? 'Z' : '');
  };
  for (const [ri, r] of all.entries()) {
    const color = ri === 0 ? '#5d6178' : '#ff9f1c';
    // road as thick polyline
    let d = '';
    for (let i = 0; i < r.n; i++) d += `${i ? 'L' : 'M'}${X(r.px[i])},${Y(r.pz[i])}`;
    if (r.closed) d += 'Z';
    const avgW = Array.from(r.hw).reduce((a, b) => a + b, 0) / r.n;
    parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${(avgW * 2).toFixed(1)}" stroke-linejoin="round" opacity="0.85"/>`);
    // boundaries coloured by edge type
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < r.n - (r.closed ? 0 : 1); i++) {
        const j = r.idx(i + 1);
        const e = side < 0 ? r.edgeL[i] : r.edgeR[i];
        const B = (k: number): number => r.hw[k] + (side < 0 ? r.shL[k] : r.shR[k]);
        if (r.flags[i] & F_GAP) continue;
        const c = e === EDGE_DROP ? '#ff4d6d' : e === EDGE_WALL ? '#3fa7ff' : '#4caf50';
        parts.push(`<line x1="${X(r.px[i] + r.rx[i] * B(i) * side)}" y1="${Y(r.pz[i] + r.rz[i] * B(i) * side)}" x2="${X(r.px[j] + r.rx[j] * B(j) * side)}" y2="${Y(r.pz[j] + r.rz[j] * B(j) * side)}" stroke="${c}" stroke-width="1.2"/>`);
      }
    }
    void edgePath;
    // ice
    for (let i = 0; i < r.n; i += 2) if (r.flags[i] & F_ICE) parts.push(`<circle cx="${X(r.px[i])}" cy="${Y(r.pz[i])}" r="${(r.hw[i] * 0.6).toFixed(1)}" fill="#8fd8ff" opacity="0.5"/>`);
    // gaps
    for (let i = 0; i < r.n; i++) if (r.flags[i] & F_GAP) parts.push(`<circle cx="${X(r.px[i])}" cy="${Y(r.pz[i])}" r="${r.hw[i].toFixed(1)}" fill="#111" opacity="0.7"/>`);
    for (const p of r.pads) {
      const i = r.indexAtS((p.s0 + p.s1) / 2);
      const dc = (p.d0 + p.d1) / 2;
      parts.push(`<circle cx="${X(r.px[i] + r.rx[i] * dc)}" cy="${Y(r.pz[i] + r.rz[i] * dc)}" r="2.2" fill="#ffd23f"/>`);
    }
    for (const rp of r.ramps) {
      const i = r.indexAtS(rp.s1);
      const dc = (rp.d0 + rp.d1) / 2;
      parts.push(`<rect x="${X(r.px[i] + r.rx[i] * dc) - 2.5}" y="${Y(r.pz[i] + r.rz[i] * dc) - 2.5}" width="5" height="5" fill="${rp.kind === 2 ? '#00e5ff' : '#ff6fae'}"/>`);
    }
  }
  for (const b of t.itemBoxes) parts.push(`<circle cx="${X(b.x)}" cy="${Y(b.z)}" r="1.4" fill="#e040fb"/>`);
  for (const h of t.data.hazards ?? []) {
    const i = rb.indexAtS(rb.sAtU(h.at));
    parts.push(`<circle cx="${X(rb.px[i])}" cy="${Y(rb.pz[i])}" r="3" fill="none" stroke="#7b1fa2" stroke-width="1.5"/>`);
  }
  // start line + direction arrow
  const i0 = 0;
  const hw0 = rb.hw[i0];
  parts.push(`<line x1="${X(rb.px[i0] - rb.rx[i0] * hw0)}" y1="${Y(rb.pz[i0] - rb.rz[i0] * hw0)}" x2="${X(rb.px[i0] + rb.rx[i0] * hw0)}" y2="${Y(rb.pz[i0] + rb.rz[i0] * hw0)}" stroke="#fff" stroke-width="2.5"/>`);
  const ia = rb.idx(25);
  parts.push(`<circle cx="${X(rb.px[ia])}" cy="${Y(rb.pz[ia])}" r="2.5" fill="#fff"/>`);
  // control point labels
  t.data.points.forEach((p, k) => {
    const x = t.mirror ? -p.x : p.x;
    parts.push(`<text x="${X(x) + 3}" y="${Y(p.z) - 3}" font-size="7" fill="#333">${k}${p.y ? ' y' + p.y : ''}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${Math.min(1200, W * 2).toFixed(0)}"><rect width="100%" height="100%" fill="#e8f5e9"/>${parts.join('')}<text x="6" y="14" font-size="12" fill="#000">${t.data.name} (${t.length.toFixed(0)} m)</text></svg>`;
}

let errors = 0;
for (const data of TRACKS) {
  if (!match(data.id)) continue;
  const r: Report = { id: data.id, errors: [], warnings: [], info: [] };
  try {
    const t = new TrackModel(data);
    geometryChecks(t, r);
    writeFileSync(`sim-report/tracks/${data.id}.svg`, svg(t));
    if (!noSim) {
      simCheck(data, false, r);
      simCheck(data, true, r);
    }
  } catch (e) {
    r.errors.push(`crashed: ${(e as Error).stack}`);
  }
  errors += r.errors.length;
  console.log(`\n== ${data.id} — ${data.name}`);
  for (const i of r.info) console.log('   ' + i);
  for (const w of r.warnings) console.log(' ! ' + w);
  for (const e of r.errors) console.log(' X ' + e);
}
console.log(errors ? `\n${errors} error(s)` : '\nAll tracks OK');
process.exit(errors ? 1 : 0);
