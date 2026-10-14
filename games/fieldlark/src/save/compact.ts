/**
 * Save format 2: the same farm, written small. The game's own shape (src/sim/state.ts) is unchanged;
 * only the stored text is compact, so the website's shared storage stays well inside its limit
 * (a worst-case farm is tested against a budget in tests/unit/storage.test.ts).
 *
 * - Everything on the land is a tuple, in order. Fields: [id, 'f', tile, crop, variety, plantedAt,
 *   growing time, care bits, last family, soil (nitrogen × 4 + humus), resting since]. Other things:
 *   [id, kind letter, def, tile, turn, data?]. A field's crop, variety and family are numbers into
 *   the save's own word list `D` (0: none), so the list can never go out of step with the game's data.
 * - Times are rounded to a tenth of a second; the paths string is run-length coded.
 * - The story keeps only the counters its current goals need; a helper's task starts fresh on load.
 *
 * `unpack` turns a format-2 save back into the plain shape that `decodeFarm` checks field by field.
 */
import { CHAPTERS } from '../data/chapters';
import { W } from '../sim/map';
import type { Farm } from '../sim/state';

type Raw = Record<string, unknown>;

const r1 = (n: number) => Math.round(n * 10) / 10;
const KIND_LETTER: Record<string, string> = { building: 'b', tree: 't', decor: 'd', debris: 'x' };
const LETTER_KIND: Record<string, string> = { b: 'building', t: 'tree', d: 'decor', x: 'debris' };

/** Rounds every number in plain data to a tenth (object data: queues, timers…). */
function roundDeep(v: unknown): unknown {
  if (typeof v === 'number') return Number.isInteger(v) ? v : r1(v);
  if (Array.isArray(v)) return v.map(roundDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)]));
  return v;
}

/** "a3000b2a131": a letter per path code (a = none … e = channel) and how many in a row. */
export function rle(paths: string): string {
  let out = '', i = 0;
  while (i < paths.length) {
    const c = paths[i]!;
    let j = i + 1;
    while (j < paths.length && paths[j] === c) j++;
    out += String.fromCharCode(97 + (c.charCodeAt(0) - 48)) + (j - i);
    i = j;
  }
  return out;
}

export function unrle(s: string): string {
  let out = '';
  for (const m of s.matchAll(/([a-z])(\d+)/g)) out += String.fromCharCode(48 + (m[1]!.charCodeAt(0) - 97)).repeat(Math.min(W * W, Number(m[2])));
  return out;
}

/** The story counters the current chapter's goals look at (nothing else is needed). */
function storyBase(farm: Farm): Record<string, number> {
  const ch = CHAPTERS[farm.story.chapter];
  if (!ch) return {};
  const out: Record<string, number> = {};
  for (const g of ch.goals) if (g.kind === 'stat' && farm.story.base[g.key] !== undefined) out[g.key] = farm.story.base[g.key]!;
  return out;
}

export function pack(farm: Farm, savedAt?: number): Raw {
  const things: unknown[] = [];
  const words: string[] = [];
  const word = (w: string | null) => { if (!w) return 0; let i = words.indexOf(w); if (i < 0) { words.push(w); i = words.length - 1; } return i + 1; };
  for (const o of farm.objects) {
    if (o.kind === 'field') {
      const bits = (o.watered ? 1 : 0) | (o.fertilized ? 2 : 0) | (o.rotation ? 4 : 0) | (o.boost ? 8 : 0) | (o.humus ? 16 : 0);
      things.push([o.id, 'f', o.z * W + o.x, word(o.crop), word(o.variety), o.crop ? r1(o.plantedAt) : 0, o.crop ? r1(o.readyAt - o.plantedAt) : 0, bits, word(o.last), o.nit * 4 + o.hum, o.restSince === null ? -1 : Math.round(o.restSince)]);
    } else {
      const t: unknown[] = [o.id, KIND_LETTER[o.kind] ?? 'd', o.def, o.z * W + o.x, o.rot];
      if (o.data && Object.keys(o.data).length) t.push(roundDeep(o.data));
      things.push(t);
    }
  }
  return {
    v: 2,
    seed: farm.seed, rng: farm.rng, t: r1(farm.t), coins: farm.coins, xp: farm.xp,
    unlocked: farm.unlocked,
    cam: [r1(farm.cam.x), r1(farm.cam.z), farm.cam.yawStep, r1(farm.cam.zoom)],
    flags: farm.flags,
    D: words, O: things, nextId: farm.nextId,
    inv: farm.inv, barnLevel: farm.barnLevel, scraps: farm.scraps,
    compostUntil: farm.compostUntil === null ? null : r1(farm.compostUntil),
    freeSeeds: farm.freeSeeds,
    ledger: farm.ledger.map(p => ({ s: p.season, g: p.grown, m: p.made, e: Math.round(p.earned), p: Math.round(p.spent), ce: p.cropEarned, cs: p.cropSpent })),
    paths: rle(farm.paths),
    storage: farm.storage,
    orders: farm.orders, nextOrderAt: farm.nextOrderAt === null ? null : r1(farm.nextOrderAt), orderSeq: farm.orderSeq,
    boat: { ...farm.boat, backAt: farm.boat.backAt === null ? null : r1(farm.boat.backAt) },
    neighbors: farm.neighbors, coop: farm.coop === null ? null : roundDeep(farm.coop),
    stats: farm.stats,
    story: { ...farm.story, base: storyBase(farm) },
    discovered: farm.discovered, ideas: farm.ideas,
    ribbons: farm.ribbons.map(r => [r.season, r.cat, r.place, r.grand ? 1 : 0]),
    ribbonCount: farm.ribbonCount,
    helpers: farm.helpers.map(h => ({ job: h.job, zone: h.zone, homes: h.homes, machine: h.machine, recipe: h.recipe, done: h.done, x: r1(h.x), z: r1(h.z) })),
    stand: { slots: farm.stand.slots, nextShopperAt: r1(farm.stand.nextShopperAt), days: farm.stand.days.map(d => roundDeep(d)) },
    contracts: farm.contracts.map(c => ({ ...c, wantedAt: r1(c.wantedAt) })),
    ...(savedAt !== undefined ? { savedAt } : {}),
  };
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** A format-2 save, back in the plain shape `decodeFarm` checks (anything odd is left for it to repair). */
export function unpack(raw: Raw): Raw {
  const objects: Raw[] = [];
  const words = arr(raw.D);
  const word = (i: unknown) => { const w = typeof i === 'number' && i > 0 ? words[i - 1] : null; return typeof w === 'string' ? w : null; };
  for (const t of arr(raw.O)) {
    const o = arr(t);
    if (o[1] === 'f') {
      const pos = num(o[2]), plantedAt = num(o[5]), bits = num(o[7]), soil = num(o[9], 5), rest = num(o[10], -1);
      objects.push({
        id: o[0], kind: 'field', def: 'field', x: pos % W, z: Math.floor(pos / W), rot: 0,
        crop: word(o[3]), variety: word(o[4]),
        plantedAt, readyAt: plantedAt + num(o[6]),
        watered: !!(bits & 1), fertilized: !!(bits & 2), rotation: !!(bits & 4), boost: !!(bits & 8), humus: !!(bits & 16),
        last: word(o[8]), nit: Math.floor(soil / 4), hum: soil % 4, restSince: rest < 0 ? null : rest,
      });
      continue;
    }
    const pos = num(o[3]);
    const obj: Raw = { id: o[0], kind: LETTER_KIND[o[1] as string] ?? 'decor', def: o[2], x: pos % W, z: Math.floor(pos / W), rot: o[4] };
    if (o[5] && typeof o[5] === 'object') obj.data = o[5];
    objects.push(obj);
  }
  const cam = arr(raw.cam);
  return {
    ...raw,
    v: 1,
    cam: { x: cam[0], z: cam[1], yawStep: cam[2], zoom: cam[3] },
    objects,
    paths: typeof raw.paths === 'string' ? unrle(raw.paths) : undefined,
    ledger: arr(raw.ledger).map(p => { const q = (p ?? {}) as Raw; return { season: q.s, grown: q.g, made: q.m, earned: q.e, spent: q.p, cropEarned: q.ce, cropSpent: q.cs }; }),
    ribbons: arr(raw.ribbons).map(r => { const q = arr(r); return { season: q[0], cat: q[1], place: q[2], ...(q[3] ? { grand: true } : {}) }; }),
  };
}
