/**
 * Map sanity check (dev helper; the unit tests run the same rules over the registered maps):
 *   npx tsx scripts/check-maps.ts
 * Rows are even; NPCs, gifts, signs and triggers sit on walkable ground; warps land on walkable
 * tiles; every edge has a way back with the opposite offset, and every walkable border tile
 * arrives on a walkable tile next door.
 */
import { footprint, parseMap, type MapDef } from '../src/core/world/map';
import { TER } from '../src/data/terrain';
import { MAPS, START } from '../src/data/maps/index';
import { TRIAL_BY_ID, TRIALS } from '../src/data/trials';
import { SCRIPTS } from '../src/data/dialogue/index';
import type { Cmd, Script } from '../src/core/script';

/** Obstacles a friend can clear (so they don't cut a map in two for this check). */
const CLEARABLE = new Set(['vines', 'icewall', 'boulder', 'water-gap', 'gift']);

/**
 * Can you reach every door, person and gift from the ways into a map (doors, edges, Trial exits,
 * story warps), with every field ability? Returns problems.
 */
export function checkReach(maps: Record<string, MapDef>): string[] {
  const out: string[] = [];
  const entries = new Map<string, [number, number][]>();
  const add = (map: string, x: number, y: number) => { if (!entries.has(map)) entries.set(map, []); entries.get(map)!.push([x, y]); };
  add(START.map, START.x, START.y);
  for (const d of Object.values(maps)) for (const w of d.warps) if (maps[w.to]) add(w.to, w.tx, w.ty);
  for (const t of TRIALS) add(t.to.map, t.to.x, t.to.y);
  const scan = (l: Script) => { for (const c of l as Cmd[]) { if ('warp' in c) add(c.warp, c.x, c.y); for (const k of ['then', 'else', 'yes', 'no', 'win', 'lose', 'friend'] as const) { const sub = (c as Record<string, unknown>)[k]; if (Array.isArray(sub)) scan(sub as Script); } } };
  Object.values(SCRIPTS).forEach(scan);
  for (const d of Object.values(maps)) {
    const m = parseMap(d);
    const blocked = new Set<number>();
    for (const o of m.objects) if (!CLEARABLE.has(o.kind)) for (const f of footprint(o)) blocked.add(f.y * m.w + f.x);
    for (const n of d.npcs) if (!n.wander && !n.showIf && !n.hideIf) blocked.add(n.y * m.w + n.x);
    const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && TER[m.ter[y * m.w + x]!].walk && !blocked.has(y * m.w + x);
    const start: [number, number][] = [...(entries.get(d.id) ?? [])];
    for (const e of d.edges ?? []) {
      const len = e.side === 'n' || e.side === 's' ? m.w : m.h;
      for (let k = 0; k < len; k++) { const [x, y] = e.side === 'n' ? [k, 0] : e.side === 's' ? [k, m.h - 1] : e.side === 'w' ? [0, k] : [m.w - 1, k]; if (ok(x, y)) start.push([x, y]); }
    }
    const seen = new Set<number>();
    const queue = start.filter(([x, y]) => ok(x, y));
    for (const [x, y] of queue) seen.add(y * m.w + x);
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy, k = ny * m.w + nx;
        if (!seen.has(k) && ok(nx, ny)) { seen.add(k); queue.push([nx, ny]); }
      }
    }
    if (!seen.size) { out.push(`${d.id}: no way in`); continue; }
    const near = (x: number, y: number, reach = 1) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], ...(reach > 1 ? [[2, 0], [-2, 0], [0, 2], [0, -2]] : [])].some(([dx, dy]) => seen.has((y + dy!) * m.w + x + dx!) && x + dx! >= 0 && x + dx! < m.w);
    for (const w of d.warps) if (!near(w.x, w.y)) out.push(`${d.id}: can't reach the door at ${w.x},${w.y} (to ${w.to})`);
    for (const n of d.npcs) if (!near(n.x, n.y, 2)) out.push(`${d.id}: can't reach ${n.id} at ${n.x},${n.y}`);
    for (const o of m.objects) if ((o.kind === 'gift' || o.kind === 'sign' || o.script) && !near(o.x, o.y)) out.push(`${d.id}: can't reach ${o.id}`);
  }
  return out;
}

export function checkMaps(maps: Record<string, MapDef>): string[] {
  const out: string[] = [];
  const walk = (def: MapDef, x: number, y: number) => {
    const m = parseMap(def);
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    if (!TER[m.ter[y * m.w + x]!].walk) return false;
    return !m.objects.some(o => o.kind !== 'gift' && footprint(o).some(t => t.x === x && t.y === y));
  };
  for (const def of Object.values(maps)) {
    const bad = (msg: string) => out.push(`${def.id}: ${msg}`);
    const widths = new Set(def.rows.map(r => r.length));
    if (widths.size !== 1) { bad(`row widths ${[...widths].join(', ')}: ${def.rows.map((r, i) => `${i}:${r.length}`).join(' ')}`); continue; }
    let m;
    try { m = parseMap(def); } catch (e) { bad(String(e)); continue; }
    for (const n of def.npcs) if (!walk(def, n.x, n.y)) bad(`npc ${n.id} at ${n.x},${n.y} is not on free walkable ground`);
    for (const t of def.triggers) for (let j = 0; j < (t.h ?? 1); j++) for (let i = 0; i < (t.w ?? 1); i++) {
      const x = t.x + i, y = t.y + j;
      const tt = m.ter[y * m.w + x];
      if (!tt || !TER[tt].walk) bad(`trigger ${t.script} tile ${x},${y} is not walkable`);
    }
    for (const o of m.objects) {
      for (const f of footprint(o)) if (f.x < 0 || f.y < 0 || f.x >= m.w || f.y >= m.h) bad(`${o.id} outside the map`);
      if ((o.kind === 'gift' || o.kind === 'sign') && !TER[m.ter[o.y * m.w + o.x]!].walk) bad(`${o.id} stands on ${m.ter[o.y * m.w + o.x]}`);
    }
    for (const w of def.warps) {
      if (w.to.startsWith('trial:')) { if (!TRIAL_BY_ID[w.to.slice(6)]) bad(`warp to unknown trial ${w.to}`); continue; }
      const dest = maps[w.to];
      if (!dest) { bad(`warp to missing map ${w.to}`); continue; }
      if (!walk(dest, w.tx, w.ty)) bad(`warp at ${w.x},${w.y} lands on a blocked tile ${w.to} ${w.tx},${w.ty}`);
    }
    for (const e of def.edges ?? []) {
      const dest = maps[e.to];
      if (!dest) { bad(`edge ${e.side} to missing map ${e.to} (fine while that map is still to come)`); continue; }
      const back = dest.edges?.find(b => b.to === def.id);
      if (!back) { bad(`${e.to} has no edge back`); continue; }
      if (back.offset !== -e.offset) bad(`edge offsets ${e.offset} / ${back.offset} don't mirror`);
      const dm = parseMap(dest);
      const along = e.side === 'n' || e.side === 's' ? m.w : m.h;
      for (let k = 0; k < along; k++) {
        const [x, y] = e.side === 'n' ? [k, 0] : e.side === 's' ? [k, m.h - 1] : e.side === 'w' ? [0, k] : [m.w - 1, k];
        if (!walk(def, x, y)) continue;
        const [ax, ay] = e.side === 'n' ? [k + e.offset, dm.h - 1] : e.side === 's' ? [k + e.offset, 0] : e.side === 'w' ? [dm.w - 1, k + e.offset] : [0, k + e.offset];
        if (!walk(dest, ax, ay)) bad(`walking off ${e.side} at ${x},${y} lands on a blocked tile ${e.to} ${ax},${ay}`);
      }
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const extra: Record<string, MapDef> = {};
  for (const file of process.argv.slice(2)) Object.assign(extra, Object.fromEntries(Object.values(await import(file) as Record<string, unknown>).filter((v): v is MapDef => !!v && typeof v === 'object' && 'rows' in v).map(d => [d.id, d])));
  const problems = [...checkMaps({ ...MAPS, ...extra }), ...checkReach({ ...MAPS, ...extra })];
  console.log(problems.length ? problems.join('\n') : 'All maps look fine.');
}
