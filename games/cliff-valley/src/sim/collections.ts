/** Museum donations, achievements and the farm rating (post-game goals). */
import { ACHIEVEMENTS, MUSEUM_ITEMS } from '../data/achievements';
import { ARTIFACTS, MINERALS } from '../data/minerals';
import { FISH } from '../data/fish';
import { DISHES } from '../data/recipes';
import { VILLAGERS } from '../data/villagers';
import { tryItem } from '../data/items';
import { remove } from './inventory';
import { hearts } from './friendship';
import { levelForXp } from './skills';
import { simInitHooks, type Sim } from './sim';
import { SKILLS } from './state';
import { registerSystem } from './systems';

/** Everything the museum wants. */
export const MUSEUM_LIST: string[] = [...MINERALS.map((m) => m.id), ...ARTIFACTS.filter((a) => a.id !== 'heartstone').map((a) => a.id)];

export function canDonate(sim: Sim, id: string): boolean {
  return MUSEUM_LIST.includes(id) && !sim.state.col.museum.includes(id);
}

export const MUSEUM_REWARDS: [number, { item: string; n: number; text: string }][] = [
  [5, { item: 'seed.melon', n: 5, text: 'Melon seeds from Ottilie\'s garden' }],
  [10, { item: 'crystalLamp', n: 1, text: 'a Crystal Lamp' }],
  [15, { item: 'goldBar', n: 3, text: '3 Gold Bars' }],
  [20, { item: 'stoneStatue', n: 1, text: 'a Stone Statue' }],
  [30, { item: 'sprinkler3', n: 1, text: 'a Mega Sprinkler' }],
  [MUSEUM_ITEMS, { item: 'foundersStatue', n: 1, text: 'the Founders\' Statue' }],
];

export function donateToMuseum(sim: Sim, id: string): { ok: boolean; reward?: string } {
  if (!canDonate(sim, id) || !remove(sim.p.inv, id, 1)) return { ok: false };
  sim.state.col.museum.push(id);
  const n = sim.state.col.museum.length;
  const r = MUSEUM_REWARDS.find(([k]) => k === n);
  if (r) {
    sim.give(r[1].item, r[1].n);
    return { ok: true, reward: r[1].text };
  }
  return { ok: true };
}

/** Check achievements; returns newly unlocked ones. */
export function checkAchievements(sim: Sim): string[] {
  const got: string[] = [];
  const st = sim.state;
  for (const a of ACHIEVEMENTS) {
    if (st.achievements.includes(a.id)) continue;
    if (a.check(st)) {
      st.achievements.push(a.id);
      got.push(a.id);
      sim.ev.emit('achievement', { id: a.id });
    }
  }
  return got;
}

/** Farm rating (1–5 stars) for the post-game "perfect farm" goal. */
export function farmRating(sim: Sim): { stars: number; score: number; parts: { name: string; got: number; max: number; tip: string }[] } {
  const st = sim.state;
  const shippable = Object.keys(st.col.shipped).length;
  const parts = [
    { name: 'Earnings', got: Math.min(10, Math.floor(st.player.earned / 15000)), max: 10, tip: 'Grow and sell more goods.' },
    { name: 'Friendships', got: Math.min(10, VILLAGERS.filter((v) => hearts(sim, v.id) >= 8).length), max: 10, tip: 'Become close friends (8+ hearts) with villagers.' },
    { name: 'Skills', got: SKILLS.reduce((t, k) => t + Math.floor(levelForXp(st.player.xp[k]) / 2), 0), max: 25, tip: 'Level up all five skills.' },
    { name: 'Fish log', got: Math.min(8, Math.floor((Object.keys(st.col.fish).length / FISH.length) * 8)), max: 8, tip: 'Catch every kind of fish.' },
    { name: 'Museum', got: Math.min(8, Math.floor((st.col.museum.length / MUSEUM_LIST.length) * 8)), max: 8, tip: 'Donate minerals and artifacts.' },
    { name: 'Cooking', got: Math.min(6, Math.floor((Object.keys(st.col.cooked).length / DISHES.length) * 6)), max: 6, tip: 'Cook every recipe.' },
    { name: 'Shipping', got: Math.min(8, Math.floor(shippable / 12)), max: 8, tip: 'Ship lots of different items.' },
    { name: 'Farm life', got: (st.buildings.built.coop !== undefined ? 2 : 0) + (st.buildings.built.barn !== undefined ? 2 : 0) + st.buildings.houseLevel * 2 + (st.animals.length >= 8 ? 2 : 0) + (st.pet.love >= 600 ? 1 : 0), max: 11, tip: 'Build, upgrade and care for animals and your pet.' },
    { name: 'Achievements', got: Math.min(8, Math.floor(st.achievements.length / 5)), max: 8, tip: 'Unlock achievements.' },
    { name: 'Restoration', got: st.story.finale ? 6 : st.story.done.length, max: 6, tip: 'Restore the valley.' },
  ];
  const score = parts.reduce((t, p) => t + p.got, 0);
  const max = parts.reduce((t, p) => t + p.max, 0);
  const pct = score / max;
  const stars = pct >= 0.95 ? 5 : pct >= 0.7 ? 4 : pct >= 0.45 ? 3 : pct >= 0.2 ? 2 : 1;
  return { stars, score, parts };
}

export function museumName(id: string): string {
  return tryItem(id)?.name ?? id;
}

simInitHooks.push((sim) => {
  // gentle checks after big moments
  for (const e of ['levelUp', 'hearts', 'mineFloor'] as const) sim.ev.on(e, () => checkAchievements(sim));
});

registerSystem({
  id: 'collections',
  startDay(sim) {
    const got = checkAchievements(sim);
    if (got.length) sim.morningNotes.push(`🏆 New achievement${got.length > 1 ? 's' : ''}! Check your Collections.`);
    if (sim.state.day === 40 && !sim.state.flags.year2) {
      sim.state.flags.year2 = 1;
      sim.morningNotes.push('🌱 Year 2 begins! New goals are waiting in your Journal: fill the museum, catch every fish, make best friends and earn a perfect farm rating.');
    }
  },
});
