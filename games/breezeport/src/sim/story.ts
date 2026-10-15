/**
 * The story's rules: how far each goal is, when a chapter is done, what finishing it gives, town
 * projects (funded at City Hall), and the endless goals after the credits. The story's words live in
 * data/chapters.ts; the cards and dialogue on screen are game/storyFlow.ts.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { CHAPTERS, PROJECTS, type Goal, type ProjectId } from '../data/chapters';
import { THING } from '../data/things';
import type { Census } from './census';
import { eco } from './eco';
import { RFLAG, bump, touch, type Town } from './state';
import type { Traffic } from './traffic';

export interface Progress { value: number; target: number; done: boolean }

/** How far a goal has got (values the goal pill and the goal list show). */
export function progress(town: Town, c: Census, trips: Traffic | null, g: Goal): Progress {
  if (town.story.done.includes(g.id)) return { value: 1, target: 1, done: true };
  const p = (value: number, target: number): Progress => ({ value: Math.min(value, target), target, done: value >= target });
  switch (g.kind) {
    case 'stat': return p(town.stats[g.stat] ?? 0, g.n);
    case 'pop': return p(c.population, g.n);
    case 'happy': return p(c.happy ?? 0, g.n);
    case 'count': {
      let n = 0;
      for (const t of town.things) {
        const d = THING[t.def];
        if (!d) continue;
        if (g.def && t.def !== g.def) continue;
        if (g.defs && !g.defs.includes(t.def)) continue;
        if (g.cls && d.class !== g.cls) continue;
        if (g.level && (d.level ?? 1) < g.level) continue;
        n++;
      }
      return p(n, g.n);
    }
    case 'cover': {
      if (!c.homes.length) return p(0, g.pct);
      const covered = c.homes.filter(h => c.needs.get(h.id)?.services[g.service]).length;
      return p(Math.round((covered / c.homes.length) * 100), g.pct);
    }
    case 'project': return p(town.flags[`project-${g.project}`] ? 1 : 0, 1);
    case 'lanes': {
      const bit = g.lane === 'bike' ? RFLAG.bike : RFLAG.tram;
      let n = 0;
      for (let i = 0; i < town.rflags.length; i++) if (town.rflags[i]! & bit) n++;
      return p(n, g.n);
    }
    case 'eco': return p(eco(town, c, trips).leaves, g.n);
    case 'flag': return p(town.flags[g.flag] ? 1 : 0, 1);
    case 'routes': return p(town.routes.length, g.n);
    case 'jams': {
      if (c.population < g.minPop) return { value: 0, target: 1, done: false };
      const jams = trips?.jams ?? 0;
      return { value: jams <= g.max ? 1 : 0, target: 1, done: jams <= g.max };
    }
  }
}

/** The goals in play: this chapter's, or the endless round's after the credits. */
export function currentGoals(town: Town): Goal[] {
  if (town.mode === 'creative') return [];
  const ch = CHAPTERS[town.story.chapter];
  return ch ? ch.goals : endlessGoals(town);
}

export type StoryEvent = { type: 'goal-done'; goal: Goal } | { type: 'chapter-done'; chapter: number } | { type: 'endless-done'; coins: number };

/** Note goals that just got done; say when the whole chapter (or endless round) is done. */
export function storyStep(town: Town, c: Census, trips: Traffic | null): StoryEvent[] {
  if (town.mode === 'creative') return [];
  const out: StoryEvent[] = [];
  const goals = currentGoals(town);
  for (const g of goals) {
    if (town.story.done.includes(g.id)) continue;
    if (progress(town, c, trips, g).done) { town.story.done.push(g.id); out.push({ type: 'goal-done', goal: g }); }
  }
  if (goals.length && goals.every(g => town.story.done.includes(g.id)) && !town.flags.chapterWaiting) {
    if (CHAPTERS[town.story.chapter]) { town.flags.chapterWaiting = 1; out.push({ type: 'chapter-done', chapter: town.story.chapter }); }
    else {
      const coins = 300 + 100 * (town.flags.endlessRound ?? 0);
      town.coins += coins;
      town.flags.endlessRound = (town.flags.endlessRound ?? 0) + 1;
      // a round's goals are never asked again, so forget them (the save stays small however long you play)
      town.story.done = town.story.done.filter(id => !/^e\d+-/.test(id));
      setEndlessBase(town, c);
      out.push({ type: 'endless-done', coins });
    }
  }
  return out;
}

/** Finish the chapter: its reward, then the next chapter starts (opening its land). */
export function finishChapter(town: Town, c: Census) {
  const ch = CHAPTERS[town.story.chapter];
  if (!ch) return;
  town.coins += ch.reward;
  town.story.chapter++;
  town.flags.chapterWaiting = 0;
  const next = CHAPTERS[town.story.chapter];
  if (next?.opens && !town.unlocked.includes(next.opens)) { town.unlocked.push(next.opens); touch(town); }
  if (!next) { setEndlessBase(town, c); town.unlocked = ['harbor', 'maple', 'greenway', 'boardwalk', 'hilltop', 'meadows']; touch(town); }
  bump(town, 'chapters');
}

/** Fund a town project (at City Hall). */
export function fundProject(town: Town, id: ProjectId): { ok: true } | { ok: false; why: string } {
  const pr = PROJECTS[id];
  if (town.flags[`project-${id}`]) return { ok: false, why: 'That’s done already!' };
  if (town.mode !== 'creative' && town.coins < pr.cost) return { ok: false, why: `The town needs ${pr.cost} coins for that.` };
  if (town.mode !== 'creative') town.coins -= pr.cost;
  town.flags[`project-${id}`] = 1;
  touch(town);
  return { ok: true };
}

/** After the credits: rounds of new goals, each a little bigger than the town is now. */
function setEndlessBase(town: Town, c: Census) {
  town.flags.endlessPop = c.population;
  town.flags.endlessTrees = town.stats['placed-tree'] ?? 0;
  town.flags.endlessFlats = town.things.filter(t => THING[t.def]?.level === 3).length;
}

function endlessGoals(town: Town): Goal[] {
  const r = town.flags.endlessRound ?? 0;
  const pop = town.flags.endlessPop ?? 0, trees = town.flags.endlessTrees ?? 0, flats = town.flags.endlessFlats ?? 0;
  const set = r % 3;
  const goals: Goal[] = [
    { id: `e${r}-pop`, kind: 'pop', n: Math.round((pop + 60 + r * 20) / 10) * 10, text: `Grow to ${Math.round((pop + 60 + r * 20) / 10) * 10} people` },
    set === 0
      ? { id: `e${r}-trees`, kind: 'stat', stat: 'placed-tree', n: trees + 15, text: 'Plant 15 more trees' }
      : set === 1
        ? { id: `e${r}-flats`, kind: 'count', cls: 'home', level: 3, n: flats + 3, text: 'Have 3 more blocks of flats' }
        : { id: `e${r}-happy`, kind: 'happy', n: 85, text: 'Make the town 85% happy' },
  ];
  return goals;
}
