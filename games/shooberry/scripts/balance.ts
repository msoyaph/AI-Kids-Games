// npx tsx scripts/balance.ts [--write]  — both bots play every Adventure level; prints (and with
// --write saves reports/balance.md) wins, stars, time and plant use. The unit test runs the same.
import { writeFileSync } from 'node:fs';
import { LEVELS } from '../src/data/levels';
import { chooseSeeds, makeBot, type Skill } from '../src/sim/bot';
import { createGame, run, stars } from '../src/sim/game';

export function play(levelIndex: number, skill: Skill, seed: number) {
  const level = LEVELS[levelIndex]!;
  const seeds = chooseSeeds(level, level.plants, level.seedSlots, skill, seed);
  const g = createGame(level, seeds, { seed, autoCollect: true });
  const bot = makeBot(skill, seed);
  run(g, 1200, bot);
  const used: Record<string, number> = {};
  for (const row of g.grid) for (const c of row) if (c.kind === 'plant') used[c.plant.kind] = (used[c.plant.kind] ?? 0) + 1;
  return { id: level.id, won: g.result === 'won', stars: stars(g), time: g.t, snacks: g.snacks, umbrellas: g.stats.umbrellasUsed, planted: g.stats.planted, seeds, used };
}

if (process.argv[1]?.endsWith('balance.ts')) {
  const rows: string[] = [];
  let goodWins = 0, casualOk = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const good = play(i, 'good', 1);
    const c1 = play(i, 'casual', 1), c2 = c1.won ? c1 : play(i, 'casual', 2);
    if (good.won) goodWins++;
    if (c2.won) casualOk++;
    rows.push(`| ${good.id} | ${good.won ? `${good.stars}★` : 'lost'} ${Math.round(good.time)} s | ${c1.won ? `${c1.stars}★` : 'lost'}${c1.won ? '' : ` → ${c2.won ? `${c2.stars}★` : 'lost'}`} | ${good.umbrellas} | ${good.seeds.join(', ')} |`);
  }
  const text = ['| Level | Good bot | Casual bot (1st → 2nd try) | Umbrellas used (good) | Good bot seeds |', '|---|---|---|---|---|', ...rows].join('\n');
  console.log(text);
  console.log(`good wins ${goodWins}/${LEVELS.length}, casual wins within two tries ${casualOk}/${LEVELS.length}`);
  if (process.argv.includes('--write')) writeFileSync('reports/balance.md', `# Balance (scripts/balance.ts)\n\n${text}\n`);
}
