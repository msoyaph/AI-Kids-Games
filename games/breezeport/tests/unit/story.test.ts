/**
 * The story's rules (sim/story.ts): how far each kind of goal is, finishing a chapter (its reward and
 * the land it opens), town projects, and the endless goals after the festival.
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS, PROJECTS, type Goal } from '../../src/data/chapters';
import { THING } from '../../src/data/things';
import { act } from '../../src/sim/actions';
import { census } from '../../src/sim/census';
import { AREA, AREAS } from '../../src/sim/map';
import { newTown } from '../../src/sim/newtown';
import { RFLAG, addThing } from '../../src/sim/state';
import { currentGoals, finishChapter, fundProject, progress, storyStep } from '../../src/sim/story';
import { LANE_CHAPTER, TOOL_CHAPTER, ZONE_CHAPTER } from '../../src/sim/unlocks';
import { street } from '../support/street';

describe('the story', () => {
  it('has nine chapters, each with goals, lines and a reward, ending at the festival', () => {
    expect(CHAPTERS).toHaveLength(9);
    const ids = new Set<string>();
    for (const c of CHAPTERS) {
      expect(c.intro.length).toBeGreaterThan(0);
      expect(c.outro.length).toBeGreaterThan(0);
      expect(c.goals.length).toBeGreaterThanOrEqual(3);
      expect(c.reward).toBeGreaterThan(0);
      for (const g of c.goals) { expect(ids.has(g.id), g.id).toBe(false); ids.add(g.id); }
    }
    expect(CHAPTERS.at(-1)!.title).toMatch(/Festival/);
    // every area opens once: Old Harbor at the start, four in the story, and Far Meadows after the festival
    const opens = CHAPTERS.map(c => c.opens).filter(Boolean);
    expect(new Set(opens).size).toBe(opens.length);
    expect([...opens, 'harbor', 'meadows'].sort()).toEqual(AREAS.map(a => a.id).sort());
  });

  it('asks only for things that are open by then', () => {
    CHAPTERS.forEach((c, i) => {
      for (const g of c.goals) {
        if (g.kind === 'count' && g.def) expect(THING[g.def]?.chapter ?? 0, g.id).toBeLessThanOrEqual(i);
        if (g.kind === 'count' && g.defs) for (const d of g.defs) expect(THING[d]?.chapter ?? 0, g.id).toBeLessThanOrEqual(i);
        if (g.kind === 'lanes') expect(LANE_CHAPTER[g.lane], g.id).toBeLessThanOrEqual(i);
        if (g.kind === 'routes') expect(TOOL_CHAPTER.transit, g.id).toBeLessThanOrEqual(i);
        if (g.kind === 'stat' && g.stat.startsWith('zone-')) expect(ZONE_CHAPTER[Number(g.stat.slice(5))] ?? 0, g.id).toBeLessThanOrEqual(i);
        if (g.kind === 'cover') expect(Object.values(THING).filter(d => d.service === g.service).every(d => (d.chapter ?? 0) <= i), g.id).toBe(true);
      }
    });
  });

  it('measures each kind of goal', () => {
    const t = street();
    const c = census(t);
    const p = (g: Goal) => progress(t, c, null, g);
    expect(p({ id: 'a', text: '', kind: 'stat', stat: 'road', n: 8 })).toMatchObject({ done: true, target: 8 });
    expect(p({ id: 'b', text: '', kind: 'count', cls: 'home', n: 3 })).toMatchObject({ value: 3, done: true });
    expect(p({ id: 'c', text: '', kind: 'count', def: 'school', n: 1 })).toMatchObject({ value: 0, done: false });
    expect(p({ id: 'd', text: '', kind: 'pop', n: 1000 }).done).toBe(false);
    expect(p({ id: 'e', text: '', kind: 'project', project: 'lighthouse' }).done).toBe(false);
    t.rflags[t.roads.indexOf(1)] = RFLAG.bike;
    expect(p({ id: 'f', text: '', kind: 'lanes', lane: 'bike', n: 1 }).done).toBe(true);
    expect(p({ id: 'g', text: '', kind: 'flag', flag: 'openedMaps' }).done).toBe(false);
    t.flags.openedMaps = 1;
    expect(p({ id: 'g', text: '', kind: 'flag', flag: 'openedMaps' }).done).toBe(true);
    expect(p({ id: 'h', text: '', kind: 'jams', max: 3, minPop: 150 }).done).toBe(false); // too small to count yet
  });

  it('finishes a chapter: its reward, then the next chapter and its land', () => {
    const t = newTown(2);
    for (let ch = 0; ch < 4; ch++) {
      for (const g of currentGoals(t)) t.story.done.push(g.id);
      const ev = storyStep(t, census(t), null);
      expect(ev).toContainEqual({ type: 'chapter-done', chapter: ch });
      expect(storyStep(t, census(t), null)).toEqual([]); // said once
      const coins = t.coins;
      finishChapter(t, census(t));
      expect(t.coins).toBe(coins + CHAPTERS[ch]!.reward);
      expect(t.story.chapter).toBe(ch + 1);
    }
    expect(t.unlocked).toContain(CHAPTERS[4]!.opens);
    expect(AREA[CHAPTERS[4]!.opens!].name).toBe('Maple Row');
  });

  it('notes goals as they get done', () => {
    const t = newTown(3);
    act(t, { type: 'road', tiles: Array.from({ length: 8 }, (_, i) => [40, 17 + i] as [number, number]) });
    const ev = storyStep(t, census(t), null);
    expect(ev).toEqual([{ type: 'goal-done', goal: CHAPTERS[0]!.goals[0] }]);
    expect(t.story.done).toContain('c0-road');
  });

  it('funds town projects once, for their cost', () => {
    const t = newTown(4);
    t.coins = 100;
    expect(fundProject(t, 'lighthouse')).toMatchObject({ ok: false });
    t.coins = 1000;
    expect(fundProject(t, 'lighthouse')).toEqual({ ok: true });
    expect(t.coins).toBe(1000 - PROJECTS.lighthouse.cost);
    expect(fundProject(t, 'lighthouse')).toMatchObject({ ok: false });
    const free = newTown(4, 'creative');
    expect(fundProject(free, 'pier')).toEqual({ ok: true });
    expect(free.coins).toBe(0);
  });

  it('keeps setting new goals after the festival, and the save stays small', () => {
    const t = newTown(5);
    t.story.chapter = CHAPTERS.length - 1;
    for (const g of currentGoals(t)) t.story.done.push(g.id);
    storyStep(t, census(t), null);
    finishChapter(t, census(t));
    expect(t.unlocked).toHaveLength(AREAS.length);
    for (let round = 0; round < 50; round++) {
      const goals = currentGoals(t);
      expect(goals.length).toBeGreaterThanOrEqual(2);
      for (const g of goals) t.story.done.push(g.id);
      const coins = t.coins;
      const ev = storyStep(t, census(t), null);
      expect(ev.find(e => e.type === 'endless-done')).toBeTruthy();
      expect(t.coins).toBeGreaterThan(coins);
    }
    expect(t.flags.endlessRound).toBe(50);
    expect(t.story.done.filter(id => id.startsWith('e')).length).toBe(0);
  });

  it('has no goals in Creative mode', () => {
    const t = newTown(6, 'creative');
    expect(currentGoals(t)).toEqual([]);
    addThing(t, { def: 'school', x: 30, z: 20, rot: 0 });
    expect(storyStep(t, census(t), null)).toEqual([]);
  });
});
