/**
 * A small, made-up dex for testing the rules on their own (the real content is tested separately).
 * Names are placeholders ("fx-…"), never shown in the game.
 */
import type { BattleDex, Element, Item, Move, Species, TraitId } from '../../src/core/types';

const base = { energy: 60, power: 60, guard: 60, speed: 60 };

function sp(num: number, id: string, element: Element, extra: Partial<Species> = {}): Species {
  return {
    num, id, name: id, family: id, stage: 1, element, base: { ...base }, trait: 'brave' as TraitId,
    favoriteSnack: 'berry-bun', friendliness: 1, xpYield: 60, blurb: '', inspiration: '', fact: '',
    learnset: [[1, 'bump'], [1, `${element}-hit`]],
    ...extra,
  };
}

export const species: Record<string, Species> = Object.fromEntries([
  sp(1, 'fx-flare', 'flare', { grows: { to: 'fx-flare2', level: 16 }, learnset: [[1, 'bump'], [1, 'flare-hit'], [5, 'pump'], [9, 'toast'], [12, 'shield'], [16, 'big-flare']] }),
  sp(2, 'fx-flare2', 'flare', { stage: 2, base: { energy: 75, power: 75, guard: 70, speed: 70 }, learnset: [[1, 'bump'], [1, 'flare-hit'], [5, 'pump'], [9, 'toast'], [16, 'big-flare'], [20, 'flare-burst']] }),
  sp(3, 'fx-tide', 'tide', { learnset: [[1, 'bump'], [1, 'tide-hit'], [6, 'soak'], [10, 'snack-time']] }),
  sp(4, 'fx-leaf', 'leaf', { trait: 'cozy' }),
  sp(5, 'fx-stone', 'stone', { trait: 'sturdy' }),
  sp(6, 'fx-gust', 'gust', { trait: 'speedy', base: { energy: 55, power: 60, guard: 50, speed: 80 } }),
  sp(7, 'fx-frost', 'frost', { trait: 'warm' }),
  sp(8, 'fx-volt', 'volt', { trait: 'thrifty' }),
  sp(9, 'fx-glow', 'glow', { trait: 'calm' }),
  sp(10, 'fx-slow', 'stone', { base: { energy: 70, power: 50, guard: 70, speed: 20 } }),
].map(s => [s.id, s]));

let n = 0;
function mv(id: string, element: Move['element'], power: number, cost: number, extra: Partial<Move> = {}): Move {
  return { n: ++n, id, name: id, element, kind: power > 0 ? 'attack' : 'buff', power, cost, desc: id, ...extra };
}

export const moves: Record<string, Move> = Object.fromEntries([
  mv('bump', 'plain', 35, 0),
  mv('flare-hit', 'flare', 55, 0.06),
  mv('tide-hit', 'tide', 55, 0.06),
  mv('leaf-hit', 'leaf', 55, 0.06),
  mv('stone-hit', 'stone', 55, 0.06),
  mv('gust-hit', 'gust', 55, 0.06),
  mv('frost-hit', 'frost', 55, 0.06),
  mv('volt-hit', 'volt', 55, 0.06),
  mv('glow-hit', 'glow', 55, 0.06),
  mv('big-flare', 'flare', 90, 0.18),
  mv('flare-burst', 'flare', 100, 0.2),
  mv('pump', 'plain', 0, 0.06, { kind: 'buff', effects: [{ type: 'boost', stat: 'power', stages: 1, target: 'self' }] }),
  mv('shield', 'plain', 0, 0.05, { kind: 'shield', priority: 1, effects: [{ type: 'shield', amount: 0.5 }] }),
  mv('lullaby', 'plain', 0, 0.08, { kind: 'status', effects: [{ type: 'status', status: 'sleepy', chance: 1, target: 'foe' }] }),
  mv('wobble', 'plain', 0, 0.08, { kind: 'status', effects: [{ type: 'status', status: 'dizzy', chance: 1, target: 'foe' }] }),
  mv('soak', 'tide', 35, 0.06, { effects: [{ type: 'status', status: 'soaked', chance: 1, target: 'foe' }] }),
  mv('toast', 'flare', 30, 0.06, { effects: [{ type: 'status', status: 'toasty', chance: 1, target: 'foe' }] }),
  mv('chill', 'frost', 30, 0.06, { effects: [{ type: 'status', status: 'chilly', chance: 1, target: 'foe' }] }),
  mv('snack-time', 'plain', 0, 0, { kind: 'heal', effects: [{ type: 'restore', amount: 0.2 }] }),
  mv('shake-off', 'plain', 0, 0.03, { kind: 'heal', effects: [{ type: 'cleanse' }] }),
  mv('quick-bump', 'plain', 25, 0.03, { priority: 1 }),
  mv('soften', 'plain', 0, 0.05, { kind: 'status', effects: [{ type: 'boost', stat: 'guard', stages: -1, target: 'foe' }] }),
].map(m => [m.id, m]));

export const items: Record<string, Item> = {
  berry: { n: 1, id: 'berry', name: 'Berry', kind: 'berry', price: 20, desc: '', restore: 0.3 },
  mint: { n: 2, id: 'mint', name: 'Mint', kind: 'berry', price: 20, desc: '', cleanse: true },
  'wake-berry': { n: 3, id: 'wake-berry', name: 'Wake Berry', kind: 'berry', price: 60, desc: '', restore: 0.5, revive: true },
  'flare-charm': { n: 4, id: 'flare-charm', name: 'Flare Charm', kind: 'gear', price: 200, desc: '', gear: { element: 'flare', moveBoost: 0.1 } },
};

export const dex: BattleDex = { species, moves, items };
