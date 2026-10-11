// Daily challenges, achievements (tiered), the Lumen Exchange, and timed contests
// (fishing tournament / bug-off).
import { dayRng } from '../core/rng';
import { ACHIEVEMENTS, CHALLENGES, CONTESTS, LUMEN_OFFERS, MEDAL_PRIZES, TIER_LUMENS, TIER_NAMES, type LumenOffer } from '../data/challenges';
import { BUGS, BUG_BY_ID, FISH, FISH_BY_ID } from '../data/registry';
import { learnRecipe } from './crafting';
import type { Game } from './game';
import { give, money, setPocketSize } from './inventory';
import { museumPercent } from './museum';
import { matchFilter } from './quests';
import { islandStars } from './rating';
import { hearts, residents } from './villagers';

// ---------------------------------------------------------------- daily challenges

export function dailyChallenges(g: Game): void {
  const c = g.state.challenges;
  if (c.day === g.state.clock.day) return;
  const rng = dayRng(g.state.seed, g.state.clock.day, 'challenges');
  const picks = rng.shuffle([...CHALLENGES]).slice(0, 3);
  c.day = g.state.clock.day;
  c.list = picks.map((p) => ({ id: p.id, progress: 0, done: false }));
}

export function onChallengeEvent(g: Game, type: string, payload: unknown): void {
  const c = g.state.challenges;
  const pl = (payload ?? {}) as Record<string, unknown>;
  for (const cp of c.list) {
    if (cp.done) continue;
    const def = CHALLENGES.find((d) => d.id === cp.id);
    if (!def || def.event !== type || !matchFilter(def.filter, pl)) continue;
    cp.progress = Math.min(def.count, cp.progress + (def.sum ? Number(pl[def.sum] ?? 0) : 1));
    if (cp.progress >= def.count) {
      cp.done = true;
      c.completedTotal++;
      g.state.stats.challengesDone = (g.state.stats.challengesDone ?? 0) + 1;
      money(g, 0, def.reward, 'challenge');
      g.emit('challengeCompleted', { id: def.id, reward: def.reward });
      g.emit('sfx', { name: 'challenge' });
      g.toast(`Daily challenge complete: ${def.label}! +${def.reward} Lumens`, 'good');
    }
  }
}

// ---------------------------------------------------------------- achievements

export function metric(g: Game, stat: string): number {
  const s = g.state;
  if (!stat.startsWith('$')) return s.stats[stat] ?? 0;
  switch (stat) {
    case '$museumPct':
      return museumPercent(g);
    case '$residents':
      return residents(g).length;
    case '$bestFriends':
      return residents(g).filter((id) => hearts(s.villagers[id]!.friendship) >= 5).length;
    case '$homeLevel':
      return Math.max(0, s.home.level);
    case '$rating':
      return islandStars(g);
    case '$ownedFish':
      return FISH.filter((f) => s.catalog.owned[f.id]).length;
    case '$ownedBugs':
      return BUGS.filter((b) => s.catalog.owned[b.id]).length;
    case '$recipes':
      return s.recipes.length;
    case '$medal_tournament':
      return s.events.medals.tournament ?? 0;
    case '$medal_bugoff':
      return s.events.medals.bugoff ?? 0;
    case '$paths':
      return s.world.structures.filter((x) => x.type === 'bridge' || x.type === 'ramp').length;
    case '$day':
      return s.clock.day;
    case '$regions':
      return [1, 2, 3, 4, 5].filter((r) => s.flags[`visited_${r}`]).length;
    default:
      return 0;
  }
}

export function checkAchievements(g: Game): void {
  for (const a of ACHIEVEMENTS) {
    const have = g.state.achievements[a.id] ?? 0;
    if (have >= a.tiers.length) continue;
    const v = metric(g, a.stat);
    let tier = have;
    while (tier < a.tiers.length && v >= a.tiers[tier]!) tier++;
    if (tier > have) {
      g.state.achievements[a.id] = tier;
      for (let t = have; t < tier; t++) money(g, 0, TIER_LUMENS[t]!, 'achievement');
      g.emit('achievement', { id: a.id, tier });
      g.emit('sfx', { name: 'achievement' });
      g.toast(`Achievement: ${a.name} — ${TIER_NAMES[tier - 1]}!`, 'good');
    }
  }
}

// ---------------------------------------------------------------- Lumen Exchange

export function offerAvailable(g: Game, o: LumenOffer): boolean {
  if (o.kind === 'pockets') {
    const size = o.value as number;
    if (g.state.player.invSize >= size) return false;
    if (size === 40 && g.state.player.invSize < 30) return false;
  }
  if (o.kind === 'recipe' && g.state.recipes.includes(o.value as string)) return false;
  return true;
}

export function buyOffer(g: Game, id: string): boolean {
  const o = LUMEN_OFFERS.find((x) => x.id === id);
  if (!o || !offerAvailable(g, o) || g.state.player.lumens < o.cost) return false;
  money(g, 0, -o.cost, 'exchange');
  if (o.kind === 'pockets') setPocketSize(g, o.value as number);
  else if (o.kind === 'recipe') learnRecipe(g, o.value as string, 'lumen');
  else give(g, o.value as string, o.qty ?? 1, 'lumens');
  g.emit('sfx', { name: 'coins' });
  return true;
}

// ---------------------------------------------------------------- contests

export type ContestKind = 'tournament' | 'bugoff';

export function contestPoints(kind: ContestKind, id: string): number {
  if (kind === 'tournament') {
    const f = FISH_BY_ID[id];
    return f ? f.size * 10 + f.rarity * 15 : 0;
  }
  const b = BUG_BY_ID[id];
  return b ? b.rarity * 20 + b.speed * 5 + 10 : 0;
}

export function startContest(g: Game, kind: ContestKind): boolean {
  if (g.state.events.active) return false;
  g.state.events.active = { kind, timeLeft: CONTESTS[kind].seconds, score: 0, catches: 0 };
  g.state.flags[`contest_${kind}_day`] = g.state.clock.day;
  g.emit('eventStarted', { kind });
  g.emit('sfx', { name: 'whistle' });
  return true;
}

export function medalFor(kind: ContestKind, score: number): number {
  return CONTESTS[kind].medals.filter((m) => score >= m).length;
}

export function finishContest(g: Game): void {
  const a = g.state.events.active;
  if (!a) return;
  g.state.events.active = null;
  const kind = a.kind;
  const medal = medalFor(kind, a.score);
  const ev = g.state.events;
  ev.best[kind] = Math.max(ev.best[kind] ?? 0, a.score);
  ev.medals[kind] = Math.max(ev.medals[kind] ?? 0, medal);
  if (medal > 0) {
    const prize = MEDAL_PRIZES[medal - 1]!;
    give(g, prize.trophy, 1, 'contest');
    money(g, 0, prize.lumens, 'contest');
  }
  g.emit('eventFinished', { kind, score: a.score, medal });
  g.emit('sfx', { name: medal >= 3 ? 'fanfareBig' : medal > 0 ? 'fanfare' : 'whistle' });
}

export function updateContest(g: Game, dt: number): void {
  const a = g.state.events.active;
  if (!a) return;
  if (g.mode === 'menu') return;
  a.timeLeft -= dt;
  if (a.timeLeft <= 0) finishContest(g);
}

/** Can the contest be (re)started today with this host? */
export function contestOpen(g: Game, kind: ContestKind): boolean {
  if (g.state.events.active) return false;
  const missionActive = !!g.state.quests.active[kind === 'tournament' ? 'm4_tourney' : 'm4_bugoff'];
  if (missionActive) return true;
  const unlocked = g.state.quests.done.includes(kind === 'tournament' ? 'm4_tourney' : 'm4_bugoff');
  return unlocked && g.state.flags[`contest_${kind}_day`] !== g.state.clock.day;
}

export function installChallenges(g: Game): void {
  // a contest can't survive a reload
  g.state.events.active = null;
  g.onDay(dailyChallenges);
  let t = 0;
  g.bus.onAny((type, payload) => {
    onChallengeEvent(g, type as string, payload);
    const a = g.state.events.active;
    if (a && ((type === 'fishCaught' && a.kind === 'tournament') || (type === 'bugCaught' && a.kind === 'bugoff'))) {
      const id = (payload as { id: string }).id;
      const pts = contestPoints(a.kind, id);
      a.score += pts;
      a.catches++;
      g.toast(`+${pts} points!`, 'good');
    }
  });
  g.onUpdate((game, dt) => {
    updateContest(game, dt);
    t += dt;
    if (t > 1) {
      t = 0;
      checkAchievements(game);
    }
  });
}
