/** Help-wanted board: a simple request from a villager every couple of days. */
import { CROPS } from '../data/crops';
import { tryItem } from '../data/items';
import { VILLAGER, VILLAGERS } from '../data/villagers';
import { sellPrice } from './economy';
import { addPoints } from './friendship';
import { count, remove } from './inventory';
import type { Sim } from './sim';
import { seasonOf } from './state';
import { registerSystem } from './systems';

/** Extra request pools added by later systems (fish, forage, minerals…). */
export const QUEST_POOLS: ((sim: Sim, season: number) => { item: string; n: [number, number]; who?: string[] }[])[] = [];

const TEMPLATES = [
  'Could you bring me {n} {item}? {why}',
  'Help wanted! I need {n} {item}. {why}',
  'Hi! Does anyone have {n} {item}? {why}',
];

const WHY: Record<string, string[]> = {
  bram: ['The Hall needs some cheering up!', "It's for the town's welcome basket."],
  pippa: ['My shelves look a bit empty!', 'A customer asked for some.'],
  grit: ['I need it for a little project.', "Don't tell anyone, it's for a poem prop."],
  hollis: ['I\'m fixing up a birdhouse.', 'The barn door needs patching.'],
  goldie: ['The animals deserve a treat!', 'It\'s for a ranch recipe.'],
  kai: ['It\'s for my secret fort!', 'I want to show my mom!'],
  juno: ['I want to paint it!', 'It\'s for my still-life picture.'],
  sunny: ['I\'m trying a brand-new recipe!', 'The café menu needs it!'],
  ottilie: ['It\'s for a museum study.', 'I\'m cataloguing it, which means making a careful list.'],
  toby: ['It reminds me of the old train days.', 'For my afternoon tea!'],
  lumi: ['It\'s for my new gadget!', 'My invention needs it — science!'],
  basil: ['For the forest critters.', 'I\'m planting a new grove.'],
  nana: ['I\'m baking something special!', 'For a recipe from the old days.'],
  wren: ['Pickles the seagull insists.', 'It\'s for my boat!'],
};

function pool(sim: Sim): { item: string; n: [number, number]; who?: string[] }[] {
  const s = seasonOf(sim.state.day);
  const out: { item: string; n: [number, number]; who?: string[] }[] = [
    { item: 'wood', n: [10, 20], who: ['hollis', 'basil', 'wren', 'bram'] },
    { item: 'stone', n: [10, 20], who: ['grit', 'hollis', 'lumi'] },
    { item: 'fiber', n: [8, 15], who: ['goldie', 'juno', 'basil'] },
    { item: 'sap', n: [3, 6], who: ['lumi', 'basil'] },
  ];
  for (const c of CROPS) if (c.seasons.includes(s)) out.push({ item: c.id, n: [1, 3] });
  for (const f of QUEST_POOLS) out.push(...f(sim, s));
  return out.filter((p) => tryItem(p.item));
}

export function postRequest(sim: Sim): void {
  const st = sim.state;
  const rng = sim.rng(0xb0a);
  const opts = pool(sim);
  if (!opts.length) return;
  const p = rng.pick(opts);
  const who = p.who ? rng.pick(p.who) : rng.pick(VILLAGERS).id;
  const n = rng.range(p.n[0], p.n[1]);
  const d = tryItem(p.item)!;
  const reward = Math.max(60, Math.round((sellPrice(null, p.item) * n * 2.2) / 10) * 10 + 40);
  const why = rng.pick(WHY[who] ?? ['Thanks so much!']);
  const text = rng.pick(TEMPLATES).replace('{n}', String(n)).replace('{item}', d.name).replace('{why}', why);
  st.quests.board = { npc: who, item: p.item, n, reward, until: st.day + 2, text };
  st.flags.questAccepted = 0;
}

export function activeRequest(sim: Sim) {
  const b = sim.state.quests.board;
  if (!b || sim.state.day > b.until) return null;
  return b;
}

export function canDeliver(sim: Sim, npc: string): boolean {
  const b = activeRequest(sim);
  return !!b && b.npc === npc && !!sim.state.flags.questAccepted && count(sim.p.inv, b.item) >= b.n;
}

export function deliver(sim: Sim): { ok: boolean; reward?: number; npc?: string } {
  const b = activeRequest(sim);
  if (!b || !canDeliver(sim, b.npc)) return { ok: false };
  remove(sim.p.inv, b.item, b.n);
  sim.p.coins += b.reward;
  sim.p.earned += b.reward;
  addPoints(sim, b.npc, 40);
  sim.state.quests.done++;
  sim.state.stats.questsDone++;
  sim.state.quests.board = null;
  return { ok: true, reward: b.reward, npc: b.npc };
}

export function requesterName(npc: string): string {
  return VILLAGER[npc]?.name ?? npc;
}

registerSystem({
  id: 'quests',
  startDay(sim) {
    const st = sim.state;
    const b = st.quests.board;
    if (b && st.day > b.until) st.quests.board = null;
    if (!st.quests.board && st.day >= 1 && st.day % 2 === 1) postRequest(sim);
  },
});
