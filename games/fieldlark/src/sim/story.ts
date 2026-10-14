/**
 * The story's progress: which chapter you're in, how far each goal has got, story requests on the
 * order board, rewards, the Grand Harvest Fair, and the never-ending goals after the credits.
 *
 * `stat` goals count what happened since the chapter began (a snapshot of `farm.stats` is taken when
 * it starts), so earlier play never ticks off a new chapter's goals by surprise.
 */
import { CHAPTERS, type Chapter, type Goal } from '../data/chapters';
import { animalsIn, isHome } from './animals';
import { beauty } from './decorate';
import type { Order } from './orders';
import type { Farm } from './state';
import { earn, levelOf } from './world';

export interface StoryState {
  /** 0-based chapter; CHAPTERS.length once the story is done. */
  chapter: number;
  /** `farm.stats` when the chapter (or endless round) began. */
  base: Record<string, number>;
  introSeen: boolean;
  /** The credits have been shown. */
  creditsSeen: boolean;
  /** After the story: a few goals at a time, forever. */
  endless: EndlessGoal[];
  endlessDone: number;
}

export interface EndlessGoal { id: string; text: string; key: string; n: number; base: number; coins: number }

export const newStory = (): StoryState => ({ chapter: 0, base: {}, introSeen: false, creditsSeen: false, endless: [], endlessDone: 0 });

export const chapterOf = (farm: Farm): Chapter | null => CHAPTERS[farm.story.chapter] ?? null;
export const storyDone = (farm: Farm) => farm.story.chapter >= CHAPTERS.length;

export interface Progress { have: number; need: number; done: boolean }

export function goalProgress(farm: Farm, g: Goal): Progress {
  const stat = (k: string) => (farm.stats[k] ?? 0) - (farm.story.base[k] ?? 0);
  const p = (have: number, need: number): Progress => ({ have: Math.min(have, need), need, done: have >= need });
  switch (g.kind) {
    case 'stat': return p(stat(g.key), g.n);
    case 'have': return p(farm.objects.filter(o => o.kind === 'building' && o.def === g.def).length, g.n);
    case 'trees': return p(farm.objects.filter(o => o.kind === 'tree').length, g.n);
    case 'animals': return p(farm.objects.filter(isHome).filter(o => o.def === ANIMAL_HOME[g.animal]).reduce((s, o) => s + animalsIn(o).length, 0), g.n);
    case 'level': return p(levelOf(farm), g.n);
    case 'land': return p(g.area.split('|').some(a => farm.unlocked.includes(a as never)) ? 1 : 0, 1);
    case 'beauty': return p(beauty(farm).score, g.n);
    case 'grandFair': return p(farm.flags.grandFair ? 1 : 0, 1);
  }
}

const ANIMAL_HOME: Record<string, string> = { chicken: 'coop', cow: 'cowbarn', sheep: 'sheepshed', goat: 'goatpen', duck: 'duckhouse', bee: 'beehive' };

/** Every goal but the Grand Fair is done (the fair itself is started by the player). */
export function readyForGrandFair(farm: Farm): boolean {
  const ch = chapterOf(farm);
  return !!ch && ch.goals.some(g => g.kind === 'grandFair') && ch.goals.every(g => g.kind === 'grandFair' || goalProgress(farm, g).done);
}

export const chapterComplete = (farm: Farm) => { const ch = chapterOf(farm); return !!ch && ch.goals.every(g => goalProgress(farm, g).done); };

/** The first goal not done yet (for the HUD's tracker). */
export function nextGoal(farm: Farm): { goal: Goal; progress: Progress } | null {
  const ch = chapterOf(farm);
  if (!ch) return null;
  for (const g of ch.goals) { const pr = goalProgress(farm, g); if (!pr.done) return { goal: g, progress: pr }; }
  return null;
}

/** The chapter's intro has been read: its story requests go up on the board, and it starts counting. */
export function beginChapter(farm: Farm) {
  const s = farm.story;
  s.introSeen = true;
  s.base = { ...farm.stats };
  const ch = chapterOf(farm);
  if (!ch) return;
  // the fair opens early once the neighbours tell you about it
  if (s.chapter >= 4) farm.flags.fairEarly = 1;
  for (const r of ch.requests) {
    if ((farm.stats[`story:${r.id}`] ?? 0) > 0 || farm.orders.some(o => o.story === r.id) || farm.boat.crates.some(o => o.story === r.id) || farm.boat.cargo.some(o => o.story === r.id)) continue;
    const order: Order = { id: (farm.orderSeq = (farm.orderSeq ?? 0) + 1), who: r.who, items: r.items.map(x => ({ ...x })), coins: r.coins, xp: Math.round(r.coins / 3), story: r.id, note: r.note };
    farm.orders.unshift(order);
  }
}

/** Finish the chapter: the reward, and on to the next. Returns the finished chapter. */
export function finishChapter(farm: Farm): Chapter | null {
  const ch = chapterOf(farm);
  if (!ch || !chapterComplete(farm)) return null;
  earn(farm, ch.reward.coins);
  farm.xp += Math.round(ch.reward.coins / 2);
  if (ch.reward.set) farm.flags[`set:${ch.reward.set}`] = 1;
  farm.story.chapter++;
  farm.story.introSeen = false;
  if (storyDone(farm)) startEndless(farm);
  return ch;
}

/** Holding the Grand Harvest Fair (the last goal). */
export function holdGrandFair(farm: Farm): boolean {
  if (!readyForGrandFair(farm)) return false;
  farm.flags.grandFair = 1;
  return true;
}

// --- after the story: a few goals at a time, forever ---

const ENDLESS: { key: string; text: (n: number) => string; n: (round: number) => number }[] = [
  { key: 'harvest', text: n => `Pick ${n} crops or fruit`, n: r => 40 + r * 10 },
  { key: 'made', text: n => `Make ${n} things in your workshops`, n: r => 8 + r * 2 },
  { key: 'orders', text: n => `Deliver ${n} orders`, n: r => 4 + Math.floor(r / 2) },
  { key: 'stars3', text: n => `Pick or make ${n} three-star things`, n: r => 12 + r * 3 },
  { key: 'collect', text: n => `Collect ${n} things from your animals`, n: r => 10 + r * 3 },
  { key: 'trades', text: n => `Swap with neighbours ${n} times`, n: r => 2 + Math.floor(r / 3) },
  { key: 'fairs', text: () => 'Enter a seasonal fair', n: () => 1 },
  { key: 'rotation', text: n => `Rotate crops ${n} times`, n: r => 6 + r },
];

function newEndlessGoal(farm: Farm): EndlessGoal {
  const s = farm.story;
  const used = new Set(s.endless.map(g => g.key));
  const round = s.endlessDone;
  const options = ENDLESS.filter(t => !used.has(t.key));
  const t = options[(round * 7 + s.endless.length * 3) % options.length]!;
  const n = t.n(round);
  return { id: `${t.key}-${round}-${s.endless.length}`, text: t.text(n), key: t.key, n, base: farm.stats[t.key] ?? 0, coins: 120 + round * 20 };
}

export function startEndless(farm: Farm) {
  while (farm.story.endless.length < 3) farm.story.endless.push(newEndlessGoal(farm));
}

export const endlessProgress = (farm: Farm, g: EndlessGoal): Progress => {
  const have = (farm.stats[g.key] ?? 0) - g.base;
  return { have: Math.min(have, g.n), need: g.n, done: have >= g.n };
};

/** Pays out finished endless goals and deals new ones. Returns the finished ones. */
export function endlessTick(farm: Farm): EndlessGoal[] {
  if (!storyDone(farm)) return [];
  const done = farm.story.endless.filter(g => endlessProgress(farm, g).done);
  if (!done.length) return [];
  for (const g of done) { earn(farm, g.coins); farm.xp += Math.round(g.coins / 3); farm.story.endlessDone++; }
  farm.story.endless = farm.story.endless.filter(g => !done.includes(g));
  startEndless(farm);
  return done;
}
