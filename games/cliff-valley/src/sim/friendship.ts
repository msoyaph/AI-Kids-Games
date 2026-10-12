/** Friendship: talking, gifts, hearts (0–10), birthdays and daily dialogue lines. */
import { hashStr } from '../core/rng';
import { DIALOGUE } from '../data/dialogue';
import { tryItem } from '../data/items';
import { VILLAGER, VILLAGERS, type VillagerDef } from '../data/villagers';
import { TUNING } from '../tuning';
import { remove } from './inventory';
import type { Sim } from './sim';
import { dayOfSeason, seasonOf, type NpcState } from './state';
import { registerSystem } from './systems';
import { isWet } from './weather';

export type Taste = 'love' | 'like' | 'neutral' | 'dislike';

export function npcState(sim: Sim, id: string): NpcState {
  let s = sim.state.npcs[id];
  if (!s) {
    s = { pts: 0, talked: false, gifted: false, giftsWeek: 0, met: false, ev: [], bdayGift: false };
    sim.state.npcs[id] = s;
  }
  return s;
}

export function hearts(sim: Sim, id: string): number {
  return Math.min(TUNING.maxHearts, Math.floor(npcState(sim, id).pts / TUNING.heartPoints));
}

export function addPoints(sim: Sim, id: string, n: number): void {
  const s = npcState(sim, id);
  const before = hearts(sim, id);
  s.pts = Math.max(0, Math.min(TUNING.maxHearts * TUNING.heartPoints, s.pts + n));
  const after = hearts(sim, id);
  if (after > before) sim.ev.emit('hearts', { id, hearts: after });
}

export function isBirthday(sim: Sim, v: VillagerDef): boolean {
  return v.birthday[0] === seasonOf(sim.state.day) && v.birthday[1] === dayOfSeason(sim.state.day);
}

export function taste(v: VillagerDef, itemId: string): Taste {
  const cat = tryItem(itemId)?.cat;
  const match = (list: string[]) => list.some((k) => k === itemId || (cat && k === `cat:${cat}`));
  if (v.loves.includes(itemId)) return 'love';
  if (v.dislikes.includes(itemId)) return 'dislike';
  if (v.likes.includes(itemId)) return 'like';
  if (match(v.loves)) return 'love';
  if (match(v.dislikes)) return 'dislike';
  if (match(v.likes)) return 'like';
  return 'neutral';
}

export function fill(sim: Sim, text: string): string {
  return text.replace(/\{name\}/g, sim.p.name).replace(/\{farm\}/g, sim.p.farm).replace(/\{pet\}/g, sim.state.pet.name);
}

/** Extra line sources (festival day lines, quests…) checked before the usual pick. */
export const lineHooks: ((sim: Sim, v: VillagerDef) => string | null)[] = [];

/** Today's line for a villager (stable through the day). */
export function lineFor(sim: Sim, id: string): string {
  const v = VILLAGER[id];
  const d = DIALOGUE[id];
  const st = npcState(sim, id);
  if (!d) return '...';
  if (!st.met) return d.intro;
  if (isBirthday(sim, v)) return d.birthday;
  for (const h of lineHooks) {
    const r = h(sim, v);
    if (r) return r;
  }
  const rng = sim.rng(hashStr(id));
  const hr = hearts(sim, id);
  if (sim.state.story.finale && rng.chance(0.3)) return d.postgame;
  if (isWet(sim.state.weather) && sim.state.weather !== 'snow' && rng.chance(0.5) && d.rain.length) return rng.pick(d.rain);
  const tier = hr >= 9 ? 9 : hr >= 6 ? 6 : hr >= 3 ? 3 : 0;
  if (tier && rng.chance(0.45)) {
    const pool = [...(d.hearts[3] ?? []), ...(tier >= 6 ? d.hearts[6] ?? [] : []), ...(tier >= 9 ? d.hearts[9] ?? [] : [])];
    if (pool.length) return rng.pick(pool);
  }
  const place = d.places?.[sim.p.loc];
  if (place && rng.chance(0.3)) return place;
  if (rng.chance(0.35)) return rng.pick(d.season[seasonOf(sim.state.day)]);
  return d.daily[(sim.state.day + hashStr(id)) % d.daily.length];
}

/** Talk: returns the line; first talk of the day gives friendship. */
export function talk(sim: Sim, id: string): { text: string; first: boolean } {
  const s = npcState(sim, id);
  const text = fill(sim, lineFor(sim, id));
  const first = !s.talked;
  if (!s.met) {
    s.met = true;
    sim.state.flags[`met.${id}`] = 1;
  }
  if (first) {
    s.talked = true;
    addPoints(sim, id, TUNING.talkPoints);
  }
  return { text, first };
}

export function canGift(sim: Sim, id: string, itemId: string): { ok: boolean; msg?: string } {
  const d = tryItem(itemId);
  if (!d || d.giftable === false || d.cat === 'tool') return { ok: false, msg: "That's not something you can give." };
  if (npcState(sim, id).gifted) return { ok: false, msg: `You already gave ${VILLAGER[id].name} a gift today. Try again tomorrow!` };
  return { ok: true };
}

export function giveGift(sim: Sim, id: string, slot: number): { ok: boolean; taste?: Taste; text?: string; pts?: number; msg?: string } {
  const s = sim.p.inv[slot];
  if (!s) return { ok: false };
  const c = canGift(sim, id, s.id);
  if (!c.ok) return c;
  const v = VILLAGER[id];
  const t = taste(v, s.id);
  const bday = isBirthday(sim, v);
  let pts = TUNING.giftPoints[t] + (s.q >= 2 ? 5 : 0);
  if (bday && pts > 0) pts *= TUNING.birthdayGiftMult;
  remove(sim.p.inv, s.id, 1, s.q);
  const st = npcState(sim, id);
  st.gifted = true;
  st.giftsWeek++;
  if (!st.met) st.met = true;
  if (bday) st.bdayGift = true;
  addPoints(sim, id, pts);
  sim.state.stats.gifts++;
  sim.state.flags[`taste.${id}.${s.id}`] = 1;
  const d = DIALOGUE[id];
  const text = fill(sim, bday && t !== 'dislike' ? d.gift.birthday : d.gift[t]);
  return { ok: true, taste: t, text, pts };
}

registerSystem({
  id: 'friendship',
  startDay(sim) {
    for (const v of VILLAGERS) {
      const s = npcState(sim, v.id);
      s.talked = false;
      s.gifted = false;
      if (sim.state.day % 5 === 0) s.giftsWeek = 0;
      s.bdayGift = false;
    }
  },
});
