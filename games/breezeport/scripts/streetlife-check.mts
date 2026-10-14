// Headless check of the style frame's street life (CPU only): cars keep moving, don't pile into
// each other, and walkers stay on their loops.   npx tsx scripts/streetlife-check.mts
import { PARK_LOOP, STANDING, styleFrameCity } from '../src/game/styleframe';
import { StreetLife } from '../src/render/streetlife';
import type { Walker } from '../src/render/walkers';
const city = styleFrameCity(7);
const life = new StreetLife(city, 92, { cars: 16, buses: 1, walkers: 64 }, [PARK_LOOP]);
for (const [x, z, h] of STANDING) life.addStanding(x, z, h);
const out: Walker[] = [];
const vs = (life as unknown as { vehicles: { pos: { x: number; z: number }; kind: string; v: number; wait: number }[] }).vehicles;
let minGap = Infinity, stuckMax = 0, moved = 0, close = 0, checks = 0;
const start = vs.map(v => ({ x: v.pos.x, z: v.pos.z }));
for (let f = 0; f < 60 * 180; f++) {
  life.update(1 / 60);
  if (f % 30 === 0) {
    life.draw(null, out);
    const inTown = vs.filter(v => v.pos.x > 0 && v.pos.z > 0 && v.pos.x < 40 && v.pos.z < 36);
    for (let i = 0; i < inTown.length; i++) for (let j = i + 1; j < inTown.length; j++) { const g = Math.hypot(inTown[i]!.pos.x - inTown[j]!.pos.x, inTown[i]!.pos.z - inTown[j]!.pos.z); minGap = Math.min(minGap, g); checks++; if (g < 0.3) close++; }
    for (const v of vs) { stuckMax = Math.max(stuckMax, v.wait); if (!Number.isFinite(v.pos.x)) throw new Error('NaN car'); }
    for (const w of out) if (!Number.isFinite(w.x) || !Number.isFinite(w.z)) throw new Error('NaN walker');
  }
}
moved = vs.filter((v, i) => Math.hypot(v.pos.x - start[i]!.x, v.pos.z - start[i]!.z) > 0.5).length;
console.log(`vehicles ${vs.length}, moved ${moved}, closest pair in town ${minGap.toFixed(2)} tiles (pairs under 0.3: ${close} of ${checks} checks), longest wait ${stuckMax.toFixed(1)} s, walkers drawn ${out.length}`);
