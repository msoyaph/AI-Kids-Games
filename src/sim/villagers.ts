// Villager relationships: friendship, gifts, daily requests (deliver / lost item / catch),
// heart-milestone rewards and moving in.
import { dayRng } from '../core/rng';
import { FRUITS } from '../data/fruit';
import { BUGS, FISH, FURNITURE_SHOP, item } from '../data/registry';
import { flowerItemId, LOST_ITEMS } from '../data/items';
import { HEART, VILLAGERS, VILLAGER_BY_ID } from '../data/villagers';
import { GIFT_SLOTS } from '../data/interiors';
import { Ground, Region } from '../world/types';
import { learnRecipe } from './crafting';
import { sellPrice } from './economy';
import type { Game } from './game';
import { countItem, give, money, removeItem, stat } from './inventory';
import { computeComponents } from './pathfind';
import type { VillagerRequest, VillagerState } from './state';

export const FRIEND = {
  talk: 3,
  talkHigh: 1,
  talkCap: 60,
  love: 10,
  like: 6,
  neutral: 2,
  dislike: -3,
  request: 8,
  giftsPerDay: 2,
};

export type Reaction = 'love' | 'like' | 'neutral' | 'dislike';

export function vstate(g: Game, id: string): VillagerState {
  let v = g.state.villagers[id];
  if (!v) {
    v = { movedIn: false, homeId: 0, friendship: 0, talkedDay: 0, giftDay: 0, giftsToday: 0, rewardsGiven: 0, metDay: 0 };
    g.state.villagers[id] = v;
  }
  return v;
}

export function residents(g: Game): string[] {
  return VILLAGERS.filter((v) => g.state.villagers[v.id]?.movedIn).map((v) => v.id);
}

export function hearts(f: number): number {
  return Math.min(5, Math.floor(f / HEART));
}

export function addFriendship(g: Game, id: string, amount: number): void {
  const v = vstate(g, id);
  const before = hearts(v.friendship);
  v.friendship = Math.max(0, Math.min(100, v.friendship + amount));
  const after = hearts(v.friendship);
  if (after > before) {
    g.emit('friendshipUp', { npc: id, level: after });
    g.emit('sfx', { name: 'heart' });
  }
}

/** First conversation of the day raises friendship a little. Returns true if this is the first talk today. */
export function noteTalk(g: Game, id: string): boolean {
  const v = vstate(g, id);
  g.state.stats[`talk_${id}`] = (g.state.stats[`talk_${id}`] ?? 0) + 1;
  g.emit('talked', { npc: id });
  if (v.talkedDay === g.state.clock.day) return false;
  v.talkedDay = g.state.clock.day;
  if (!v.metDay) v.metDay = g.state.clock.day;
  addFriendship(g, id, v.friendship < FRIEND.talkCap ? FRIEND.talk : FRIEND.talkHigh);
  stat(g, 'talks');
  return true;
}

export function reactionTo(id: string, itemId: string): Reaction {
  const v = VILLAGER_BY_ID[id];
  const def = item(itemId);
  if (!v) return 'neutral';
  if (itemId === v.favorite) return 'love';
  if (itemId === 'fiber' || def.cat === 'fossilUnknown') return 'dislike';
  const tags = def.tags ?? [];
  if (tags.some((t) => v.dislikes.includes(t))) return 'dislike';
  const likes = tags.filter((t) => v.likes.includes(t)).length;
  if (likes >= 2) return 'love';
  if (likes === 1 || (def.rarity ?? 1) >= 3 || def.price >= 1500) return 'like';
  return 'neutral';
}

/** Give the item in a pocket slot as a gift. */
export function giveGift(g: Game, id: string, slot: number): Reaction | null {
  const s = g.state.player.inv[slot];
  if (!s || item(s.id).key) return null;
  const v = vstate(g, id);
  if (v.giftDay !== g.state.clock.day) {
    v.giftDay = g.state.clock.day;
    v.giftsToday = 0;
  }
  const itemId = s.id;
  removeItem(g, itemId, 1, 'gift');
  // furniture gifts show up in their home (most recent first)
  if (item(itemId).furn) v.gifts = [itemId, ...(v.gifts ?? [])].slice(0, GIFT_SLOTS);
  const r = reactionTo(id, itemId);
  if (v.giftsToday < FRIEND.giftsPerDay) addFriendship(g, id, FRIEND[r]);
  v.giftsToday++;
  stat(g, 'gifts');
  g.emit('gifted', { npc: id, item: itemId, reaction: r });
  return r;
}

// ---------------- requests ----------------

const SAFE_FISH = () => FISH.filter((f) => f.hours[0] === 0 && f.hours[1] === 24 && f.weather === 'any' && f.rarity <= 2 && (f.where.includes('river') || f.where.includes('sea')));
const SAFE_BUGS = () => BUGS.filter((b) => b.hours[0] === 0 && b.hours[1] === 24 && b.weather === 'any' && b.rarity <= 2 && ['ground', 'trees', 'rocks'].includes(b.habitat));

let compCache: { key: string; comp: Int32Array } | null = null;
/** Tiles reachable from the player's side of the island (home door / dock). */
export function reachableComponents(g: Game): { comp: Int32Array; ids: Set<number> } {
  const key = `${g.state.seed}|${g.state.world.structures.length}|${g.state.world.structures.map((s) => s.type[0]).join('')}`;
  if (!compCache || compCache.key !== key) compCache = { key, comp: computeComponents(g.world) };
  const comp = compCache.comp;
  const ids = new Set<number>();
  const dock = g.world.gen.lots.dock;
  const seeds = [g.world.idx(dock.x, dock.z - 1), g.world.idx(Math.floor(g.state.player.x), Math.floor(g.state.player.z))];
  for (const s of seeds) if (comp[s]! >= 0) ids.add(comp[s]!);
  return { comp, ids };
}

export function invalidateReach(): void {
  compCache = null;
}

function spawnLost(g: Game, lostId: string, rngSeed: number): number | undefined {
  const { comp, ids } = reachableComponents(g);
  const rng = dayRng(g.state.seed, g.state.clock.day, `lost${rngSeed}`);
  const w = g.world;
  for (let tries = 0; tries < 400; tries++) {
    const i = rng.int(0, w.size * w.size - 1);
    if (!ids.has(comp[i]!)) continue;
    const gr = w.ground(i);
    if ((gr !== Ground.Grass && gr !== Ground.Sand) || w.obj(i) || w.structure(i)) continue;
    w.setObj(i, { k: 'item', item: lostId, q: 1, tag: 'lost' });
    return i;
  }
  return undefined;
}

export function placeDescription(g: Game, tile: number): string {
  const w = g.world;
  const gr = w.ground(tile);
  if (gr === Ground.Sand) return 'down on the beach';
  const reg = w.region(tile);
  const lots = w.gen.lots;
  const x = tile % w.size, z = (tile / w.size) | 0;
  const near = (r: { x: number; z: number; w: number; d: number }, d: number) => x >= r.x - d && x < r.x + r.w + d && z >= r.z - d && z < r.z + r.d + d;
  if (near(lots.plaza, 6)) return 'somewhere around the plaza';
  if (reg === Region.Plateau || reg === Region.Summit) return 'up on the cliffs';
  if (z < lots.plaza.z) return 'north of the plaza, toward the cliffs';
  if (x < lots.plaza.x) return 'out west, past the museum';
  return 'east of the plaza, by the river';
}

function clearExpired(g: Game): void {
  for (const id of Object.keys(g.state.villagers)) {
    const v = g.state.villagers[id]!;
    if (v.request && v.request.day < g.state.clock.day) v.request = undefined;
  }
  // lost items vanish overnight wherever they are
  const lostIds = new Set(LOST_ITEMS.map((l) => l.id));
  for (const key of Object.keys(g.state.world.objects)) {
    const o = g.state.world.objects[+key]!;
    if (o.k === 'item' && o.item && lostIds.has(o.item)) delete g.state.world.objects[+key];
  }
  for (const l of lostIds) {
    const n = countItem(g, l);
    if (n) removeItem(g, l, n, 'expired');
  }
  g.state.home.storage = g.state.home.storage.filter((s) => !lostIds.has(s.id));
}

export function makeRequest(g: Game, id: string, kindRoll: number): VillagerRequest | null {
  const rng = dayRng(g.state.seed, g.state.clock.day, `req_${id}`);
  const day = g.state.clock.day;
  const kind = kindRoll < 0.5 ? 'deliver' : kindRoll < 0.75 ? 'lost' : 'catch';
  if (kind === 'deliver') {
    const native = FRUITS[g.world.gen.nativeFruit]!.id;
    const flowers = new Set<string>();
    for (const key in g.state.world.objects) {
      const o = g.state.world.objects[key]!;
      if (o.k === 'flower' && (o.v ?? 0) % 16 < 3) flowers.add(flowerItemId(Math.floor((o.v ?? 0) / 16), (o.v ?? 0) % 16));
    }
    const pool: [string, number, number][] = [
      [native, 2, 4],
      ['timber', 3, 6],
      ['stone', 3, 5],
      ['clay', 2, 3],
      ['iron', 1, 2],
      ['branch', 4, 8],
      ['shell_spiral', 1, 3],
      ['shell_scallop', 1, 2],
      ...[...flowers].slice(0, 3).map((f) => [f, 1, 2] as [string, number, number]),
    ];
    const [target, lo, hi] = rng.pick(pool);
    const qty = rng.int(lo, hi);
    const reward = Math.round((sellPrice(g, target) * qty * 1.5 + 300) / 10) * 10;
    return { kind, target, qty, day, accepted: false, done: false, reward };
  }
  if (kind === 'catch') {
    const useFish = rng.chance(0.55);
    const pool: { id: string; price: number }[] = useFish ? SAFE_FISH() : SAFE_BUGS();
    if (!pool.length) return null;
    const c = rng.pick(pool);
    return { kind, target: c.id, qty: 1, day, accepted: false, done: false, reward: Math.round((c.price * 1.2 + 400) / 10) * 10 };
  }
  // lost item: unique type today
  const used = new Set(Object.values(g.state.villagers).map((v) => v.request?.target));
  const free = LOST_ITEMS.filter((l) => !used.has(l.id));
  if (!free.length) return null;
  const lost = rng.pick(free);
  return { kind, target: lost.id, qty: 1, day, accepted: false, done: false, reward: 800 };
}

export const MAX_REQUESTS_PER_DAY = 3;

export function dailyVillagers(g: Game): void {
  const day = g.state.clock.day;
  // move-ins
  for (const s of g.state.world.structures) {
    if (s.type === 'plot' && s.owner && (s.readyDay ?? 0) > 0 && (s.readyDay ?? 0) <= day) {
      s.type = 'villagerHome';
      s.v = VILLAGER_BY_ID[s.owner]?.homeColor ?? 0;
      const v = vstate(g, s.owner);
      v.movedIn = true;
      v.homeId = s.id;
      g.world.rebuildStructures();
      g.emit('structuresChanged', {});
      g.emit('villagerMovedIn', { id: s.owner });
      g.toast(`${VILLAGER_BY_ID[s.owner]?.name} has moved in!`, 'good');
    }
  }
  clearExpired(g);
  invalidateReach();
  g.emit('objectsChanged', {});
  const rng = dayRng(g.state.seed, day, 'requests');
  let made = 0;
  for (const id of rng.shuffle(residents(g))) {
    const v = vstate(g, id);
    v.giftsToday = 0;
    if (made >= MAX_REQUESTS_PER_DAY || !rng.chance(0.55)) continue;
    const req = makeRequest(g, id, rng.next());
    if (!req) continue;
    if (req.kind === 'lost') {
      req.lostTile = spawnLost(g, req.target, made * 17 + id.length);
      if (req.lostTile === undefined) continue;
    }
    v.request = req;
    made++;
  }
}

export function acceptRequest(g: Game, id: string): void {
  const v = vstate(g, id);
  const r = v.request;
  if (!r || r.accepted) return;
  r.accepted = true;
}

export function declineRequest(g: Game, id: string): void {
  const v = vstate(g, id);
  if (v.request && !v.request.accepted) v.request = undefined;
}

export function canFulfill(g: Game, id: string): boolean {
  const r = vstate(g, id).request;
  return !!r && r.accepted && !r.done && countItem(g, r.target) >= r.qty;
}

export interface RequestReward {
  glints: number;
  item?: string;
}

export function fulfillRequest(g: Game, id: string): RequestReward | null {
  const v = vstate(g, id);
  const r = v.request;
  if (!r || !canFulfill(g, id)) return null;
  removeItem(g, r.target, r.qty, 'request');
  r.done = true;
  money(g, r.reward, 0, 'request');
  addFriendship(g, id, FRIEND.request);
  stat(g, 'requestsDone');
  g.emit('requestDone', { npc: id, kind: r.kind });
  const rng = dayRng(g.state.seed, g.state.clock.day, `rew_${id}`);
  let extra: string | undefined;
  if (rng.chance(0.3) && FURNITURE_SHOP.length) {
    extra = rng.pick(FURNITURE_SHOP).id;
    give(g, extra, 1, 'request');
  }
  return { glints: r.reward, item: extra };
}

export interface HeartReward {
  kind: 'recipe' | 'item' | 'lumens';
  id?: string;
  amount?: number;
}

/** Collect any heart-milestone rewards that are due (call during conversation). */
export function dueHeartRewards(g: Game, id: string): HeartReward[] {
  const def = VILLAGER_BY_ID[id];
  const v = vstate(g, id);
  if (!def) return [];
  const out: HeartReward[] = [];
  const milestones = [2, 3, 4, 5];
  while (v.rewardsGiven < milestones.length && hearts(v.friendship) >= milestones[v.rewardsGiven]!) {
    const m = milestones[v.rewardsGiven]!;
    if (m === 2 || m === 3) {
      const rid = def.heartRecipes[m - 2];
      if (rid && learnRecipe(g, rid, 'friend', true)) out.push({ kind: 'recipe', id: rid });
      else {
        money(g, 0, 300, 'friendship');
        out.push({ kind: 'lumens', amount: 300 });
      }
    } else if (m === 4) {
      money(g, 0, 600, 'friendship');
      out.push({ kind: 'lumens', amount: 600 });
    } else {
      give(g, def.heartGift, 1, 'friend');
      out.push({ kind: 'item', id: def.heartGift });
    }
    v.rewardsGiven++;
  }
  return out;
}
