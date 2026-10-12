// Life after (and alongside) the story: seasonal festivals, contest days, Wanda the traveling
// merchant, meteor showers, villager birthdays, the glow streak and the full-museum reward.
// Nothing here starts before Chapter 3, and nothing here is ever needed to finish the story.
import { dayRng } from '../core/rng';
import { BIRTHDAYS, CONTEST_DAYS, FESTIVALS, FESTIVAL_BY_ID, MERCHANT, type FestivalDef, type FestivalId } from '../data/festivals';
import { CLOTHING, FURNITURE, RECIPES, SEED_ITEMS, item } from '../data/registry';
import { VILLAGER_BY_ID } from '../data/villagers';
import { Ground } from '../world/types';
import type { Game } from './game';
import { give, money, roomFor } from './inventory';
import { islandStars } from './rating';
import { SEASONS, inSeason } from './seasons';
import { residents } from './villagers';
import type { StockEntry } from './economy';
import { WING_TOTAL, wingCount } from './museum';
import { learnRecipe } from './crafting';

/** Optional events wait until the second chapter is finished. */
export function happeningsOpen(g: Game): boolean {
  return g.state.quests.chapter >= 3 || g.state.quests.finished;
}

const hour = (g: Game) => g.state.clock.minute / 60;

// ---------------------------------------------------------------- festivals

export interface FestivalState {
  id: FestivalId;
  day: number;
  progress: number;
  /** what's been handed in (flower colors, fruit/fish counts) */
  got: string[];
  done: boolean;
}

/** Today's festival, if there is one (whether or not it has started yet). */
export function festivalToday(g: Game): FestivalDef | null {
  if (!happeningsOpen(g) || g.state.quests.active.m5_finale) return null;
  const season = SEASONS[g.state.season.index]!;
  return FESTIVALS.find((f) => f.season === season && f.day === g.state.season.day) ?? null;
}

/** The festival happening right now (inside its hours). */
export function festivalNow(g: Game): FestivalDef | null {
  const f = festivalToday(g);
  if (!f) return null;
  const h = hour(g);
  return h >= f.hours[0] && h < f.hours[1] ? f : null;
}

/** The host, or Pemberly if the host hasn't moved in yet. */
export function festivalHost(g: Game, f: FestivalDef): string {
  return g.state.villagers[f.host]?.movedIn ? f.host : 'pemberly';
}

export function festivalState(g: Game): FestivalState | null {
  const f = festivalToday(g);
  if (!f) return null;
  let st = g.state.events.festival;
  if (!st || st.id !== f.id || st.day !== g.state.clock.day) {
    st = { id: f.id, day: g.state.clock.day, progress: 0, got: [], done: false };
    g.state.events.festival = st;
  }
  return st;
}

/** Hand in what the festival needs from your pockets. Returns how many things were taken. */
export function festivalHandIn(g: Game): number {
  const f = festivalNow(g);
  const st = festivalState(g);
  if (!f || !st || st.done) return 0;
  const inv = g.state.player.inv;
  let taken = 0;
  const take = (k: number) => {
    const s = inv[k]!;
    s.qty -= 1;
    if (s.qty <= 0) inv[k] = null;
    taken++;
    st.progress++;
  };
  if (f.id === 'flowerFair') {
    for (let k = 0; k < inv.length && st.progress < f.need; k++) {
      const s = inv[k];
      if (!s || !s.id.startsWith('flower_')) continue;
      const color = s.id.slice(s.id.lastIndexOf('_') + 1);
      if (st.got.includes(color)) continue;
      st.got.push(color);
      take(k);
    }
  } else if (f.id === 'starNight') {
    for (let k = 0; k < inv.length && st.progress < f.need; k++) while (inv[k]?.id === 'falling_star' && st.progress < f.need) take(k);
  } else if (f.id === 'harvestFeast') {
    const fruit = () => st.got.filter((x) => x === 'fruit').length;
    const fish = () => st.got.filter((x) => x === 'fish').length;
    for (let k = 0; k < inv.length; k++) {
      const s = inv[k];
      if (!s) continue;
      const cat = item(s.id).cat;
      while (inv[k] && ((cat === 'fruit' && fruit() < 3) || (cat === 'fish' && fish() < 2))) {
        st.got.push(cat);
        take(k);
      }
    }
  }
  if (taken) g.emit('inventoryChanged', {});
  if (st.progress >= f.need) finishFestival(g);
  return taken;
}

export function finishFestival(g: Game): void {
  const f = festivalToday(g);
  const st = festivalState(g);
  if (!f || !st || st.done) return;
  st.done = true;
  st.progress = f.need;
  for (const id of f.reward.items) give(g, id, 1, 'festival');
  money(g, 0, f.reward.lumens, 'festival');
  g.state.stats.festivals = (g.state.stats.festivals ?? 0) + 1;
  g.state.flags[`festival_${f.id}`] = (g.state.flags[`festival_${f.id}`] ?? 0) + 1;
  g.emit('festivalDone', { id: f.id });
  g.emit('sfx', { name: 'fanfareBig' });
}

/** Lantern Skate: rings on the frozen pond (tile centres), generated per island. */
export function skateRings(g: Game): { x: number; z: number }[] {
  const cached = g.runtime.skateRings as { x: number; z: number }[] | undefined;
  if (cached) return cached;
  const out = findSkateRings(g);
  g.runtime.skateRings = out;
  return out;
}

function findSkateRings(g: Game): { x: number; z: number }[] {
  const w = g.world;
  const pond: number[] = [];
  for (let i = 0; i < w.size * w.size; i++) if (w.ground(i) === Ground.Pond) pond.push(i);
  if (!pond.length) return [];
  const rng = dayRng(g.state.seed, 7, 'rings');
  rng.shuffle(pond);
  const out: { x: number; z: number }[] = [];
  // spread out first; on a small pond the last rings sit closer so there are always five
  for (const gap of [2.2, 1.6, 1.1])
    for (const i of pond) {
      if (out.length === 5) return out;
      const x = (i % w.size) + 0.5, z = Math.floor(i / w.size) + 0.5;
      if (out.every((r) => Math.hypot(r.x - x, r.z - z) > gap)) out.push({ x, z });
    }
  return out;
}

/** Distance from point (px, pz) to the segment a→b. */
function segDist(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz;
  const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(ax + dx * t - px, az + dz * t - pz);
}

/** Is the pond frozen solid right now (Lantern Skate)? */
export function pondFrozen(g: Game): boolean {
  return festivalNow(g)?.id === 'lanternSkate';
}

function updateFestival(g: Game): void {
  const f = festivalNow(g);
  if (!f || g.state.player.location !== 'island') return;
  const st = festivalState(g)!;
  if (st.done) return;
  if (f.id === 'lanternSkate') {
    const p = g.state.player;
    const rings = skateRings(g);
    const need = Math.min(f.need, rings.length);
    // swept: skating straight through a ring between two frames still counts
    let last = (g.runtime.skateLast as { x: number; z: number } | undefined) ?? { x: p.x, z: p.z };
    if (Math.hypot(p.x - last.x, p.z - last.z) > 2) last = { x: p.x, z: p.z }; // a jump, not a skate
    g.runtime.skateLast = { x: p.x, z: p.z };
    rings.forEach((r, k) => {
      const key = `ring${k}`;
      if (st.got.includes(key) || segDist(last.x, last.z, p.x, p.z, r.x, r.z) > 0.75) return;
      st.got.push(key);
      st.progress++;
      g.emit('sfx', { name: 'sparkle' });
      g.emit('fx', { kind: 'sparkle', x: r.x, y: 0, z: r.z, color: 0xffd27a });
      g.toast(`Ring ${st.progress} of ${need}!`, 'good');
    });
    if (st.progress >= need) finishFestival(g);
  }
}

/** Star Night: falling stars land near the plaza through the evening. */
function starNightSpawns(g: Game): void {
  const f = festivalNow(g);
  if (!f || f.id !== 'starNight') return;
  const objs = g.state.world.objects;
  let have = 0;
  for (const key in objs) if (objs[key]!.item === 'falling_star') have++;
  if (have >= 4) return;
  const w = g.world;
  const pl = w.gen.lots.plaza;
  const rng = dayRng(g.state.seed, g.state.clock.day * 97 + Math.floor(g.state.clock.minute), 'stars');
  for (let t = 0; t < 20; t++) {
    const x = Math.floor(pl.x - 4 + rng.next() * (pl.w + 8)), z = Math.floor(pl.z - 4 + rng.next() * (pl.d + 8));
    if (!w.inb(x, z)) continue;
    const i = w.idx(x, z);
    if (objs[i] || w.structure(i) || !w.standable(i)) continue;
    objs[i] = { k: 'item', item: 'falling_star', q: 1, tag: 'spawn' };
    g.emit('fx', { kind: 'sparkle', x: x + 0.5, y: 0, z: z + 0.5, color: 0xffe27a });
    g.emit('objectsChanged', { tiles: [i] });
    return;
  }
}

// ---------------------------------------------------------------- contest days

/** Is today a contest day for this contest (after its story mission)? */
export function contestDay(g: Game, kind: 'tournament' | 'bugoff'): boolean {
  return g.state.season.day === CONTEST_DAYS[kind];
}

// ---------------------------------------------------------------- Wanda the traveling merchant

export function merchantHere(g: Game): boolean {
  if (!happeningsOpen(g)) return false;
  const d = g.state.clock.day;
  if (d < MERCHANT.every + MERCHANT.offset || (d - MERCHANT.offset) % MERCHANT.every !== 0) return false;
  const h = hour(g);
  return h >= MERCHANT.hours[0] && h < MERCHANT.hours[1];
}

/** Wanda's wares: rare furniture, out-of-season seeds and a stylish piece of clothing. */
export function merchantStock(g: Game): StockEntry[] {
  const rng = dayRng(g.state.seed, g.state.clock.day, 'wanda');
  const rare = FURNITURE.filter((f) => f.buy === 0 && f.furn.outdoor && !f.id.startsWith('furn_trophy') && !RECIPES.some((r) => r.result === f.id && (r.unlock === 'lumen' || r.unlock === 'museum' || r.unlock === 'season')));
  const seeds = SEED_ITEMS.filter((s) => s.seasons && !inSeason(g, s.seasons));
  const clothes = CLOTHING.filter((c) => c.source === 'gift');
  const out: StockEntry[] = [];
  for (const f of rng.shuffle([...rare]).slice(0, 2)) out.push({ id: f.id, price: Math.round((f.price * 4 * MERCHANT.markup) / 10) * 10, limited: true });
  if (seeds.length) {
    const s = rng.pick(seeds);
    out.push({ id: s.id, price: 240, limited: false });
  }
  const c = rng.pick(clothes);
  out.push({ id: c.id, price: Math.round((c.price * 4 * MERCHANT.markup) / 10) * 10, limited: true });
  return out;
}

/** Buy from Wanda (her limited pieces sell out for the day). */
export function buyFromMerchant(g: Game, e: StockEntry): boolean {
  const ev = g.state.events;
  if (!ev.merchant || ev.merchant.day !== g.state.clock.day) ev.merchant = { day: g.state.clock.day, sold: [] };
  if (e.limited && ev.merchant.sold.includes(e.id)) return false;
  if (g.state.player.glints < e.price) {
    g.toast("You don't have enough Glints.", 'warn');
    return false;
  }
  if (roomFor(g, e.id, 1) < 1) {
    g.toast('Your pockets are full!', 'warn');
    return false;
  }
  money(g, -e.price, 0, 'merchant');
  give(g, e.id, 1, 'buy');
  if (e.limited) ev.merchant.sold.push(e.id);
  g.emit('itemBought', { id: e.id, qty: 1, total: e.price });
  g.emit('sfx', { name: 'coins' });
  return true;
}

// ---------------------------------------------------------------- meteor showers

/** The night's roll for shooting stars (about one night in eight), before the weather has its say. */
export function meteorRoll(g: Game, day: number): boolean {
  return dayRng(g.state.seed, day, 'meteor').next() < 0.13;
}

/**
 * A clear night with shooting stars (after Chapter 2). Today uses today's weather; an earlier
 * night only counts if it really had them (remembered in `flags.meteorDay` each morning).
 */
export function meteorNight(g: Game, day = g.state.clock.day): boolean {
  if (!happeningsOpen(g)) return false;
  if (day !== g.state.clock.day) return g.state.flags.meteorDay === day;
  if (g.state.weather.today === 'rain') return false;
  return meteorRoll(g, day);
}

/** Shooting stars are visible now. */
export function meteorsNow(g: Game): boolean {
  const h = hour(g);
  return (h >= 20 || h < 4) && meteorNight(g, h < 4 ? g.state.clock.day - 1 : g.state.clock.day);
}

/** The morning after a meteor shower, stardust washes up on the beach. */
function stardustSpawns(g: Game): void {
  if (!meteorNight(g, g.state.clock.day - 1)) return;
  const w = g.world;
  const objs = g.state.world.objects;
  const rng = dayRng(g.state.seed, g.state.clock.day, 'stardust');
  const sand: number[] = [];
  for (let i = 0; i < w.size * w.size; i++) if (w.ground(i) === Ground.Sand && !objs[i] && !w.structure(i)) sand.push(i);
  rng.shuffle(sand);
  for (const i of sand.slice(0, 4)) objs[i] = { k: 'item', item: 'stardust', q: 1, tag: 'spawn' };
  g.toast('Stardust washed up on the beach after last night\'s shooting stars!', 'good', 'stardust');
}

// ---------------------------------------------------------------- birthdays

export function birthdayToday(g: Game): string | null {
  const s = g.state.season;
  for (const id of residents(g)) {
    const b = BIRTHDAYS[id];
    if (b && b[0] === s.index && b[1] === s.day) return id;
  }
  return null;
}

export function isBirthday(g: Game, id: string): boolean {
  return birthdayToday(g) === id;
}

// ---------------------------------------------------------------- glow streak + museum

export const GLOW_STREAK_REWARDS: [number, number][] = [
  [3, 500],
  [7, 1500],
  [14, 3000],
];

function dailyGlowStreak(g: Game): void {
  const f = g.state.flags;
  if (islandStars(g) >= 5) f.glowStreak = (f.glowStreak ?? 0) + 1;
  else f.glowStreak = 0;
  f.glowBest = Math.max(f.glowBest ?? 0, f.glowStreak);
  for (const [days, lumens] of GLOW_STREAK_REWARDS) {
    if (f.glowStreak >= days && !f[`glowReward${days}`]) {
      f[`glowReward${days}`] = 1;
      money(g, 0, lumens, 'glowStreak');
      if (days === 14) give(g, 'furn_glow_banner', 1, 'glowStreak');
      g.toast(`✨ ${days} days of a 5-lantern island! +${lumens} Lumens${days === 14 ? ' and a Glow Banner' : ''}!`, 'good');
    }
  }
}

export function museumComplete(g: Game): boolean {
  return wingCount(g, 'fish') >= WING_TOTAL.fish && wingCount(g, 'bugs') >= WING_TOTAL.bugs && wingCount(g, 'fossils') >= WING_TOTAL.fossils;
}

/** Called after each donation: the whole museum finished earns a golden statue. */
export function checkMuseumComplete(g: Game): void {
  if (g.state.flags.museumComplete || !museumComplete(g)) return;
  g.state.flags.museumComplete = 1;
  give(g, 'furn_golden_lantern_statue', 1, 'museum');
  money(g, 0, 5000, 'museum');
  g.toast('The museum is complete! Professor Vesper gives you the Golden Lantern Statue and 5,000 Lumens!', 'good', 'furn_golden_lantern_statue');
}

// ---------------------------------------------------------------- daily + install

function dailyHappenings(g: Game): void {
  stardustSpawns(g);
  // remember tonight (today's weather is rolled by now) so tomorrow's stardust matches the sky
  if (meteorNight(g)) g.state.flags.meteorDay = g.state.clock.day;
  dailyGlowStreak(g);
  const f = festivalToday(g);
  if (f) g.toast(`🎉 Today is the ${f.name}! It starts at ${f.hours[0] > 12 ? `${f.hours[0] - 12} PM` : `${f.hours[0]} AM`} in the plaza.`, 'good');
  const bday = birthdayToday(g);
  if (bday) g.toast(`🎂 It's ${VILLAGER_BY_ID[bday]?.name}'s birthday! Visit with a gift — today it counts double.`, 'good');
}

/** Keep the pond frozen only during the Skate; never leave anyone standing in the water after. */
function syncFrozenPond(g: Game): void {
  const want = pondFrozen(g);
  if (want === g.world.frozenPond) return;
  g.world.frozenPond = want;
  if (want) return;
  const p = g.state.player;
  const w = g.world;
  const here = w.idx(Math.floor(p.x), Math.floor(p.z));
  if (!w.isWater(here)) return;
  // the nearest dry tile, preferring the ice's own level (never up on a cliff you can't get down from)
  const level = w.height(here);
  for (const sameLevel of [true, false])
    for (let r = 1; r < 12; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
          if (!w.inb(x, z) || !w.standable(w.idx(x, z))) continue;
          if (sameLevel && w.height(w.idx(x, z)) !== level) continue;
          p.x = x + 0.5;
          p.z = z + 0.5;
          p.level = w.height(w.idx(x, z));
          return;
        }
}

export function installHappenings(g: Game): void {
  g.onDay(dailyHappenings);
  let t = 0;
  g.onUpdate((game, dt) => {
    // festival activities every frame (a skater passing through a ring must never be missed)
    updateFestival(game);
    t += dt;
    if (t < 0.5) return;
    t = 0;
    syncFrozenPond(game);
    starNightSpawns(game);
    // shooting stars: a heads-up once per night
    if (meteorsNow(game) && game.state.flags.meteorToast !== game.state.clock.day && hour(game) >= 20) {
      game.state.flags.meteorToast = game.state.clock.day;
      game.toast('🌠 Look up! Shooting stars are falling tonight!', 'good');
    }
  });
  g.bus.on('donated', () => checkMuseumComplete(g));
  g.bus.on('itemGained', (e) => {
    if (e.id === 'stardust') learnRecipe(g, 'r_furn_stardust_lamp', 'stardust');
  });
}

export { FESTIVAL_BY_ID };
