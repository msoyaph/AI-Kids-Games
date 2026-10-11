import { GAME_VERSION } from '../config/version';
import type { KeyValueStore } from '../core/storage';
import { BOSS_ATTACKS, bossAttackPrefix, sourceName } from '../sim/sources';
import type { World } from '../sim/world';

/**
 * Playtest records (`?playtest=1`): what happened in a run, for comparing real players with
 * the balance simulator. Stored only on this device under `theabonk.playtest`, capped, and
 * never sent anywhere. Contains no personal data — no names, no device ids, no free text.
 */
export interface PlaytestRun {
  v: 1;
  game: string;
  /** ISO date-time (minute precision) the run ended. */
  at: string;
  hero: string;
  map: string;
  difficulty: string;
  seed: number;
  /** 'human' (recorded in-game) or 'bot' (simulator). */
  player: 'human' | 'bot';
  input: string;
  quality: string;
  tuned: boolean;
  result: 'dead' | 'won' | 'quit';
  time: number;
  level: number;
  kills: number;
  causeOfDeath: string | null;
  damageBySource: Record<string, number>;
  hitsBySource: Record<string, number>;
  /** Item keys used by picks/chests ("kind:id"), interned to keep records small. */
  items: string[];
  /** [time, level, offered item indices, picked item index or -1 for skip] */
  picks: Array<[number, number, number[], number]>;
  /** [time, reward item indices] */
  chests: Array<[number, number[]]>;
  /** [id, level, damage, kills] */
  weapons: Array<[string, number, number, number]>;
  passives: Array<[string, number]>;
  movement: { slideTime: number; airTime: number; jumps: number; topSpeed: number };
  bosses: Array<{ id: string; spawnedAt: number; killedAt: number | null; damageTaken: number; attacks: Record<string, { used: number; hits: number }> }>;
}

export interface PlaytestFile {
  format: 'theabonk-playtest';
  version: 1;
  runs: PlaytestRun[];
}

export const PLAYTEST_KEY = 'theabonk.playtest';
export const PLAYTEST_MAX_RUNS = 20;
export const PLAYTEST_MAX_BYTES = 60 * 1024;

const r1 = (v: number): number => Math.round(v * 10) / 10;

export interface RecordContext {
  map?: string;
  difficulty?: string;
  player?: 'human' | 'bot';
  input?: string;
  quality?: string;
  result?: PlaytestRun['result'];
  now?: Date;
}

export function recordRun(w: World, ctx: RecordContext = {}): PlaytestRun {
  const st = w.stats;
  const damageBySource: Record<string, number> = {};
  const hitsBySource: Record<string, number> = {};
  for (let s = 0; s < st.damageBy.length; s++) {
    if (st.hitsBy[s] === 0) continue;
    const name = sourceName(s);
    damageBySource[name] = r1(st.damageBy[s]);
    hitsBySource[name] = st.hitsBy[s];
  }
  const items: string[] = [];
  const index = new Map<string, number>();
  const intern = (k: string): number => {
    let i = index.get(k);
    if (i === undefined) {
      i = items.length;
      items.push(k);
      index.set(k, i);
    }
    return i;
  };
  const result: PlaytestRun['result'] = ctx.result ?? (w.state === 'won' ? 'won' : w.state === 'dead' ? 'dead' : 'quit');
  const at = (ctx.now ?? new Date()).toISOString().slice(0, 16) + 'Z';
  return {
    v: 1,
    game: GAME_VERSION,
    at,
    hero: w.player.character.id,
    map: ctx.map ?? w.map.id,
    difficulty: ctx.difficulty ?? 'normal',
    seed: w.seed,
    player: ctx.player ?? 'human',
    input: ctx.input ?? 'kbm',
    quality: ctx.quality ?? 'unknown',
    tuned: w.options.tuned,
    result,
    time: r1(w.time),
    level: w.player.level,
    kills: st.kills,
    causeOfDeath: result === 'dead' && st.lastSource ? sourceName(st.lastSource) : null,
    damageBySource,
    hitsBySource,
    items,
    picks: st.picks.map((p) => [r1(p.t), p.level, p.offered.map(intern), p.picked ? intern(p.picked) : -1]),
    chests: st.chests.map((c) => [r1(c.t), c.rewards.map(intern)]),
    weapons: w.weapons.map((x) => [x.def.id, x.level, Math.round(x.damageDealt), x.kills]),
    passives: w.passives.map((x) => [x.def.id, x.level]),
    movement: { slideTime: r1(st.slideTime), airTime: r1(st.airTime), jumps: st.jumps, topSpeed: r1(st.topSpeed) },
    bosses: st.bossFights.map((f) => {
      const attacks: Record<string, { used: number; hits: number }> = {};
      BOSS_ATTACKS.forEach((name, i) => {
        if (!name.startsWith(bossAttackPrefix(f.id))) return;
        const used = st.bossAttackUsed[i];
        const hits = st.bossAttackHits[i];
        if (used || hits) attacks[name] = { used, hits };
      });
      return { id: f.id, spawnedAt: r1(f.spawnedAt), killedAt: f.killedAt >= 0 ? r1(f.killedAt) : null, damageTaken: r1(f.damageTaken), attacks };
    }),
  };
}

/** Expand a run's interned picks back into item keys. */
export function expandPicks(r: PlaytestRun): Array<{ t: number; level: number; offered: string[]; picked: string | null }> {
  return r.picks.map(([t, level, offered, picked]) => ({ t, level, offered: offered.map((i) => r.items[i]), picked: picked >= 0 ? r.items[picked] : null }));
}

/** On-device store for playtest runs (newest last), capped by count and size. */
export class PlaytestStore {
  constructor(private store: KeyValueStore) {}

  load(): PlaytestRun[] {
    try {
      const raw = this.store.get(PLAYTEST_KEY);
      if (!raw) return [];
      const f = JSON.parse(raw) as PlaytestFile;
      return f && f.format === 'theabonk-playtest' && Array.isArray(f.runs) ? f.runs : [];
    } catch {
      return [];
    }
  }

  add(run: PlaytestRun): number {
    const runs = this.load();
    runs.push(run);
    while (runs.length > PLAYTEST_MAX_RUNS) runs.shift();
    let text = JSON.stringify(this.file(runs));
    while (runs.length > 1 && text.length > PLAYTEST_MAX_BYTES) {
      runs.shift();
      text = JSON.stringify(this.file(runs));
    }
    this.store.set(PLAYTEST_KEY, text);
    return runs.length;
  }

  clear(): void {
    this.store.remove(PLAYTEST_KEY);
  }

  file(runs = this.load()): PlaytestFile {
    return { format: 'theabonk-playtest', version: 1, runs };
  }
}
