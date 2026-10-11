// Fishing: fish shadows wander the water; cast near one, wait through nibbles, hook on the bite.
// Big fish (size >= 4) then need a short reel minigame.
import { Rng, hashInts } from '../core/rng';
import { FISH, FISH_BY_ID } from '../data/registry';
import type { FishDef, FishWhere } from '../data/types';
import { Ground, isWaterGround } from '../world/types';
import { hourInWindow } from './clock';
import type { Game, InteractCtx, Interaction } from './game';
import { give, markSeen, roomFor, stat } from './inventory';
import { facingVec } from './player';
import { wearTool } from './tools';
import { weatherOk } from './weather';
import { inSeason } from './seasons';

export interface Shadow {
  id: number;
  fish: string;
  size: number;
  where: FishWhere;
  x: number;
  z: number;
  tx: number;
  tz: number;
  heading: number;
  life: number;
  /** interest in the bobber */
  state: 'wander' | 'approach' | 'nibble' | 'gone';
  wait: number;
}

export interface Cast {
  phase: 'flying' | 'floating' | 'nibble' | 'bite' | 'reel' | 'caught' | 'escaped';
  x: number;
  z: number;
  t: number;
  target: number;
  nibbles: number;
  nextEvent: number;
  biteWindow: number;
  /** event counter so the view can trigger ripples/sounds */
  dips: number;
  reel?: Reel;
}

export interface Reel {
  progress: number;
  cursor: number;
  cursorV: number;
  zone: number;
  zoneW: number;
  zoneV: number;
  zoneTarget: number;
  t: number;
}

export interface FishingRuntime {
  shadows: Shadow[];
  cast: Cast | null;
  nextId: number;
  spawnT: number;
  rng: Rng;
  /** the most recent catch, for UI fanfare */
  lastCatch?: { id: string; size: number; t: number };
}

export const RARITY_WEIGHT: Record<number, number> = { 1: 100, 2: 45, 3: 16, 4: 5, 5: 1.6 };
const MAX_SHADOWS = 9;
const SPAWN_RADIUS = 20;

export function fishingRT(g: Game): FishingRuntime {
  let r = g.runtime.fishing as FishingRuntime | undefined;
  if (!r) {
    r = { shadows: [], cast: null, nextId: 1, spawnT: 0, rng: new Rng(hashInts(g.state.seed, g.state.clock.day, 77)) };
    g.runtime.fishing = r;
  }
  return r;
}

/** Location class of a water tile. */
export function waterKind(g: Game, i: number): FishWhere | null {
  const w = g.world;
  const gr = w.ground(i);
  if (!w.isWater(i)) return null;
  if (gr === Ground.Pond) return 'pond';
  if (gr === Ground.River) return nearOcean(g, i, 5) ? 'mouth' : 'river';
  if (gr === Ground.Ocean) return nearLand(g, i, 4) ? 'sea' : null;
  return null;
}

function nearOcean(g: Game, i: number, r: number): boolean {
  const w = g.world;
  const x = i % w.size, z = (i / w.size) | 0;
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++) if (w.inb(x + dx, z + dz) && w.ground(w.idx(x + dx, z + dz)) === Ground.Ocean) return true;
  return false;
}

function nearLand(g: Game, i: number, r: number): boolean {
  const w = g.world;
  const x = i % w.size, z = (i / w.size) | 0;
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++) if (w.inb(x + dx, z + dz) && !isWaterGround(w.ground(w.idx(x + dx, z + dz)))) return true;
  return false;
}

export function availableFish(g: Game, where: FishWhere): FishDef[] {
  const h = Math.floor(g.state.clock.minute / 60);
  return FISH.filter((f) => f.where.includes(where) && inSeason(g, f.seasons) && hourInWindow(h, f.hours[0], f.hours[1]) && weatherOk(f.weather, g.state.weather.today));
}

export function rollFish(g: Game, where: FishWhere, rng: Rng): FishDef | undefined {
  return rng.weighted(availableFish(g, where), (f) => RARITY_WEIGHT[f.rarity] ?? 1);
}

function spawnShadow(g: Game, rt: FishingRuntime): void {
  const p = g.state.player;
  const w = g.world;
  for (let tries = 0; tries < 25; tries++) {
    const x = Math.floor(p.x + rt.rng.range(-SPAWN_RADIUS, SPAWN_RADIUS));
    const z = Math.floor(p.z + rt.rng.range(-SPAWN_RADIUS * 0.8, SPAWN_RADIUS * 0.6));
    if (!w.inb(x, z)) continue;
    const i = w.idx(x, z);
    const kind = waterKind(g, i);
    if (!kind) continue;
    if (Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) < 4) continue;
    const f = rollFish(g, kind, rt.rng);
    if (!f) continue;
    rt.shadows.push({
      id: rt.nextId++,
      fish: f.id,
      size: f.size,
      where: kind,
      x: x + 0.5,
      z: z + 0.5,
      tx: x + 0.5,
      tz: z + 0.5,
      heading: rt.rng.range(0, Math.PI * 2),
      life: rt.rng.range(70, 140),
      state: 'wander',
      wait: 0,
    });
    return;
  }
}

/** Is world point (x,z) in water of the given kind? */
function sameWater(g: Game, x: number, z: number, kind: FishWhere): boolean {
  const w = g.world;
  const tx = Math.floor(x), tz = Math.floor(z);
  if (!w.inb(tx, tz)) return false;
  return waterKind(g, w.idx(tx, tz)) === kind;
}

/** Where the bobber would land, or null if not facing water. */
export function castTarget(g: Game): { x: number; z: number } | null {
  const p = g.state.player;
  const [fx, fz] = facingVec(p.facing);
  const w = g.world;
  for (let d = 1.4; d <= 4.2; d += 0.2) {
    const x = p.x + fx * d, z = p.z + fz * d;
    const tx = Math.floor(x), tz = Math.floor(z);
    if (!w.inb(tx, tz)) return null;
    const i = w.idx(tx, tz);
    if (w.isWater(i)) {
      // land a bit further in if possible
      const d2 = Math.min(d + 1.1, 4.4);
      const x2 = p.x + fx * d2, z2 = p.z + fz * d2;
      const i2 = w.idx(Math.floor(x2), Math.floor(z2));
      if (w.inb(Math.floor(x2), Math.floor(z2)) && w.isWater(i2)) return { x: x2, z: z2 };
      return { x, z };
    }
    // blocked by a cliff wall above us
    if (w.height(i) > p.level) return null;
  }
  return null;
}

export function startCast(g: Game): boolean {
  const rt = fishingRT(g);
  if (rt.cast) return false;
  const t = castTarget(g);
  if (!t) return false;
  rt.cast = { phase: 'flying', x: t.x, z: t.z, t: 0, target: -1, nibbles: 0, nextEvent: 0.45, biteWindow: 0, dips: 0 };
  g.mode = 'minigame';
  g.emit('sfx', { name: 'cast' });
  stat(g, 'casts');
  return true;
}

export function endCast(g: Game): void {
  const rt = fishingRT(g);
  if (rt.cast?.target !== undefined) {
    const sh = rt.shadows.find((s) => s.id === rt.cast!.target);
    if (sh && sh.state !== 'gone') {
      sh.state = 'wander';
      sh.wait = 3;
    }
  }
  rt.cast = null;
  if (g.mode === 'minigame') g.mode = 'play';
}

function scare(g: Game, rt: FishingRuntime, c: Cast): void {
  const sh = rt.shadows.find((s) => s.id === c.target);
  if (sh) {
    sh.state = 'gone';
    sh.life = 0;
    g.emit('fishLost', { size: sh.size });
    markSeen(g, sh.fish);
  }
}

/** Action button while fishing. */
export function fishingPress(g: Game): void {
  const rt = fishingRT(g);
  const c = rt.cast;
  if (!c) return;
  switch (c.phase) {
    case 'flying':
    case 'floating':
      g.emit('sfx', { name: 'reelIn' });
      endCast(g);
      break;
    case 'nibble':
      scare(g, rt, c);
      g.toast('Too soon! The fish got away.', 'warn');
      g.emit('sfx', { name: 'splash' });
      c.phase = 'escaped';
      c.t = 0;
      break;
    case 'bite': {
      const sh = rt.shadows.find((s) => s.id === c.target);
      if (!sh) {
        endCast(g);
        return;
      }
      g.emit('sfx', { name: 'hook' });
      if (sh.size >= 4) {
        const def = FISH_BY_ID[sh.fish]!;
        c.phase = 'reel';
        c.t = 0;
        c.reel = { progress: 0.35, cursor: 0.5, cursorV: 0, zone: 0.5, zoneW: 0.3 - def.rarity * 0.025, zoneV: 0, zoneTarget: 0.5, t: 0 };
      } else landFish(g, rt, c, sh);
      break;
    }
    default:
      break;
  }
}

function landFish(g: Game, rt: FishingRuntime, c: Cast, sh: Shadow): void {
  const def = FISH_BY_ID[sh.fish]!;
  sh.state = 'gone';
  sh.life = 0;
  c.phase = 'caught';
  c.t = 0;
  wearTool(g);
  if (roomFor(g, def.id, 1) < 1) g.toast('Pockets full — your catch went to home storage.', 'warn');
  give(g, def.id, 1, 'fishing');
  stat(g, 'fishCaught');
  if (def.size >= 5) stat(g, 'bigFish');
  rt.lastCatch = { id: def.id, size: def.size, t: 0 };
  g.runtime.lastCatchId = def.id;
  g.emit('fishCaught', { id: def.id, size: def.size, where: sh.where, rarity: def.rarity });
  g.emit('sfx', { name: def.rarity >= 3 ? 'fanfareBig' : 'fanfare' });
  g.emit('fx', { kind: 'splash', x: c.x, y: 0, z: c.z });
  g.toast(`You caught a ${def.name}!${catchQuip(def)}`, 'good', def.id);
  g.startAction('celebrate', 1.4, 0.1);
}

function catchQuip(def: FishDef): string {
  if (def.rarity >= 5) return ' Legendary!';
  if (def.rarity >= 4) return ' What a rare find!';
  if (def.size >= 6) return ' It is ENORMOUS!';
  if (def.size <= 1) return ' Tiny but mighty.';
  return '';
}

/** Per-frame update. `held` = action button held (for reeling). */
export function updateFishing(g: Game, dt: number, held: boolean, moving: boolean): void {
  const rt = fishingRT(g);
  if (g.state.player.location !== 'island') return;
  // shadows population
  rt.spawnT -= dt;
  rt.shadows = rt.shadows.filter((s) => s.life > 0 && Math.hypot(s.x - g.state.player.x, s.z - g.state.player.z) < SPAWN_RADIUS + 10);
  if (rt.spawnT <= 0 && rt.shadows.length < MAX_SHADOWS) {
    spawnShadow(g, rt);
    rt.spawnT = 1.2;
  }
  const c = rt.cast;
  for (const s of rt.shadows) {
    if (!c || s.id !== c.target) s.life -= dt;
    if (s.state === 'wander') {
      const d = Math.hypot(s.tx - s.x, s.tz - s.z);
      if (d < 0.15 || s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0 && d < 0.15) {
          for (let k = 0; k < 6; k++) {
            const nx = s.x + rt.rng.range(-2, 2), nz = s.z + rt.rng.range(-2, 2);
            if (sameWater(g, nx, nz, s.where)) {
              s.tx = nx;
              s.tz = nz;
              break;
            }
          }
          s.wait = rt.rng.range(0.5, 2.5);
        }
      } else moveShadow(s, s.tx, s.tz, 0.55, dt);
      // notice a floating bobber
      if (c && c.phase === 'floating' && c.target < 0 && Math.hypot(c.x - s.x, c.z - s.z) < 3.6 && rt.rng.chance(dt * 1.6)) {
        c.target = s.id;
        s.state = 'approach';
      }
    } else if (s.state === 'approach' && c) {
      moveShadow(s, c.x, c.z, 0.7, dt);
      if (Math.hypot(c.x - s.x, c.z - s.z) < 0.55 + s.size * 0.06) {
        s.state = 'nibble';
        c.phase = 'nibble';
        c.nibbles = 1 + Math.floor(rt.rng.next() * 3);
        c.nextEvent = rt.rng.range(0.4, 1.0);
      }
    } else if (s.state === 'nibble' && c) {
      s.heading += Math.sin(g.state.playSeconds * 9) * dt * 0.5;
    }
  }
  if (!c) return;
  c.t += dt;
  if (moving && (c.phase === 'floating' || c.phase === 'flying')) {
    endCast(g);
    return;
  }
  switch (c.phase) {
    case 'flying':
      if (c.t >= 0.45) {
        c.phase = 'floating';
        c.t = 0;
        g.emit('sfx', { name: 'plop', vol: 0.5 });
        g.emit('fx', { kind: 'ripple', x: c.x, y: 0, z: c.z });
        // scare away fish right under a clumsy cast
        for (const s of rt.shadows) if (Math.hypot(s.x - c.x, s.z - c.z) < 0.5 && s.state === 'wander') s.tx = s.x + (s.x - c.x) * 4;
      }
      break;
    case 'floating':
      if (c.t > 25) {
        g.toast('Nothing is biting here. Try casting closer to a shadow.');
        endCast(g);
      }
      break;
    case 'nibble':
      c.nextEvent -= dt;
      if (c.nextEvent <= 0) {
        if (c.nibbles > 0) {
          c.nibbles--;
          c.dips++;
          g.emit('sfx', { name: 'nibble' });
          g.emit('fx', { kind: 'ripple', x: c.x, y: 0, z: c.z });
          c.nextEvent = rt.rng.range(0.45, 1.05);
        } else {
          const sh = rt.shadows.find((s) => s.id === c.target);
          const def = sh ? FISH_BY_ID[sh.fish] : undefined;
          c.phase = 'bite';
          c.t = 0;
          c.dips++;
          c.biteWindow = Math.max(0.36, 0.78 - (def?.rarity ?? 1) * 0.08);
          g.emit('sfx', { name: 'bite' });
          g.emit('fx', { kind: 'bite', x: c.x, y: 0, z: c.z });
        }
      }
      break;
    case 'bite':
      if (c.t > c.biteWindow) {
        scare(g, rt, c);
        g.toast('It got away...', 'warn');
        g.emit('sfx', { name: 'splash' });
        c.phase = 'escaped';
        c.t = 0;
      }
      break;
    case 'reel': {
      const r = c.reel!;
      r.t += dt;
      const sh = rt.shadows.find((s) => s.id === c.target);
      const def = sh ? FISH_BY_ID[sh.fish] : undefined;
      const agility = 0.35 + (def?.size ?? 4) * 0.08 + (def?.rarity ?? 1) * 0.06;
      // the fish darts the zone around
      if (Math.abs(r.zone - r.zoneTarget) < 0.04 || rt.rng.chance(dt * 0.9)) r.zoneTarget = rt.rng.range(r.zoneW / 2, 1 - r.zoneW / 2);
      r.zoneV += (r.zoneTarget - r.zone) * agility * 6 * dt;
      r.zoneV *= Math.exp(-3 * dt);
      r.zone = Math.min(1 - r.zoneW / 2, Math.max(r.zoneW / 2, r.zone + r.zoneV * dt));
      // the player lifts the cursor by holding; gravity pulls it back
      r.cursorV += (held ? 2.6 : -2.2) * dt;
      r.cursorV *= Math.exp(-2.5 * dt);
      r.cursor += r.cursorV * dt;
      if (r.cursor < 0) {
        r.cursor = 0;
        r.cursorV = 0;
      }
      if (r.cursor > 1) {
        r.cursor = 1;
        r.cursorV = 0;
      }
      const inZone = Math.abs(r.cursor - r.zone) < r.zoneW / 2;
      r.progress += (inZone ? 0.32 : -0.2) * dt;
      if (r.progress >= 1 && sh) landFish(g, rt, c, sh);
      else if (r.progress <= 0) {
        scare(g, rt, c);
        wearTool(g);
        g.toast('The line went slack... it escaped!', 'warn');
        g.emit('sfx', { name: 'splash' });
        c.phase = 'escaped';
        c.t = 0;
      }
      break;
    }
    case 'caught':
    case 'escaped':
      if (c.t > 0.8) endCast(g);
      break;
  }
}

function moveShadow(s: Shadow, tx: number, tz: number, speed: number, dt: number): void {
  const dx = tx - s.x, dz = tz - s.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-3) return;
  const step = Math.min(d, speed * dt);
  s.x += (dx / d) * step;
  s.z += (dz / d) * step;
  s.heading = Math.atan2(dx, dz);
}

export function fishingResolver(g: Game, ctx: InteractCtx): Interaction | null {
  if (!ctx.tool || ctx.tool.kind !== 'rod') return null;
  if (fishingRT(g).cast) return null;
  const t = castTarget(g);
  if (!t) return null;
  return { label: 'Cast line', priority: 45, run: () => startCast(g) };
}

/** Reset runtime (new day / location change). */
export function resetFishing(g: Game): void {
  const rt = fishingRT(g);
  rt.shadows = [];
  rt.cast = null;
  rt.rng = new Rng(hashInts(g.state.seed, g.state.clock.day, 77));
}

