/** The game's real content, bundled as the lookup tables the rules use. */
import { codecTables } from '../core/save/codec';
import type { BattleDex } from '../core/types';
import { ITEMS } from './items';
import { MOVES } from './moves';
import { SPECIES } from './species';

export const DEX: BattleDex = { species: SPECIES, moves: MOVES, items: ITEMS };
export const CODEC = codecTables(DEX, ITEMS);
