/**
 * The town's money, minute by minute of play: homes pay their town fee, shops and workplaces fill
 * their coin bubbles (collected by a tap, or by themselves when full), and services and transit cost
 * upkeep. Each town day is written to the history City Hall charts. Coins never go below zero, and the
 * city grant tops them up whenever the town is stuck.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import { DAY_SEC, dayIndex } from './clock';
import { residents, type Census } from './census';
import { bubbleSize } from './payouts';
import { bump, type Thing, type Town } from './state';

const M = TUNING.money;

/** Upkeep a minute of play, everything included (halved while a grant's help lasts). */
export function upkeepPerMin(town: Town): number {
  if (town.mode === 'creative') return 0;
  const U = TUNING.services.upkeep;
  let u = 0;
  for (const t of town.things) {
    const d = THING[t.def];
    if (!d) continue;
    if (d.service) u += U[d.service];
    else if (d.class === 'park' && (d.cost ?? 0) >= 90) u += U.park;
  }
  u += town.routes.length * U.bus;
  if (town.things.some(t => t.def === 'tramstop')) u += U.tram;
  if ((town.flags.halfUpkeepUntil ?? 0) > town.t) u *= 0.5;
  return u;
}

/** Town fees a minute of play. */
export function feesPerMin(c: Census) { return c.population * M.feePerResidentPerMin; }

/** What a business's bubble earns a minute right now. */
export function bubblePerMin(t: Thing, c: Census) { return bubbleSize(t) * (c.strength.get(t.id) ?? 0.3); }

export interface Money { income: number; upkeep: number; collected: { id: number; coins: number }[] }

/**
 * Advance the money by `dt` seconds of play. Full bubbles collect themselves; the day's totals go to
 * today's record. Returns what happened, for floating numbers and sounds.
 */
export function money(town: Town, c: Census, dt: number): Money {
  const out: Money = { income: 0, upkeep: 0, collected: [] };
  const fees = feesPerMin(c) * (dt / 60);
  const upkeep = upkeepPerMin(town) * (dt / 60);
  out.income += fees;
  out.upkeep += upkeep;
  if (town.mode !== 'creative') town.coins = Math.max(0, town.coins + fees - upkeep);
  for (const t of c.shops.concat(c.works)) {
    const full = bubbleSize(t);
    if (full <= 0) continue;
    // a bubble keeps filling only while it isn't full (and a full one waits a moment for a tap)
    t.pay = Math.min(full * 1.25, t.pay + bubblePerMin(t, c) * (dt / 60));
    if (t.pay >= full * 1.25 - 1e-6) out.collected.push({ id: t.id, coins: collect(town, t) });
  }
  const today = record(town);
  today.income += fees;
  today.upkeep += upkeep;
  for (const x of out.collected) today.income += x.coins;
  return out;
}

/** Collect a building's bubble now (a tap). Returns the coins. */
export function collect(town: Town, t: Thing): number {
  const coins = Math.floor(t.pay);
  if (coins <= 0) return 0;
  t.pay -= coins;
  if (town.mode !== 'creative') town.coins += coins;
  bump(town, 'collected', coins);
  return coins;
}

/** Collect what a tap on this building gives (and count it in today's record). */
export function tapCollect(town: Town, t: Thing): number {
  const coins = collect(town, t);
  record(town).income += coins;
  return coins;
}

/** Today's record (made on the first call of each town day). */
export function record(town: Town) {
  const day = dayIndex(town.t);
  let r = town.history.at(-1);
  if (!r || r.day !== day) {
    r = { day, income: 0, upkeep: 0, coins: Math.round(town.coins), pop: 0, happy: 0 };
    town.history.push(r);
    if (town.history.length > 12) town.history.splice(0, town.history.length - 12);
  }
  return r;
}

/** Write the census into today's record (end of each town hour). */
export function noteCensus(town: Town, c: Census) {
  const r = record(town);
  r.pop = c.population;
  r.happy = c.happy ?? 0;
  r.coins = Math.round(town.coins);
}

/**
 * The city grant: coins below the bar, and the town isn't earning its way back (no waiting bubbles,
 * fees under upkeep). Tops coins up and halves upkeep for a day. Never more often than everySec.
 */
export function grantDue(town: Town, c: Census): boolean {
  if (town.mode === 'creative') return false;
  const G = TUNING.grant;
  if (town.coins >= G.below) return false;
  if (town.t - (town.flags.lastGrant ?? -Infinity) < G.everySec) return false;
  const waiting = c.shops.concat(c.works).reduce((n, t) => n + t.pay, 0);
  const net = feesPerMin(c) + c.shops.concat(c.works).reduce((n, t) => n + bubblePerMin(t, c), 0) - upkeepPerMin(town);
  return waiting + net < G.below;
}

export function giveGrant(town: Town) {
  const G = TUNING.grant;
  town.coins = Math.max(town.coins, G.to);
  town.flags.lastGrant = town.t;
  town.flags.halfUpkeepUntil = town.t + G.halfUpkeepSec;
  bump(town, 'grants');
}

/** Coins a day right now (for City Hall and the bot): fees + bubbles − upkeep. */
export function netPerDay(town: Town, c: Census) {
  const perMin = feesPerMin(c) + c.shops.concat(c.works).reduce((n, t) => n + bubblePerMin(t, c), 0) - upkeepPerMin(town);
  return perMin * (DAY_SEC / 60);
}

export { residents };
