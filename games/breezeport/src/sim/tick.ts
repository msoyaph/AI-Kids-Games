/**
 * The town's clock tick: town time moves only while the town is on screen and active (the caller
 * decides), money flows, buildings grow and level up on their timers, and the city grant steps in
 * when the town is stuck. `Sim` keeps the census fresh: it's recomputed when the town changes and
 * every couple of seconds as people come and go.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { TUNING } from '../data/tuning';
import { census, type Census, type TrafficMap } from './census';
import { traffic as countTraffic, type Traffic } from './traffic';
import { dayIndex, seasonOf, type Season } from './clock';
import { giveGrant, grantDue, money, noteCensus } from './budget';
import { grow, levelUp } from './growth';
import type { Thing, Town } from './state';

export type SimEvent =
  | { type: 'built'; thing: Thing }
  | { type: 'level-up'; thing: Thing; level: number }
  | { type: 'collected'; thing: Thing; coins: number }
  | { type: 'grant' }
  | { type: 'new-day'; day: number }
  | { type: 'season'; season: Season }
  | { type: 'first-family' };

/** A fixed step, so the town plays the same at 30 fps, 120 fps or in a test. */
export const STEP = 0.25;

export class Sim {
  census!: Census;
  traffic: TrafficMap = null;
  /** The last traffic count (worked out when the town changes, at most every few seconds). */
  trips: Traffic | null = null;
  private trafficV = -1;
  private trafficAt = -Infinity;
  private seen = -1;
  private censusAt = -Infinity;
  private growAt = { home: 0, shop: 0, work: 0 };
  private levelAt = 0;
  private acc = 0;

  constructor(public town: Town) { this.refresh(true); }

  /** Recompute the census now (after the player changes the town) or when it's due. */
  refresh(force = false) {
    const v = this.town.version ?? 0;
    if (!force && v === this.seen && this.town.t - this.censusAt < 2) return this.census;
    this.census = census(this.town, this.traffic);
    this.seen = v;
    this.censusAt = this.town.t;
    // traffic follows the town's changes (not every census: one road search per home)
    if (v !== this.trafficV && this.town.t - this.trafficAt >= 3 || this.trafficV < 0) {
      this.trips = countTraffic(this.town, this.census);
      this.traffic = this.trips.car + this.trips.bus + this.trips.bike + this.trips.tram > 0 ? this.trips.load : null;
      this.trafficV = v;
      this.trafficAt = this.town.t;
    }
    return this.census;
  }

  /** Seconds until the next look: it changes a little with every building (see TUNING.growth). */
  private growthGap(base: number, per: number, max: number, min: number) {
    const c = this.census, G = TUNING.growth, s = this.town.stats;
    if ((s['built-home'] ?? 0) + (s['built-shop'] ?? 0) + (s['built-work'] ?? 0) < G.quickStart) return G.quickSec;
    return Math.max(min, Math.min(max, base + per * (c.homes.length + c.shops.length + c.works.length)));
  }

  /** Advance town time by `dt` seconds of play (in fixed steps). */
  advance(dt: number): SimEvent[] {
    const out: SimEvent[] = [];
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; this.step(STEP, out); }
    return out;
  }

  private step(dt: number, out: SimEvent[]) {
    const t = this.town;
    const day0 = dayIndex(t.t), season0 = seasonOf(t.t);
    t.t += dt;
    const c = this.refresh();
    for (const x of money(t, c, dt).collected) {
      const thing = t.things.find(th => th.id === x.id);
      if (thing && x.coins > 0) out.push({ type: 'collected', thing, coins: x.coins });
    }
    // growth: each zone looks for a lot every few seconds
    for (const zone of ['home', 'shop', 'work'] as const) {
      if (t.t < this.growAt[zone]) continue;
      this.growAt[zone] = t.t + this.growthGap(TUNING.growth.everySec, TUNING.growth.slowPerBuilding, TUNING.growth.maxEverySec, TUNING.growth.minEverySec) * (zone === 'home' ? 1 : 1.3);
      const thing = grow(t, this.refresh(true), zone);
      if (thing) {
        out.push({ type: 'built', thing });
        // the first home the player's zoning grows (the old cottages were already here)
        if (zone === 'home' && !t.flags.firstFamily) { t.flags.firstFamily = 1; out.push({ type: 'first-family' }); }
      }
    }
    if (t.t >= this.levelAt) {
      this.levelAt = t.t + this.growthGap(TUNING.growth.levelEverySec, TUNING.growth.levelSlowPerBuilding, TUNING.growth.maxLevelEverySec, TUNING.growth.minLevelEverySec);
      const e = levelUp(t, this.refresh());
      if (e) { out.push(e); this.refresh(true); }
    }
    if (grantDue(t, this.census)) { giveGrant(t); out.push({ type: 'grant' }); }
    if (dayIndex(t.t) !== day0) { noteCensus(t, this.census); out.push({ type: 'new-day', day: dayIndex(t.t) }); }
    if (seasonOf(t.t) !== season0) out.push({ type: 'season', season: seasonOf(t.t) });
  }
}
