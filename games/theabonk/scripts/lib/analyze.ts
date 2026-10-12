import { expandPicks, type PlaytestRun } from '../../src/meta/playtest';
import { simulateRun } from '../../src/sim/headless';

/** Aggregated view of a set of runs (human or bot), comparable field by field. */
export interface Summary {
  runs: number;
  avgTime: number;
  medianTime: number;
  winRate: number;
  avgLevel: number;
  deathCauses: Record<string, number>;
  /** Share of total damage taken per source (0..1). */
  damageShare: Record<string, number>;
  damagePerMinute: number;
  slideShare: number;
  airShare: number;
  jumpsPerMinute: number;
  /** attack → { used, hits, rate } summed over runs. */
  bossAttacks: Record<string, { used: number; hits: number; rate: number }>;
  bossKillRate: Record<string, { fights: number; kills: number; avgTimeToKill: number | null }>;
  /** item key → { offered, picked, rate } */
  picks: Record<string, { offered: number; picked: number; rate: number }>;
}

export interface GroupReport {
  key: string;
  hero: string;
  map: string;
  difficulty: string;
  human: Summary;
  bot: Summary;
}

export interface Suggestion {
  priority: number;
  text: string;
}

const median = (v: number[]): number => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarizeRuns(runs: PlaytestRun[]): Summary {
  const n = runs.length || 1;
  const totalTime = runs.reduce((a, r) => a + r.time, 0) || 1;
  const deathCauses: Record<string, number> = {};
  const damage: Record<string, number> = {};
  let damageTotal = 0;
  const bossAttacks: Summary['bossAttacks'] = {};
  const bossKillRate: Summary['bossKillRate'] = {};
  const ttk: Record<string, number[]> = {};
  const picks: Summary['picks'] = {};
  for (const r of runs) {
    if (r.result === 'dead' && r.causeOfDeath) deathCauses[r.causeOfDeath] = (deathCauses[r.causeOfDeath] ?? 0) + 1;
    for (const [s, d] of Object.entries(r.damageBySource)) {
      damage[s] = (damage[s] ?? 0) + d;
      damageTotal += d;
    }
    for (const b of r.bosses) {
      const k = (bossKillRate[b.id] ??= { fights: 0, kills: 0, avgTimeToKill: null });
      k.fights++;
      if (b.killedAt !== null) {
        k.kills++;
        (ttk[b.id] ??= []).push(b.killedAt - b.spawnedAt);
      }
      for (const [a, v] of Object.entries(b.attacks)) {
        const t = (bossAttacks[a] ??= { used: 0, hits: 0, rate: 0 });
        t.used += v.used;
        t.hits += v.hits;
      }
    }
    for (const { offered, picked } of expandPicks(r)) {
      for (const o of offered) (picks[o] ??= { offered: 0, picked: 0, rate: 0 }).offered++;
      if (picked) (picks[picked] ??= { offered: 0, picked: 0, rate: 0 }).picked++;
    }
  }
  for (const t of Object.values(bossAttacks)) t.rate = t.used ? t.hits / t.used : 0;
  for (const [id, k] of Object.entries(bossKillRate)) k.avgTimeToKill = ttk[id]?.length ? ttk[id].reduce((a, b) => a + b, 0) / ttk[id].length : null;
  for (const p of Object.values(picks)) p.rate = p.offered ? p.picked / p.offered : 0;
  const damageShare: Record<string, number> = {};
  for (const [s, d] of Object.entries(damage)) damageShare[s] = damageTotal ? d / damageTotal : 0;
  return {
    runs: runs.length,
    avgTime: runs.reduce((a, r) => a + r.time, 0) / n,
    medianTime: median(runs.map((r) => r.time)),
    winRate: runs.filter((r) => r.result === 'won').length / n,
    avgLevel: runs.reduce((a, r) => a + r.level, 0) / n,
    deathCauses,
    damageShare,
    damagePerMinute: damageTotal / (totalTime / 60),
    slideShare: runs.reduce((a, r) => a + r.movement.slideTime, 0) / totalTime,
    airShare: runs.reduce((a, r) => a + r.movement.airTime, 0) / totalTime,
    jumpsPerMinute: runs.reduce((a, r) => a + r.movement.jumps, 0) / (totalTime / 60),
    bossAttacks,
    bossKillRate,
    picks,
  };
}

/** Which knob to turn for a damage source / boss attack that hurts people more than the bot. */
export function knobFor(source: string): string {
  if (source.startsWith('boss:')) {
    const a = source.slice(5);
    if (a === 'grumblecap.stomp') return 'tuning.telegraphs.grumblecapStompFuse (+0.15 s)';
    if (a === 'clockjaw.charge') return 'tuning.telegraphs.bossWindupMult (+0.1)';
    if (a === 'clockjaw.shockwave' || a === 'regent.rings') return 'tuning.telegraphs.shockwaveSpeedMult (−0.1)';
    if (a === 'regent.slam') return 'tuning.telegraphs.regentSlamFuse (+0.15 s)';
    if (a.endsWith('.contact')) return `boss damage in src/config/enemies.ts (${a.split('.')[0]})`;
    return `projectileSpeed / projectileDamage of the boss in src/config/enemies.ts (${a})`;
  }
  const [kind, id] = source.split(':');
  if (kind === 'contact') return `tuning.enemies.perType.${id} (−0.05) or ${id}.damage in src/config/enemies.ts`;
  if (kind === 'shot') return `${id}.projectileDamage / fireInterval in src/config/enemies.ts`;
  if (kind === 'explosion') return 'tuning.telegraphs.fuseMult (+0.1)';
  if (kind === 'hazard') return `the ${id} hazard in the map definition`;
  return 'n/a';
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function suggest(g: GroupReport): Suggestion[] {
  const out: Suggestion[] = [];
  const { human: h, bot: b } = g;
  const gap = h.avgTime - b.avgTime;
  if (gap < -90) {
    out.push({ priority: 3, text: `${g.key}: people survive ${mmss(-gap)} less than the bot (${mmss(h.avgTime)} vs ${mmss(b.avgTime)}). Consider easing: tuning.spawns.rateMult ×0.92 or tuning.combat.playerIframes +0.1 — then re-run the simulator.` });
  } else if (gap > 90) {
    out.push({ priority: 2, text: `${g.key}: people survive ${mmss(gap)} longer than the bot. The simulator under-estimates players here; keep that in mind before making the game easier.` });
  }
  for (const [s, share] of Object.entries(h.damageShare)) {
    if (share < 0.08) continue;
    const botShare = b.damageShare[s] ?? 0;
    if (share >= botShare * 1.5 + 0.03) {
      out.push({ priority: 2 + share, text: `${g.key}: "${s}" deals ${pct(share)} of the damage people take (bot: ${pct(botShare)}). Knob: ${knobFor(s)}.` });
    }
  }
  for (const [a, v] of Object.entries(h.bossAttacks)) {
    if (v.used < 3) continue;
    const bv = b.bossAttacks[a];
    if (v.rate >= 0.5 && v.rate >= (bv?.rate ?? 0) + 0.2) {
      out.push({ priority: 2.5, text: `${g.key}: boss attack ${a} hits people ${pct(v.rate)} of the time (bot ${pct(bv?.rate ?? 0)}). Make it easier to read/dodge: ${knobFor(`boss:${a}`)}.` });
    }
  }
  const deaths = Object.values(h.deathCauses).reduce((a, c) => a + c, 0);
  for (const [cause, n] of Object.entries(h.deathCauses)) {
    if (deaths >= 3 && n / deaths > 0.4) out.push({ priority: 2.2, text: `${g.key}: ${pct(n / deaths)} of deaths come from "${cause}". Knob: ${knobFor(cause)}.` });
  }
  for (const [item, p] of Object.entries(h.picks)) {
    if (p.offered < 5) continue;
    if (p.rate >= 0.75) out.push({ priority: 1, text: `${g.key}: "${item}" is taken ${pct(p.rate)} of the times it is offered — check it is not overpowered.` });
    else if (p.rate <= 0.1) out.push({ priority: 1, text: `${g.key}: "${item}" is almost never taken (${pct(p.rate)}) — it may need a buff or a clearer description.` });
  }
  if (h.slideShare < b.slideShare * 0.5 && b.slideShare > 0.05) {
    out.push({ priority: 0.5, text: `${g.key}: people slide ${pct(h.slideShare)} of the time vs the bot's ${pct(b.slideShare)} — sliding may need a clearer prompt in How to play.` });
  }
  return out.sort((x, y) => y.priority - x.priority);
}

/** Group human runs and simulate the same hero/map/difficulty mix with the bot. */
export function analyze(humanRuns: PlaytestRun[], opts: { seeds?: number; skill?: number; maxSeconds?: number } = {}): { groups: GroupReport[]; suggestions: Suggestion[] } {
  const seeds = opts.seeds ?? 6;
  const skill = opts.skill ?? 0.7;
  const byKey = new Map<string, PlaytestRun[]>();
  for (const r of humanRuns) {
    const key = `${r.hero}/${r.map}/${r.difficulty}`;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(r);
  }
  const groups: GroupReport[] = [];
  for (const [key, runs] of byKey) {
    const { hero, map, difficulty } = runs[0];
    const bot: PlaytestRun[] = [];
    for (let s = 0; s < seeds; s++) bot.push(simulateRun({ characterId: hero, seed: 7000 + s * 104729, skill, maxSeconds: opts.maxSeconds }).record);
    groups.push({ key, hero, map, difficulty, human: summarizeRuns(runs), bot: summarizeRuns(bot) });
  }
  return { groups, suggestions: groups.flatMap(suggest).sort((a, b) => b.priority - a.priority) };
}

export function formatReport(groups: GroupReport[], suggestions: Suggestion[]): string {
  const lines: string[] = [];
  for (const g of groups) {
    const { human: h, bot: b } = g;
    lines.push(`\n■ ${g.key} — ${h.runs} human run(s) vs ${b.runs} simulated`);
    lines.push(`  survival   avg ${mmss(h.avgTime)} / median ${mmss(h.medianTime)}   vs bot ${mmss(b.avgTime)} / ${mmss(b.medianTime)}`);
    lines.push(`  wins       ${pct(h.winRate)} vs ${pct(b.winRate)}     level ${h.avgLevel.toFixed(1)} vs ${b.avgLevel.toFixed(1)}`);
    lines.push(`  damage/min ${h.damagePerMinute.toFixed(1)} vs ${b.damagePerMinute.toFixed(1)}`);
    lines.push(`  movement   slide ${pct(h.slideShare)} vs ${pct(b.slideShare)} · air ${pct(h.airShare)} vs ${pct(b.airShare)} · jumps/min ${h.jumpsPerMinute.toFixed(1)} vs ${b.jumpsPerMinute.toFixed(1)}`);
    const top = Object.entries(h.damageShare).sort((x, y) => y[1] - x[1]).slice(0, 6);
    if (top.length) lines.push(`  damage by source: ${top.map(([s, v]) => `${s} ${pct(v)} (bot ${pct(b.damageShare[s] ?? 0)})`).join(', ')}`);
    const causes = Object.entries(h.deathCauses).sort((x, y) => y[1] - x[1]).slice(0, 4);
    if (causes.length) lines.push(`  deaths: ${causes.map(([c, n]) => `${c} ×${n}`).join(', ')}`);
    for (const [id, k] of Object.entries(h.bossKillRate)) {
      const bk = b.bossKillRate[id];
      lines.push(`  boss ${id}: killed ${k.kills}/${k.fights}${k.avgTimeToKill !== null ? ` in ~${k.avgTimeToKill.toFixed(0)}s` : ''} (bot ${bk ? `${bk.kills}/${bk.fights}` : 'n/a'})`);
    }
    for (const [a, v] of Object.entries(h.bossAttacks)) {
      // contact "attacks" have no activations, only hits
      if (v.used === 0) lines.push(`    ${a}: ${v.hits} hit(s) vs bot ${b.bossAttacks[a]?.hits ?? 0}`);
      else lines.push(`    ${a}: hit ${v.hits}/${v.used} (${pct(v.rate)}) vs bot ${pct(b.bossAttacks[a]?.rate ?? 0)}`);
    }
  }
  lines.push('\nSuggestions (not applied — edit src/config/tuning.ts or use ?tune=1, then re-simulate):');
  if (!suggestions.length) lines.push('  none — real runs look close to the simulator.');
  for (const s of suggestions) lines.push(`  • ${s.text}`);
  return lines.join('\n');
}
