/**
 * Move choice for wild Agentmon, Keepers and the simulation bots.
 *
 * Every option (each usable move, Rest, a switch) gets a score from simple, readable rules:
 * how much of the target's remaining energy a bump drains, finishing bonuses, the cost of the
 * move, and when resting, shielding, boosting or a gentle status are worth a turn.
 * - Easy: often picks any sensible option (never an impossible one).
 * - Normal: the best option, choosing at random among near-ties.
 * - Hard: also looks one reply ahead (the foe's best answer) and switches out of bad matchups.
 * The same scores drive the battle hints (the suggested move).
 */
import { TUNING } from '../../tuning';
import { effectiveness, matchup } from '../elements';
import { maxEnergy, speciesOf } from '../creature';
import { Rng } from '../rng';
import type { BattleDex, Difficulty, Move } from '../types';
import { active, activeFighter, awakeIndexes, bumpAmount, canUseMove, effectiveSpeed, moveCost, type Action, type Battle, type Side } from './engine';

export interface ScoredAction {
  action: Action;
  score: number;
}

const other = (side: Side): Side => (side === 0 ? 1 : 0);

/** The best bump the `side`'s active Agentmon could do right now, as a share of the target's energy. */
export function bestThreat(dex: BattleDex, b: Battle, side: Side): number {
  const user = active(b, side), target = active(b, other(side));
  let best = 0;
  for (const id of user.moves) {
    const m = dex.moves[id];
    if (!m || m.power <= 0 || !canUseMove(dex, b, side, id)) continue;
    best = Math.max(best, bumpAmount(dex, b, side, m) / Math.max(1, target.energy));
  }
  return best;
}

function scoreMove(dex: BattleDex, b: Battle, side: Side, m: Move): number {
  const user = active(b, side), target = active(b, other(side));
  const uf = activeFighter(b, side), tf = activeFighter(b, other(side));
  const max = maxEnergy(dex, user);
  const cost = moveCost(dex, b, side, m);
  const share = user.energy / max;
  let score = 0;
  let finishes = false;
  if (m.power > 0) {
    const amount = bumpAmount(dex, b, side, m);
    const frac = Math.min(1, amount / Math.max(1, target.energy));
    score += frac * 100;
    finishes = amount >= target.energy;
    if (finishes) score += 35;
  }
  for (const e of m.effects ?? []) {
    if (e.type === 'status') {
      const proof = TUNING.statusProof[speciesOf(dex, target).trait] === e.status;
      if (!tf.status && !proof && target.energy > max * 0.15) score += (e.status === 'sleepy' ? 34 : 24) * e.chance;
    } else if (e.type === 'boost') {
      const f = e.target === 'self' ? uf : tf;
      const room = e.target === 'self' ? (e.stages > 0 ? 2 - f.boosts[e.stat] : 0) : (e.stages < 0 ? f.boosts[e.stat] + 2 : 0);
      if (room > 0 && share > 0.5 && target.energy / maxEnergy(dex, target) > 0.4) score += 13 * Math.min(room, Math.abs(e.stages));
      else score += 1;
    } else if (e.type === 'shield') {
      const threat = bestThreat(dex, b, other(side));
      score += uf.shieldedLast ? -20 : threat > 0.3 ? 22 + threat * 20 : 2;
    } else if (e.type === 'restore') {
      score += share < 0.6 ? (1 - share) * 60 * e.amount * 4 : 0;
    } else if (e.type === 'cleanse') {
      score += uf.status ? 20 : 0;
    }
  }
  // Spending energy has a price, higher when low, and wasteful when a cheaper bump would finish.
  score -= TUNING.ai.costWeight * 100 * (cost / max) * (share < 0.4 ? 2 : 1) * (finishes ? 3 : 1);
  return score;
}

function scoreRest(dex: BattleDex, b: Battle, side: Side): number {
  const user = active(b, side);
  const max = maxEnergy(dex, user);
  const share = user.energy / max;
  if (share >= 0.95) return -50;
  const threat = bestThreat(dex, b, other(side));
  // If the foe would tucker us out even after resting, resting doesn't help.
  if (threat >= 1 + TUNING.energy.rest * max / Math.max(1, user.energy)) return -5;
  return share < TUNING.ai.restBelow ? 30 + (TUNING.ai.restBelow - share) * 100 : 4 - share * 10;
}

function scoreSwitch(dex: BattleDex, b: Battle, side: Side, to: number): number {
  const user = active(b, side), foe = active(b, other(side));
  const c = b.sides[side].team[to]!;
  const foeEl = speciesOf(dex, foe).element, userEl = speciesOf(dex, user).element, cEl = speciesOf(dex, c).element;
  const danger = effectiveness(foeEl, userEl) - effectiveness(foeEl, cEl);
  const offence = effectiveness(cEl, foeEl) - effectiveness(userEl, foeEl);
  const health = c.energy / maxEnergy(dex, c);
  if (danger <= 0 && offence <= 0) return -40;
  return (danger * 40 + offence * 25) * health - 8;
}

/** Every allowed option with its score (the switch options only for Hard and the hint). */
export function scoreOptions(dex: BattleDex, b: Battle, side: Side, withSwitches: boolean): ScoredAction[] {
  const user = active(b, side);
  const out: ScoredAction[] = [];
  for (const id of user.moves) {
    const m = dex.moves[id];
    if (!m || !canUseMove(dex, b, side, id)) continue;
    out.push({ action: { type: 'move', move: id }, score: scoreMove(dex, b, side, m) });
  }
  out.push({ action: { type: 'rest' }, score: scoreRest(dex, b, side) });
  if (withSwitches) {
    for (const i of awakeIndexes(b, side)) if (i !== b.sides[side].active) out.push({ action: { type: 'switch', to: i }, score: scoreSwitch(dex, b, side, i) });
  }
  return out;
}

/** Hard: look one reply ahead. A move that leaves us tuckered out before it lands is worth less. */
function lookahead(dex: BattleDex, b: Battle, side: Side, options: ScoredAction[]): ScoredAction[] {
  const user = active(b, side);
  const threat = bestThreat(dex, b, other(side));
  const foeFirst = effectiveSpeed(dex, b, other(side)) > effectiveSpeed(dex, b, side);
  return options.map(o => {
    let score = o.score;
    if (o.action.type === 'move') {
      const m = dex.moves[o.action.move]!;
      const cost = moveCost(dex, b, side, m);
      // If the foe moves first and would tucker us out, priority shields and quick moves win.
      if (foeFirst && threat * user.energy >= user.energy && !(m.priority && m.priority > 0)) score -= 30;
      // Spending energy into a big incoming bump is risky.
      if (threat * user.energy + cost >= user.energy && cost > 0) score -= 15;
    }
    if (o.action.type === 'switch' && threat >= 0.6) score += 10;
    return { ...o, score };
  });
}

export function chooseAction(dex: BattleDex, b: Battle, side: Side, level: Difficulty, rng: Rng): Action {
  if (b.needsSwitch === side) {
    const awake = awakeIndexes(b, side).filter(i => i !== b.sides[side].active);
    const scored = awake.map(i => ({ i, s: scoreSwitch(dex, b, side, i) + b.sides[side].team[i]!.energy / maxEnergy(dex, b.sides[side].team[i]!) * 10 }));
    scored.sort((x, y) => y.s - x.s);
    return { type: 'switch', to: level === 'easy' ? rng.pick(awake) : scored[0]!.i };
  }
  const switches = level === 'hard' && TUNING.ai.hardSwitch && b.sides[side].kind !== 'wild';
  let options = scoreOptions(dex, b, side, switches);
  if (level === 'hard') options = lookahead(dex, b, side, options);
  options.sort((x, y) => y.score - x.score);
  const best = options[0]!;
  if (level === 'easy') {
    const sensible = options.filter(o => o.score > -10);
    if (sensible.length > 1 && rng.chance(TUNING.ai.easyRandom)) return rng.pick(sensible).action;
    return best.action;
  }
  if (level === 'normal') {
    const margin = Math.abs(best.score) * TUNING.ai.normalTie + 0.5;
    const near = options.filter(o => best.score - o.score <= margin);
    return rng.pick(near).action;
  }
  return best.action;
}

/** The hint's suggested move for the player (Normal-level reasoning, no randomness). */
export function suggestMove(dex: BattleDex, b: Battle): string | null {
  const moves = scoreOptions(dex, b, 0, false).filter(o => o.action.type === 'move');
  moves.sort((x, y) => y.score - x.score);
  const top = moves[0];
  return top && top.action.type === 'move' ? top.action.move : null;
}

/**
 * The hint's suggested switch (or null): when the foe is strong against your active friend and an
 * awake teammate is strong against the foe (and not weak to it), with at least half its energy.
 */
export function suggestSwitch(dex: BattleDex, b: Battle): number | null {
  const side = b.sides[0];
  const me = side.team[side.active]!;
  const foe = b.sides[1].team[b.sides[1].active]!;
  const myEl = dex.species[me.species]!.element, foeEl = dex.species[foe.species]!.element;
  if (matchup(foeEl, myEl) !== 'strong') return null;
  let best: number | null = null;
  side.team.forEach((c, i) => {
    if (i === side.active || c.energy < maxEnergy(dex, c) * 0.5) return;
    const el = dex.species[c.species]!.element;
    if (matchup(el, foeEl) === 'strong' && matchup(foeEl, el) !== 'strong' && (best === null || c.level > side.team[best]!.level)) best = i;
  });
  return best;
}
