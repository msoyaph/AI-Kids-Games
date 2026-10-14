/**
 * The level-curve model: a typical, unhurried player goes through the story chapter by chapter,
 * sparring only with what's on the path (no grinding), befriending a few friends, growing them,
 * taking the suggested new moves, resting at Rest Stops, and sparring every trainer on the path.
 * It records how each Keeper spar went, so tests can check Keepers are beatable without grinding.
 */
import { bestMoveset, growthTarget, grow, heal, makeCreature, maxEnergy } from '../core/creature';
import { Rng } from '../core/rng';
import type { BattleDex, Creature, Difficulty } from '../core/types';
import { AREA_BY_ID } from '../data/areas';
import { CHAPTERS } from '../data/chapters';
import { difficultyShift, TRAINER_BY_ID, trainerTeam } from '../data/trainers';
import { TUNING } from '../tuning';
import { runBattle } from './battle-runner';

export interface TrainerResult {
  id: string;
  chapter: number;
  kind: string;
  attempts: number;
  topFoeLevel: number;
  teamLevels: number[];
}

export interface ProgressionResult {
  starter: string;
  difficulty: Difficulty;
  seed: number;
  trainers: TrainerResult[];
  battles: number;
  finalLevels: number[];
}

/** After battles: grow when ready (the kid says yes) and take the suggested moves. */
function tidy(dex: BattleDex, team: Creature[]) {
  for (const c of team) {
    while (growthTarget(dex, c)) grow(dex, c);
    const sp = dex.species[c.species]!;
    c.moves = bestMoveset(dex, sp, c.level);
  }
}

function wildFoe(dex: BattleDex, areaIds: string[], difficulty: Difficulty, chapter: number, rng: Rng): Creature | null {
  const entries = areaIds.flatMap(id => AREA_BY_ID[id]?.wild ?? []);
  if (!entries.length) return null;
  const e = rng.weighted(entries, entries.map(x => x.weight));
  const level = Math.max(2, rng.range(e.min, e.max) + difficultyShift(TUNING.difficulty[difficulty].wildLevel, chapter));
  return makeCreature(dex, { species: e.species, level }, rng);
}

export function simulateProgression(dex: BattleDex, starter: string, difficulty: Difficulty, seed: number, maxAttempts = 5): ProgressionResult {
  const rng = new Rng(seed);
  const team: Creature[] = [makeCreature(dex, { species: starter, level: 5 }, rng)];
  const ai = TUNING.difficulty[difficulty].ai;
  const out: ProgressionResult = { starter, difficulty, seed, trainers: [], battles: 0, finalLevels: [] };
  const restStop = () => team.forEach(c => heal(dex, c));
  const awake = () => team.filter(c => c.energy > 0);

  for (const ch of CHAPTERS) {
    restStop();
    // Wild spars on the path: the team rests at a Rest Stop now and then (every third spar),
    // and a napping friend wakes up there too.
    for (let i = 0; i < ch.pathSpars; i++) {
      if (i > 0 && i % 3 === 0) restStop();
      if (!awake().length) restStop();
      const foe = wildFoe(dex, ch.areas, difficulty, ch.n, rng);
      if (!foe) break;
      const wildAi: Difficulty = difficulty === 'hard' ? 'normal' : 'easy';
      const lead = team.findIndex(c => c.energy > 0);
      const ordered = [team[lead]!, ...team.filter((_, j) => j !== lead)];
      const r = runBattle(dex, { kind: 'wild', player: ordered, foe: [foe], difficulty, playerAi: 'normal', foeAi: wildAi, seed: rng.int(2 ** 31) });
      out.battles++;
      if (r.outcome === 'lost') restStop();
      tidy(dex, team);
    }
    // New friends join (healed), at the level they were met.
    for (const id of ch.befriend) {
      const area = ch.areas.map(a => AREA_BY_ID[a]).find(a => a?.wild.some(w => w.species === id));
      const e = area?.wild.find(w => w.species === id);
      const level = e ? Math.round((e.min + e.max) / 2) + difficultyShift(TUNING.difficulty[difficulty].wildLevel, ch.n) : 10;
      const friend = makeCreature(dex, { species: id, level }, rng);
      if (team.length < 6) team.push(friend);
    }
    tidy(dex, team);
    // Trainers on the path, in order. Rest before Keepers and rivals (there's always a Rest Stop).
    for (const id of ch.trainers) {
      const t = TRAINER_BY_ID[id]!;
      const offsets = TUNING.difficulty[difficulty];
      let attempts = 0;
      let won = false;
      while (!won && attempts < maxAttempts) {
        attempts++;
        if (t.kind === 'keeper' || t.kind === 'rival' || t.boss || attempts > 1 || !awake().length) restStop();
        const foes = trainerTeam(t, difficulty, starter, offsets).map(m => makeCreature(dex, { species: m.species, level: m.level }, rng));
        const r = runBattle(dex, { kind: 'trainer', player: team, foe: foes, difficulty, playerAi: 'normal', foeAi: t.gentle ? 'easy' : ai, seed: rng.int(2 ** 31) });
        out.battles++;
        won = r.outcome === 'won';
        tidy(dex, team);
      }
      out.trainers.push({ id, chapter: ch.n, kind: t.kind, attempts: won ? attempts : Infinity, topFoeLevel: Math.max(...trainerTeam(t, difficulty, starter, offsets).map(m => m.level)), teamLevels: team.map(c => c.level) });
    }
  }
  out.finalLevels = team.map(c => c.level);
  void maxEnergy;
  return out;
}
