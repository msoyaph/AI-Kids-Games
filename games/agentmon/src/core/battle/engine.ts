/**
 * The battle rules: friendly 1-vs-1 sparring with one energy bar per Agentmon.
 *
 * - Bumps (attacks) drain the target's energy; each move also costs its user a little energy.
 *   Every Agentmon always has a free move, so it can never get stuck.
 * - Rest restores some energy and uses the turn. At 0 energy an Agentmon is tuckered out and naps.
 * - Turn order: switching, items, befriending and walking away first; then move priority; then speed.
 *
 * Pure and deterministic: all randomness comes from the battle's seeded RNG. The renderer replays
 * the returned events as animations and text; nothing here knows about the screen.
 */
import { TUNING } from '../../tuning';
import { effectiveness, matchup, type Matchup } from '../elements';
import { gainXp, maxEnergy, speciesOf, stats, type LevelUpReport } from '../creature';
import { Rng } from '../rng';
import type { BattleDex, BoostStat, Creature, Difficulty, Move, SnackId, StatusId, TraitId } from '../types';

export type Side = 0 | 1;
export type Mood = 'happy' | 'calm' | 'grumpy';

export interface Fighter {
  status?: { id: StatusId; turns: number };
  boosts: Record<BoostStat, number>;
  /** Share of the next bump blocked, this turn only. */
  shield: number;
  /** Took part since the battle started (full experience). */
  sparred: boolean;
  /** Used a shield last turn (shields don't stack turn after turn). */
  shieldedLast: boolean;
}

export interface BattleSide {
  kind: 'player' | 'wild' | 'trainer';
  team: Creature[];
  fighters: Fighter[];
  active: number;
}

export type Action =
  | { type: 'move'; move: string }
  | { type: 'rest' }
  | { type: 'switch'; to: number }
  | { type: 'item'; item: string; target?: number }
  | { type: 'befriend'; fill: number; snack?: SnackId }
  | { type: 'leave' };

export type Outcome = 'won' | 'lost' | 'befriended' | 'left' | 'wandered';

export type BattleEvent =
  | { t: 'act'; side: Side; kind: Action['type']; move?: string; item?: string }
  | { t: 'bump'; side: Side; amount: number; matchup: Matchup; energy: number }
  | { t: 'spend'; side: Side; amount: number; energy: number }
  | { t: 'restore'; side: Side; amount: number; energy: number }
  | { t: 'status'; side: Side; status: StatusId; on: boolean }
  | { t: 'boost'; side: Side; stat: BoostStat; stages: number }
  | { t: 'shield'; side: Side; amount: number }
  | { t: 'blocked'; side: Side }
  | { t: 'wobble'; side: Side }
  | { t: 'asleep'; side: Side }
  | { t: 'wake'; side: Side }
  | { t: 'toasty'; side: Side; amount: number; energy: number }
  | { t: 'fail'; side: Side; reason: 'status-held' | 'status-proof' | 'too-tired' | 'no-effect' }
  | { t: 'tuckered'; side: Side; index: number }
  | { t: 'switch'; side: Side; index: number }
  | { t: 'xp'; index: number; amount: number }
  | { t: 'level'; index: number; report: LevelUpReport }
  | { t: 'befriend'; success: boolean; interest: number }
  | { t: 'coins'; amount: number }
  | { t: 'end'; outcome: Outcome };

export interface BattleOptions {
  kind: 'wild' | 'trainer';
  player: Creature[];
  foe: Creature[];
  difficulty: Difficulty;
  seed: number;
  /** Shared experience setting (on by default). */
  sharedXp?: boolean;
  mood?: Mood;
  /** Guardians never wander off and can be befriended at any energy once tired once. */
  guardian?: boolean;
  /** Player's first awake friend leads unless given. */
  lead?: number;
}

export interface Battle {
  kind: 'wild' | 'trainer';
  difficulty: Difficulty;
  sharedXp: boolean;
  mood: Mood;
  guardian: boolean;
  rng: number;
  turn: number;
  sides: [BattleSide, BattleSide];
  /** Wild only: missed befriend tries left before it wanders off. */
  interest: number;
  /** Set when a side's active Agentmon is tuckered out and the player must pick the next one. */
  needsSwitch: Side | null;
  outcome: Outcome | null;
  befriended?: Creature;
  coins: number;
}

const fighter = (): Fighter => ({ boosts: { power: 0, guard: 0, speed: 0 }, shield: 0, sparred: false, shieldedLast: false });

export function startBattle(dex: BattleDex, o: BattleOptions): Battle {
  const lead = o.lead ?? o.player.findIndex(c => c.energy > 0);
  if (lead < 0 || !o.player[lead] || o.player[lead]!.energy <= 0) throw new Error('no awake friend to lead');
  const b: Battle = {
    kind: o.kind,
    difficulty: o.difficulty,
    sharedXp: o.sharedXp ?? true,
    mood: o.mood ?? 'calm',
    guardian: !!o.guardian,
    rng: new Rng(o.seed).state,
    turn: 0,
    sides: [
      { kind: 'player', team: o.player, fighters: o.player.map(fighter), active: lead },
      { kind: o.kind === 'wild' ? 'wild' : 'trainer', team: o.foe, fighters: o.foe.map(fighter), active: Math.max(0, o.foe.findIndex(c => c.energy > 0)) },
    ],
    interest: o.guardian ? Infinity : TUNING.befriend.interest,
    needsSwitch: null,
    outcome: null,
    coins: 0,
  };
  b.sides[0].fighters[lead]!.sparred = true;
  b.sides[1].fighters[b.sides[1].active]!.sparred = true;
  void dex;
  return b;
}

export const active = (b: Battle, side: Side): Creature => b.sides[side].team[b.sides[side].active]!;
export const activeFighter = (b: Battle, side: Side): Fighter => b.sides[side].fighters[b.sides[side].active]!;
const other = (side: Side): Side => (side === 0 ? 1 : 0);

function traitOf(dex: BattleDex, c: Creature): TraitId {
  return speciesOf(dex, c).trait;
}

/** A trait's effect strength: full for the trait itself, lighter for guardians. */
function has(dex: BattleDex, c: Creature, trait: TraitId): number {
  const t = traitOf(dex, c);
  if (t === trait) return 1;
  if (t === 'guardian' && trait !== 'friendly') return TUNING.traits.guardianLight;
  return 0;
}

function gearOf(dex: BattleDex, c: Creature) {
  return c.gear ? dex.items[c.gear]?.gear : undefined;
}

/** Energy a move costs this Agentmon right now. */
export function moveCost(dex: BattleDex, b: Battle, side: Side, move: Move): number {
  if (move.cost <= 0) return 0;
  const c = active(b, side), f = activeFighter(b, side);
  let mult = 1;
  if (f.status?.id === 'chilly') mult *= TUNING.status.chillyCost;
  const thrifty = has(dex, c, 'thrifty');
  if (thrifty) mult *= 1 - (1 - TUNING.traits.thriftyCost) * thrifty;
  return Math.max(1, Math.ceil(maxEnergy(dex, c) * move.cost * mult));
}

export function canUseMove(dex: BattleDex, b: Battle, side: Side, moveId: string): boolean {
  const c = active(b, side);
  if (!c.moves.includes(moveId)) return false;
  const move = dex.moves[moveId];
  if (!move) return false;
  const cost = moveCost(dex, b, side, move);
  return cost === 0 || c.energy - cost >= TUNING.energy.keepAfterCost;
}

export function effectiveSpeed(dex: BattleDex, b: Battle, side: Side): number {
  const c = active(b, side), f = activeFighter(b, side);
  let s = stats(dex, c).speed * TUNING.damage.boost[f.boosts.speed]!;
  if (f.status?.id === 'soaked') s *= TUNING.status.soakedSpeed;
  const speedy = has(dex, c, 'speedy');
  if (speedy) s *= 1 + (TUNING.traits.speedySpeed - 1) * speedy;
  const g = gearOf(dex, c);
  if (g?.speed) s *= 1 + g.speed;
  return s;
}

/**
 * The bump a move would do (no spread when `expected`). Used by the rules, the AI and the hints.
 */
export function bumpAmount(dex: BattleDex, b: Battle, side: Side, move: Move, spread = 1): number {
  if (move.power <= 0) return 0;
  const user = active(b, side), target = active(b, other(side));
  const uf = activeFighter(b, side), tf = activeFighter(b, other(side));
  const us = stats(dex, user), ts = stats(dex, target);
  const userSpecies = speciesOf(dex, user), targetSpecies = speciesOf(dex, target);
  let power = us.power * TUNING.damage.boost[uf.boosts.power]!;
  const brave = has(dex, user, 'brave');
  if (brave && user.energy <= maxEnergy(dex, user) * TUNING.traits.braveBelow) power *= 1 + (TUNING.traits.bravePower - 1) * brave;
  let guard = ts.guard * TUNING.damage.boost[tf.boosts.guard]!;
  const tg = gearOf(dex, target);
  if (tg?.guard) guard *= 1 + tg.guard;
  const lf = (2 * user.level) / 5 + 2;
  let amount = (lf * move.power * power) / Math.max(1, guard) / TUNING.damage.divisor + TUNING.damage.flat;
  if (move.element !== 'plain' && move.element === userSpecies.element) amount *= TUNING.elements.sameElement;
  const eff = effectiveness(move.element, targetSpecies.element);
  amount *= eff;
  if (eff > 1) {
    const sturdy = has(dex, target, 'sturdy');
    if (sturdy) amount *= 1 - (1 - TUNING.traits.sturdyStrongTaken) * sturdy;
  }
  if (move.element === 'volt' && tf.status?.id === 'soaked') amount *= TUNING.status.soakedVoltTaken;
  const ug = gearOf(dex, user);
  if (ug?.moveBoost && (!ug.element || ug.element === move.element)) amount *= 1 + ug.moveBoost;
  amount *= spread;
  if (tf.shield > 0) amount *= 1 - tf.shield;
  return Math.max(TUNING.damage.minimum, Math.floor(amount));
}

function isAwake(c: Creature) {
  return c.energy > 0;
}

export function awakeIndexes(b: Battle, side: Side): number[] {
  return b.sides[side].team.map((c, i) => (isAwake(c) ? i : -1)).filter(i => i >= 0);
}

/** Can the player try to befriend right now? */
export function canBefriend(dex: BattleDex, b: Battle): boolean {
  if (b.kind !== 'wild' || b.outcome) return false;
  const foe = active(b, 1);
  return foe.energy <= maxEnergy(dex, foe) * TUNING.befriend.threshold;
}

function priorityOf(dex: BattleDex, a: Action): number {
  switch (a.type) {
    case 'leave':
    case 'befriend':
      return 10;
    case 'switch':
      return 8;
    case 'item':
      return 6;
    case 'rest':
      return 0;
    case 'move':
      return dex.moves[a.move]?.priority ?? 0;
  }
}

function setStatus(dex: BattleDex, b: Battle, side: Side, status: StatusId, ev: BattleEvent[]): boolean {
  const c = active(b, side), f = activeFighter(b, side);
  if (f.status) { ev.push({ t: 'fail', side, reason: 'status-held' }); return false; }
  const trait = traitOf(dex, c);
  if (TUNING.statusProof[trait] === status) { ev.push({ t: 'fail', side, reason: 'status-proof' }); return false; }
  let turns = TUNING.status.turns[status];
  if (has(dex, c, 'cheerful') >= 1 && turns > 1) turns -= 1;
  f.status = { id: status, turns };
  ev.push({ t: 'status', side, status, on: true });
  return true;
}

function clearStatus(b: Battle, side: Side, ev: BattleEvent[]) {
  const f = activeFighter(b, side);
  if (!f.status) return;
  const id = f.status.id;
  f.status = undefined;
  ev.push({ t: 'status', side, status: id, on: false });
}

function restore(dex: BattleDex, c: Creature, share: number): number {
  const max = maxEnergy(dex, c);
  const amount = Math.min(max - c.energy, Math.max(1, Math.round(max * share)));
  c.energy += Math.max(0, amount);
  return Math.max(0, amount);
}

function doMove(dex: BattleDex, b: Battle, side: Side, moveId: string, rng: Rng, ev: BattleEvent[]) {
  const user = active(b, side);
  const move = dex.moves[moveId];
  if (!move || !user.moves.includes(moveId)) return;
  const cost = moveCost(dex, b, side, move);
  if (cost > 0 && user.energy - cost < TUNING.energy.keepAfterCost) {
    ev.push({ t: 'fail', side, reason: 'too-tired' });
    return;
  }
  ev.push({ t: 'act', side, kind: 'move', move: moveId });
  if (cost > 0) {
    user.energy -= cost;
    ev.push({ t: 'spend', side, amount: cost, energy: user.energy });
  }
  const foeSide = other(side);
  const target = active(b, foeSide), tf = activeFighter(b, foeSide);
  if (move.power > 0) {
    const spread = rng.float(TUNING.damage.spreadMin, TUNING.damage.spreadMax);
    const amount = Math.min(target.energy, bumpAmount(dex, b, side, move, spread));
    const blocked = tf.shield > 0;
    target.energy -= amount;
    if (blocked) ev.push({ t: 'blocked', side: foeSide });
    ev.push({ t: 'bump', side: foeSide, amount, matchup: matchup(move.element, speciesOf(dex, target).element), energy: target.energy });
    if (tf.status?.id === 'sleepy' && target.energy > 0) {
      tf.status = undefined;
      ev.push({ t: 'wake', side: foeSide });
    }
  }
  for (const e of move.effects ?? []) {
    if (e.type === 'status') {
      if (target.energy > 0 && rng.chance(e.chance)) setStatus(dex, b, foeSide, e.status, ev);
    } else if (e.type === 'boost') {
      const s = e.target === 'self' ? side : foeSide;
      if (e.target === 'foe' && target.energy <= 0) continue;
      const f = activeFighter(b, s);
      const before = f.boosts[e.stat];
      f.boosts[e.stat] = Math.max(-2, Math.min(2, before + e.stages));
      const changed = f.boosts[e.stat] - before;
      if (changed !== 0) ev.push({ t: 'boost', side: s, stat: e.stat, stages: changed });
      else ev.push({ t: 'fail', side: s, reason: 'no-effect' });
    } else if (e.type === 'shield') {
      const f = activeFighter(b, side);
      if (f.shieldedLast) { ev.push({ t: 'fail', side, reason: 'no-effect' }); continue; }
      f.shield = e.amount;
      ev.push({ t: 'shield', side, amount: e.amount });
    } else if (e.type === 'restore') {
      const amount = restore(dex, user, e.amount);
      ev.push({ t: 'restore', side, amount, energy: user.energy });
    } else if (e.type === 'cleanse') {
      clearStatus(b, side, ev);
    }
  }
}

function doRest(dex: BattleDex, b: Battle, side: Side, ev: BattleEvent[]) {
  const c = active(b, side);
  ev.push({ t: 'act', side, kind: 'rest' });
  let share = TUNING.energy.rest + TUNING.traits.cozyRest * has(dex, c, 'cozy');
  const g = gearOf(dex, c);
  if (g?.restBoost) share += g.restBoost;
  const amount = restore(dex, c, share);
  ev.push({ t: 'restore', side, amount, energy: c.energy });
}

function doSwitch(b: Battle, side: Side, to: number, ev: BattleEvent[]) {
  const s = b.sides[side];
  if (to === s.active || !s.team[to] || !isAwake(s.team[to]!)) return;
  // Leaving the field clears boosts and shields (statuses stay with the Agentmon until the end).
  const f = s.fighters[s.active]!;
  f.boosts = { power: 0, guard: 0, speed: 0 };
  f.shield = 0;
  f.shieldedLast = false;
  s.active = to;
  s.fighters[to]!.sparred = true;
  ev.push({ t: 'switch', side, index: to });
}

function doItem(dex: BattleDex, b: Battle, side: Side, itemId: string, targetIndex: number | undefined, ev: BattleEvent[]) {
  const item = dex.items[itemId];
  const s = b.sides[side];
  const index = targetIndex ?? s.active;
  const c = s.team[index];
  if (!item || item.kind !== 'berry' || !c) return;
  ev.push({ t: 'act', side, kind: 'item', item: itemId });
  if (!isAwake(c) && !item.revive) { ev.push({ t: 'fail', side, reason: 'no-effect' }); return; }
  if (item.restore) {
    const amount = restore(dex, c, item.restore);
    if (index === s.active) ev.push({ t: 'restore', side, amount, energy: c.energy });
  }
  if (item.cleanse && index === s.active) clearStatus(b, side, ev);
}

/** Experience for tuckering out the foe's active Agentmon, shared as the setting says. */
function awardXp(dex: BattleDex, b: Battle, foe: Creature, ev: BattleEvent[]) {
  const sp = speciesOf(dex, foe);
  const base = (sp.xpYield * foe.level) / 7 * (b.kind === 'trainer' ? TUNING.xp.trainerBonus : 1);
  const team = b.sides[0].team;
  const avg = team.reduce((sum, c) => sum + c.level, 0) / Math.max(1, team.length);
  team.forEach((c, i) => {
    const f = b.sides[0].fighters[i]!;
    let share = f.sparred ? 1 : b.sharedXp ? TUNING.xp.benchShare : 0;
    if (share <= 0) return;
    if (c.level < avg - 0.5) share *= 1 + TUNING.xp.catchUp;
    if (speciesOf(dex, c).trait === 'friendly') share *= TUNING.traits.friendlyXp;
    const amount = Math.max(1, Math.floor(base * share));
    ev.push({ t: 'xp', index: i, amount });
    const report = gainXp(dex, c, amount);
    if (report.to > report.from) ev.push({ t: 'level', index: i, report });
  });
}

/** Pick the AI side's next Agentmon after one is tuckered out: the best matchup that's awake. */
export function bestReplacement(dex: BattleDex, b: Battle, side: Side): number {
  const opp = active(b, other(side));
  const oppEl = speciesOf(dex, opp).element;
  let best = -1, bestScore = -Infinity;
  for (const i of awakeIndexes(b, side)) {
    const c = b.sides[side].team[i]!;
    const el = speciesOf(dex, c).element;
    let score = c.energy / maxEnergy(dex, c) + c.level / 100;
    score += (effectiveness(el, oppEl) - 1) * 1.2; // our element hits theirs
    score -= (effectiveness(oppEl, el) - 1) * 1.2; // their element hits ours
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

function checkTuckered(dex: BattleDex, b: Battle, ev: BattleEvent[]): boolean {
  for (const side of [1, 0] as Side[]) {
    const c = active(b, side);
    if (c.energy > 0) continue;
    const f = activeFighter(b, side);
    if (f.status) f.status = undefined;
    ev.push({ t: 'tuckered', side, index: b.sides[side].active });
    if (side === 1) awardXp(dex, b, c, ev);
  }
  const foeLeft = awakeIndexes(b, 1).length, playerLeft = awakeIndexes(b, 0).length;
  if (foeLeft === 0) {
    finish(dex, b, 'won', ev);
    return true;
  }
  if (playerLeft === 0) {
    finish(dex, b, 'lost', ev);
    return true;
  }
  if (active(b, 1).energy <= 0) doSwitch(b, 1, bestReplacement(dex, b, 1), ev);
  if (active(b, 0).energy <= 0) b.needsSwitch = 0;
  return false;
}

function finish(dex: BattleDex, b: Battle, outcome: Outcome, ev: BattleEvent[]) {
  b.outcome = outcome;
  if (outcome === 'won') {
    const foe = b.sides[1].team;
    const top = Math.max(...foe.map(c => c.level));
    b.coins = b.kind === 'trainer' ? TUNING.economy.trainerCoins * top * foe.length : TUNING.economy.wildCoins * top;
    ev.push({ t: 'coins', amount: b.coins });
  }
  for (const [i, c] of b.sides[0].team.entries()) {
    if (b.sides[0].fighters[i]!.sparred || b.sharedXp) c.friendship = Math.min(255, c.friendship + TUNING.xp.friendshipPerBattle);
  }
  void dex;
  ev.push({ t: 'end', outcome });
}

function tryBefriend(dex: BattleDex, b: Battle, fill: number, ev: BattleEvent[]) {
  ev.push({ t: 'act', side: 0, kind: 'befriend' });
  if (!canBefriend(dex, b)) { ev.push({ t: 'fail', side: 0, reason: 'no-effect' }); return; }
  const success = fill >= TUNING.befriend.need - 1e-9;
  if (success) {
    const friend = active(b, 1);
    b.befriended = friend;
    ev.push({ t: 'befriend', success: true, interest: b.interest });
    finish(dex, b, 'befriended', ev);
    return;
  }
  b.interest -= 1;
  ev.push({ t: 'befriend', success: false, interest: b.interest });
  if (b.interest <= 0) finish(dex, b, 'wandered', ev);
}

/** Is this action allowed for the side right now? (The UI only offers allowed ones.) */
export function isAllowed(dex: BattleDex, b: Battle, side: Side, a: Action): boolean {
  if (b.outcome) return false;
  if (b.needsSwitch === side) return a.type === 'switch' && isAwake(b.sides[side].team[a.to] ?? ({ energy: 0 } as Creature)) && a.to !== b.sides[side].active;
  switch (a.type) {
    case 'move': return canUseMove(dex, b, side, a.move);
    case 'rest': return active(b, side).energy < maxEnergy(dex, active(b, side));
    case 'switch': return a.to !== b.sides[side].active && !!b.sides[side].team[a.to] && isAwake(b.sides[side].team[a.to]!);
    case 'item': return side === 0 && dex.items[a.item]?.kind === 'berry';
    case 'befriend': return side === 0 && canBefriend(dex, b);
    case 'leave': return side === 0 && b.kind === 'wild';
  }
}

/**
 * Resolve one turn. When the player must replace a tuckered-out Agentmon, call with only the
 * player's switch (`foeAction` is ignored and the foe doesn't act).
 */
export function resolveTurn(dex: BattleDex, b: Battle, playerAction: Action, foeAction: Action): BattleEvent[] {
  const ev: BattleEvent[] = [];
  if (b.outcome) return ev;
  const rng = new Rng(0).restore(b.rng);
  if (b.needsSwitch === 0) {
    if (playerAction.type === 'switch' && isAllowed(dex, b, 0, playerAction)) {
      doSwitch(b, 0, playerAction.to, ev);
      b.needsSwitch = null;
    }
    b.rng = rng.state;
    return ev;
  }
  b.turn++;
  const actions: { side: Side; a: Action; prio: number; speed: number; tie: number; who: Creature }[] = [
    { side: 0, a: playerAction, prio: priorityOf(dex, playerAction), speed: effectiveSpeed(dex, b, 0), tie: rng.next(), who: active(b, 0) },
    { side: 1, a: foeAction, prio: priorityOf(dex, foeAction), speed: effectiveSpeed(dex, b, 1), tie: rng.next(), who: active(b, 1) },
  ];
  actions.sort((x, y) => y.prio - x.prio || y.speed - x.speed || y.tie - x.tie);
  for (const f of [activeFighter(b, 0), activeFighter(b, 1)]) f.shield = 0;
  const shieldedThisTurn: [boolean, boolean] = [false, false];

  for (const { side, a, who } of actions) {
    if (b.outcome) break;
    // A replacement that came in mid-turn doesn't inherit the tuckered-out one's plan.
    if (active(b, side) !== who && a.type !== 'befriend' && a.type !== 'leave') continue;
    if (!isAllowed(dex, b, side, a)) {
      // An action that stopped being possible (e.g. too tired after a Toasty turn) becomes a rest.
      if (a.type === 'move' && active(b, side).energy > 0) doRest(dex, b, side, ev);
      continue;
    }
    const c = active(b, side), f = activeFighter(b, side);
    if (c.energy <= 0) continue;
    if (a.type === 'leave') {
      ev.push({ t: 'act', side, kind: 'leave' });
      finish(dex, b, 'left', ev);
      break;
    }
    if (a.type === 'befriend') { tryBefriend(dex, b, a.fill, ev); continue; }
    if (a.type === 'switch') { doSwitch(b, side, a.to, ev); continue; }
    if (a.type === 'item') { doItem(dex, b, side, a.item, a.target, ev); continue; }
    // Sleepy and Dizzy can stop a move or a rest.
    if (f.status?.id === 'sleepy') {
      // Sleepy counts the turns it actually skips, so it lasts the same however fast the sleeper is.
      ev.push({ t: 'asleep', side });
      f.status.turns -= 1;
      if (f.status.turns <= 0) { f.status = undefined; ev.push({ t: 'wake', side }); }
      continue;
    }
    if (f.status?.id === 'dizzy' && rng.chance(TUNING.status.dizzyWobble)) { ev.push({ t: 'wobble', side }); continue; }
    if (a.type === 'rest') doRest(dex, b, side, ev);
    else {
      doMove(dex, b, side, a.move, rng, ev);
      if (f.shield > 0) shieldedThisTurn[side] = true;
    }
    if (checkTuckered(dex, b, ev)) break;
  }

  if (!b.outcome) {
    // End of turn: Toasty drains a little, statuses count down, shields fade.
    for (const side of [0, 1] as Side[]) {
      const c = active(b, side), f = activeFighter(b, side);
      if (c.energy <= 0) continue;
      if (f.status?.id === 'toasty') {
        const amount = Math.min(c.energy, Math.max(1, Math.round(maxEnergy(dex, c) * TUNING.status.toastyDrain)));
        c.energy -= amount;
        ev.push({ t: 'toasty', side, amount, energy: c.energy });
      }
      if (f.status && f.status.id !== 'sleepy') {
        f.status.turns -= 1;
        if (f.status.turns <= 0) {
          const id = f.status.id;
          f.status = undefined;
          ev.push({ t: 'status', side, status: id, on: false });
        }
      }
    }
    checkTuckered(dex, b, ev);
  }
  for (const side of [0, 1] as Side[]) {
    const f = activeFighter(b, side);
    f.shield = 0;
    f.shieldedLast = shieldedThisTurn[side];
  }
  b.rng = rng.state;
  return ev;
}

/** After the battle: tuckered-out friends stay napping until a Rest Stop or a berry; the rest
 *  catch their breath a little. Statuses never outlast a battle. */
export function afterBattle(dex: BattleDex, b: Battle): void {
  for (const c of b.sides[0].team) {
    if (c.energy > 0) c.energy = Math.min(maxEnergy(dex, c), c.energy + Math.round(maxEnergy(dex, c) * TUNING.energy.afterBattle));
  }
  if (b.befriended) b.befriended.energy = maxEnergy(dex, b.befriended);
}
