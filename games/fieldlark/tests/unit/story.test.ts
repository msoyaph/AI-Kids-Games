/**
 * The story: eight chapters whose goals count only what happens after each chapter begins, rewards
 * paid once, story requests on the board, the Grand Fair, credits, and endless goals after.
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS, SPEAKERS } from '../../src/data/chapters';
import { PERSON } from '../../src/data/cast';
import { ITEMS } from '../../src/data/items';
import { beginChapter, chapterComplete, endlessTick, finishChapter, goalProgress, nextGoal, startEndless, storyDone } from '../../src/sim/story';
import { newFarm } from '../../src/sim/state';
import { act } from '../../src/sim/actions';
import { START_FIELDS } from '../../src/data/start';

/** Every stat a goal may count: what the game bumps today, and what the later systems bump. */
const KNOWN = /^(cleared|planted|planted:[a-z]+|watered|harvest|orders|composted|collect:[a-z]+|made|made:[a-z]+|ploughed|rotation|stars3|trades|coops|fairs|story:[a-z-]+|stand-sold|hired|contract:[a-z]+|contracts-done|planted-heirloom|bred|channel-wet|auto-watered|greenhouse-picked|lab|helper:[a-z]+)$/;

describe('story', () => {
  it('has eight chapters, each with goals, lines and a reward, in plain known terms', () => {
    expect(CHAPTERS).toHaveLength(8);
    for (const ch of CHAPTERS) {
      expect(ch.intro.length).toBeGreaterThan(0);
      expect(ch.outro.length).toBeGreaterThan(0);
      expect(ch.goals.length).toBeGreaterThanOrEqual(4);
      expect(ch.goals.length).toBeLessThanOrEqual(6);
      for (const l of [...ch.intro, ...ch.outro]) expect(SPEAKERS[l.who], l.who).toBeTruthy();
      for (const g of ch.goals) if (g.kind === 'stat') expect(g.key, `${g.id}`).toMatch(KNOWN);
      for (const r of ch.requests) for (const it of r.items) expect(ITEMS[it.id], `${r.id} wants ${it.id}`).toBeTruthy();
      for (const r of ch.requests) expect(PERSON[r.who], r.who).toBeTruthy();
    }
    // the last chapter ends with the Grand Harvest Fair
    expect(CHAPTERS.at(-1)!.goals.at(-1)!.kind).toBe('grandFair');
  });

  it('counts only what happens after the chapter begins', () => {
    const farm = newFarm(3);
    farm.stats.cleared = 40; // earlier play
    beginChapter(farm);
    const g = CHAPTERS[0]!.goals.find(x => x.id === 'c1-clear')!;
    expect(goalProgress(farm, g)).toEqual({ have: 0, need: 6, done: false });
    farm.stats.cleared = 46;
    expect(goalProgress(farm, g).done).toBe(true);
  });

  it('pays a chapter once, moves on, and puts story requests on the board', () => {
    const farm = newFarm(3);
    beginChapter(farm);
    expect(finishChapter(farm)).toBeNull(); // not done yet
    for (const g of CHAPTERS[0]!.goals) if (g.kind === 'stat') farm.stats[g.key] = (farm.stats[g.key] ?? 0) + g.n;
    expect(chapterComplete(farm)).toBe(true);
    const coins = farm.coins;
    expect(finishChapter(farm)?.title).toBe(CHAPTERS[0]!.title);
    expect(farm.coins).toBe(coins + CHAPTERS[0]!.reward.coins);
    expect(farm.story.chapter).toBe(1);
    expect(farm.story.introSeen).toBe(false);
    expect(finishChapter(farm)).toBeNull();
    // a chapter with a story request puts it on the board when it begins
    farm.story.chapter = CHAPTERS.findIndex(c => c.requests.length > 0);
    beginChapter(farm);
    expect(farm.orders.some(o => o.story === CHAPTERS[farm.story.chapter]!.requests[0]!.id)).toBe(true);
    expect(nextGoal(farm)).not.toBeNull();
  });

  it('after the story: three goals at a time, each paid and replaced', () => {
    const farm = newFarm(3);
    farm.story.chapter = CHAPTERS.length;
    expect(storyDone(farm)).toBe(true);
    startEndless(farm);
    expect(farm.story.endless).toHaveLength(3);
    const g = farm.story.endless[0]!;
    farm.stats[g.key] = (farm.stats[g.key] ?? 0) + g.n;
    const coins = farm.coins;
    const done = endlessTick(farm);
    expect(done.map(d => d.id)).toEqual([g.id]);
    expect(farm.coins).toBe(coins + g.coins);
    expect(farm.story.endless).toHaveLength(3);
  });
});

describe('actions', () => {
  it('runs the same rules for the UI, helpers, the bot and tests', () => {
    const farm = newFarm(4);
    const [x, z] = START_FIELDS[0]!;
    expect(act(farm, { type: 'plant', x, z, crop: 'wheat' }).ok).toBe(true);
    expect(farm.stats['planted:wheat']).toBe(1);
    expect(act(farm, { type: 'harvest', x, z }).ok).toBe(false); // not ripe yet
    farm.t += 60 * 10;
    expect(act(farm, { type: 'harvest', x, z }).ok).toBe(true);
    const r = act(farm, { type: 'plant', x: 0, z: 0, crop: 'wheat' });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why.length).toBeGreaterThan(5);
    expect(act(farm, { type: 'upgradeBarn' })).toEqual({ ok: false, why: 'A bigger barn costs 400 coins.' });
  });
});
