import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import type { Difficulty } from '../../src/core/types';
import { MAPS } from '../../src/data/maps/index';
import { QUESTS } from '../../src/data/quests';
import { CHAPTERS } from '../../src/data/chapters';
import { AREA_BY_ID } from '../../src/data/areas';
import { playthrough, type BotResult } from '../../src/sim/bot';

/**
 * The headless playthrough: the bot plays from Gran's house to the credits on every difficulty
 * (three seeds each, so all three partners), and fuzzed runs must never soft-lock. The pacing model
 * turns the Normal runs into a play time and writes reports/pacing.md.
 */
const SEEDS = [1, 2, 3];
const runs: { difficulty: Difficulty; seed: number; r: BotResult }[] = [];

/** What a kid does beyond the bot's straight line (each number is explained in the report). */
export const PACING = {
  /** Kids look around, take detours and walk back and forth: walking takes this much longer. */
  exploreWalk: 2,
  /** Seconds to say hello to each townsperson once (most kids talk to most people). */
  chatPerPerson: 10,
  /** Minutes for an average side quest (the extra walking, a spar or a befriend, the reward). */
  sideQuestMinutes: 6,
  /** Minutes per chapter in menus: the Field Guide, the Agent Base, the team, settings. */
  menuMinutesPerChapter: 2,
  chapters: 14,
  /** Kids spar with about the chapter's `pathSpars` wild Agentmon; the bot may do fewer. Seconds each. */
  wildSparSeconds: 60,
  /** Friends a kid makes on the way to the credits (the bot makes only the ones it needs). Minutes each. */
  friendsByCredits: 25,
  befriendMinutes: 2.5,
};

export function pacing(r: BotResult) {
  const c = r.clock;
  // the story's hours: people and side quests you meet before the credits (1.1 moved the model off
  // post-game places and quests, which Banyan Hollow added; 1.0 counted the meadow's three people)
  const post = new Set(Object.values(MAPS).filter(m => (m.wild ?? []).some(a => (AREA_BY_ID[a]?.chapter ?? 0) >= 14)).map(m => m.id));
  for (const m of Object.values(MAPS)) if (!m.outdoor && m.warps.length && m.warps.every(w => post.has(w.to))) post.add(m.id);
  const people = Object.values(MAPS).filter(m => !post.has(m.id)).reduce((n, m) => n + m.npcs.filter(p => !p.trainer && !p.creature).length, 0);
  const sideQuests = QUESTS.filter(q => q.side && !q.id.startsWith('guardian') && !q.postgame).length;
  const plannedSpars = CHAPTERS.reduce((n, ch) => n + ch.pathSpars, 0);
  const parts = {
    walking: c.walk * PACING.exploreWalk,
    'more wild spars (to the chapters\' usual number)': Math.max(0, plannedSpars - r.spars.wild) * PACING.wildSparSeconds,
    'more friends (Field Guide collecting)': Math.max(0, PACING.friendsByCredits - r.befriends) * PACING.befriendMinutes * 60,
    reading: c.read,
    spars: c.battle,
    befriending: c.befriend,
    puzzles: c.puzzle,
    'menus and story moments': c.menus + PACING.menuMinutesPerChapter * 60 * PACING.chapters,
    'chatting with townspeople': people * PACING.chatPerPerson,
    'side quests': sideQuests * PACING.sideQuestMinutes * 60,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { parts, total, people, sideQuests };
}

describe('playthrough bot', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
    for (const seed of SEEDS) {
      it(`${difficulty}, seed ${seed}: plays from Gran's house to the credits`, async () => {
        const r = await playthrough({ seed, difficulty });
        runs.push({ difficulty, seed, r });
        expect(r.ok, r.reason).toBe(true);
      }, 300_000);
    }
  }

  for (const seed of [11, 12, 13]) {
    it(`fuzzed run ${seed}: wandering, losing on purpose and reloading never soft-locks`, async () => {
      const r = await playthrough({ seed, difficulty: seed === 12 ? 'hard' : 'normal', fuzz: 0.2 });
      expect(r.ok, r.reason).toBe(true);
      expect(r.fuzzActions).toBeGreaterThan(20);
    }, 300_000);
  }

  it('Mood Match (no timing) also gets through the whole story', async () => {
    const r = await playthrough({ seed: 21, difficulty: 'normal', befriendMode: 'mood' });
    expect(r.ok, r.reason).toBe(true);
  }, 300_000);

  it('takes about eight hours on Normal (±10%)', () => {
    const normal = runs.filter(x => x.difficulty === 'normal' && x.r.ok);
    expect(normal.length).toBe(SEEDS.length);
    for (const { r } of normal) {
      const h = pacing(r).total / 3600;
      expect(h, `${h.toFixed(2)} h`).toBeGreaterThan(7.2);
      expect(h, `${h.toFixed(2)} h`).toBeLessThan(8.8);
    }
  });
});

afterAll(() => {
  if (!runs.length) return;
  const fmt = (s: number) => `${(s / 3600).toFixed(2)} h`;
  const lines = [
    '# Pacing and playthrough report',
    '',
    'Written by `tests/sim/playthrough.test.ts`. The bot (`src/sim/bot.ts`) plays the whole story with the',
    'game\'s own rules and keeps a clock of what a kid would spend. The pacing model adds what a kid does',
    'beyond the bot\'s straight line:',
    '',
    `- walking × ${PACING.exploreWalk} (looking around, detours, walking back and forth)`,
    `- ${PACING.chatPerPerson} s to say hello to each townsperson once`,
    `- ${PACING.sideQuestMinutes} min for each side quest`,
    `- ${PACING.menuMinutesPerChapter} min a chapter in menus (Field Guide, Agent Base, team, settings) × ${PACING.chapters} chapters`,
    `- the wild spars kids usually have on the way (each chapter's \`pathSpars\`, ${PACING.wildSparSeconds} s each) beyond the bot's`,
    `- about ${PACING.friendsByCredits} friends by the credits (${PACING.befriendMinutes} min each) beyond the bot's`,
    '',
    'The bot\'s own clock: walking 0.2 s a tile, reading 1 s a line plus 2.5 words a second, spars 8 s a',
    'turn (choosing plus the animations at 1×), befriending, puzzles 60 s a room plus 4 s a move.',
    'This is a model of a typical unhurried kid, not a measurement; real play varies a lot.',
    '',
    '## Runs',
    '',
    '| Difficulty | Seed | Result | Bot clock | Model total | Steps | Wild / trainer spars | Lost | Friends | Rests | Rooms | Final team |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...runs.map(({ difficulty, seed, r }) => {
      const c = r.clock;
      const bot = c.walk + c.read + c.battle + c.befriend + c.puzzle + c.menus;
      return `| ${difficulty} | ${seed} | ${r.ok ? 'credits' : r.reason} | ${fmt(bot)} | ${fmt(pacing(r).total)} | ${r.steps} | ${r.spars.wild} / ${r.spars.trainer} | ${r.spars.lost} | ${r.befriends} | ${r.rests} | ${r.roomsSolved} | ${r.team.map(t => `${t.species} ${t.level}`).join(', ')} |`;
    }),
  ];
  const normal = runs.find(x => x.difficulty === 'normal' && x.r.ok);
  if (normal) {
    const p = pacing(normal.r);
    lines.push('', `## Normal, seed ${normal.seed}: where the time goes`, '', '| Part | Time |', '|---|---|',
      ...Object.entries(p.parts).map(([k, v]) => `| ${k} | ${(v / 60).toFixed(0)} min |`), `| **Total** | **${fmt(p.total)}** |`,
      '', `(${p.people} townspeople; ${p.sideQuests} side quests.)`, '',
      '## Normal, by main quest stage (bot clock, minutes)', '', '| Stage | Minutes |', '|---|---|',
      ...normal.r.stageTimes.map((t, i) => `| ${i} | ${((t - (normal.r.stageTimes[i - 1] ?? 0)) / 60).toFixed(0)} |`));
  }
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/pacing.md', lines.join('\n') + '\n');
});
