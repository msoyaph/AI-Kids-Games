/**
 * Fishing: what bites where/when, bite timing, and the Tension Reel minigame (pure logic,
 * so tests and the bot can play it). Hold to reel: keep the line tension inside the green
 * zone while the fish tugs. Fill the catch meter to land it; too much tension for too long
 * and the fish wiggles free (nothing is lost).
 */
import { Rng } from '../core/rng';
import { FISH, FISH_BY_ID, JUNK, type FishDef, type Zone } from '../data/fish';
import { gainXp, hasPerk, level } from './skills';
import type { Sim } from './sim';
import { seasonOf } from './state';
import { isWet } from './weather';
import type { Loc } from './world';

export function zoneAt(loc: Loc, x: number, y: number): Zone | null {
  if (!loc.isWater(x, y)) return null;
  for (const z of loc.def.waterZones ?? []) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h && z.zone !== 'none') return z.zone as Zone;
  const w = loc.def.water;
  return w === 'none' ? null : (w as Zone);
}

export function inHours(min: number, [a, b]: [number, number]): boolean {
  return min >= a && min < b;
}

export function biteable(sim: Sim, zone: Zone): FishDef[] {
  const st = sim.state;
  const s = seasonOf(st.day);
  const wet = isWet(st.weather) || st.weather === 'snow';
  return FISH.filter(
    (f) => f.zones.includes(zone) && f.seasons.includes(s) && (f.weather === 'any' || (f.weather === 'rain' ? wet : !wet)) && inHours(st.min, f.time),
  );
}

export type Catch = { kind: 'fish'; id: string } | { kind: 'junk'; id: string };

export function pickCatch(sim: Sim, zone: Zone, rng: Rng): Catch {
  const opts = biteable(sim, zone);
  const junkChance = opts.length ? 0.07 : 1;
  if (rng.chance(junkChance) || !opts.length) return { kind: 'junk', id: rng.pick(JUNK) };
  const lucky = hasPerk(sim, 'luckyLure') ? 2 : 1;
  const weights = opts.map((f) => (f.rare ? (sim.state.col.fish[f.id] ? 0.3 : 1.2) * lucky : Math.max(0.6, 6 - f.difficulty) * (f.difficulty >= 4 ? lucky : 1)));
  return { kind: 'fish', id: rng.weighted(opts, weights).id };
}

/** Seconds until a bite. */
export function biteDelay(sim: Sim, rng: Rng, bait: boolean): number {
  const tier = Math.max(0, sim.p.tools.rod ?? 0);
  let d = 2 + rng.next() * 5;
  d *= 1 - tier * 0.08;
  if (bait) d *= 0.55;
  return Math.max(1.2, d);
}

export interface ReelParams {
  difficulty: number;
  /** half-width of the green zone (0..0.5) */
  zoneHalf: number;
  /** progress gained per second inside the zone */
  gain: number;
}

export function reelParams(sim: Sim, fishId: string | null): ReelParams {
  const d = fishId ? FISH_BY_ID[fishId]?.difficulty ?? 1 : 1;
  const tier = Math.max(0, sim.p.tools.rod ?? 0);
  const lvl = level(sim, 'fishing');
  const half = Math.min(0.32, 0.13 + tier * 0.03 + lvl * 0.008 + (hasPerk(sim, 'steadyHands') ? 0.04 : 0) - (d - 1) * 0.012);
  return { difficulty: d, zoneHalf: half, gain: 0.32 - d * 0.025 + lvl * 0.005 };
}

export class Reel {
  tension = 0.35;
  progress = 0.25;
  zone = 0.5;
  zoneVel = 0;
  over = 0;
  t = 0;
  tug = 0;
  nextTug = 1.2;
  perfect = true;
  done: 'caught' | 'escaped' | null = null;
  readonly p: ReelParams;
  private rng: Rng;

  constructor(p: ReelParams, seed: number) {
    this.p = p;
    this.rng = new Rng(seed);
  }

  inZone(): boolean {
    return Math.abs(this.tension - this.zone) <= this.p.zoneHalf;
  }

  update(dt: number, holding: boolean): void {
    if (this.done) return;
    this.t += dt;
    const d = this.p.difficulty;
    // the player's reel
    this.tension += (holding ? 0.62 : -0.5) * dt;
    // the fish tugs every so often
    this.nextTug -= dt;
    if (this.nextTug <= 0) {
      this.tug = (0.12 + d * 0.05) * (this.rng.chance(0.5) ? 1 : -0.6);
      this.nextTug = Math.max(0.5, 2.2 - d * 0.3) * (0.6 + this.rng.next() * 0.8);
    }
    if (this.tug !== 0) {
      const step = Math.sign(this.tug) * Math.min(Math.abs(this.tug), 0.9 * dt * (1 + d * 0.3));
      this.tension += step;
      this.tug -= step;
      if (Math.abs(this.tug) < 0.002) this.tug = 0;
    }
    // harder fish make the zone wander
    if (d >= 3) {
      if (this.rng.chance(dt * 0.8)) this.zoneVel = (this.rng.next() - 0.5) * 0.1 * (d - 2);
      this.zone = Math.max(0.25, Math.min(0.75, this.zone + this.zoneVel * dt));
    }
    this.tension = Math.max(0, Math.min(1, this.tension));
    if (this.inZone()) this.progress += this.p.gain * dt;
    else {
      this.progress -= 0.08 * dt;
      this.perfect = false;
    }
    if (this.tension >= 0.99) {
      this.over += dt;
      if (this.over > 0.8) this.done = 'escaped';
    } else this.over = Math.max(0, this.over - dt);
    if (this.progress >= 1) this.done = 'caught';
    else if (this.progress <= 0) this.done = 'escaped';
  }
}

/** A simple "skilled player" for tests & the bot. */
export function autoReel(r: Reel, dt = 1 / 30, maxT = 60): Reel['done'] {
  while (!r.done && r.t < maxT) r.update(dt, r.tension < r.zone);
  return r.done ?? 'escaped';
}

/** Land a fish / junk and record it. Returns quality and size (cm). */
export function landCatch(sim: Sim, c: Catch, perfect: boolean): { q: number; size: number } {
  if (c.kind === 'junk') {
    sim.give(c.id, 1);
    gainXp(sim, 'fishing', 2);
    return { q: 0, size: 0 };
  }
  const f = FISH_BY_ID[c.id];
  const rng = sim.rng(0xf15, sim.state.stats.fishCaught);
  const lvl = level(sim, 'fishing');
  const size = Math.round(f.size[0] + (f.size[1] - f.size[0]) * Math.min(1, rng.next() * (0.7 + lvl * 0.04)));
  let q = perfect ? 2 : rng.chance(0.15 + lvl * 0.04) ? 1 : 0;
  if (perfect && rng.chance(0.08 + lvl * 0.01)) q = 3;
  sim.give(c.id, 1, q);
  const st = sim.state;
  st.col.fish[c.id] = (st.col.fish[c.id] ?? 0) + 1;
  st.col.fishSize[c.id] = Math.max(st.col.fishSize[c.id] ?? 0, size);
  st.stats.fishCaught++;
  gainXp(sim, 'fishing', 6 + f.difficulty * 5 + (perfect ? 6 : 0));
  return { q, size };
}
