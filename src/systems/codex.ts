import { BODY_BY_ID } from '../data/bodies';
import { CODEX, CODEX_BY_ID } from '../data/codex';
import type { GameEvent } from './events';
import type { GameState } from './state';

/** Some bodies share a Codex page. */
const BODY_ENTRY: Record<string, string> = { tobble: 'tibble', wormhole: 'wormhole' };

export function codexIdForBody(body: string): string | null {
  const id = BODY_ENTRY[body] ?? body;
  return CODEX_BY_ID[id] ? id : null;
}

export function discover(st: GameState, id: string | null): boolean {
  if (!id || !CODEX_BY_ID[id]) return false;
  if (!st.addUnique(st.data.codex, id)) return false;
  st.post({ kind: 'codex', id });
  return true;
}

export function codexPercent(codex: string[]): number {
  const known = codex.filter((c) => CODEX_BY_ID[c]).length;
  return Math.round((known / CODEX.length) * 100);
}

const AREA_ENTRIES: Record<string, string[]> = {
  mars_canyon: ['valles'],
  mars_olympus: ['olympus'],
  zephyra_village: ['beacon'],
  moon_base: ['astronaut'],
};

const SYSTEM_ENTRIES: Record<string, string[]> = {
  belt: ['belt'],
  mercury: ['sun'],
  saturn: ['rings'],
  neptune: ['galaxy'],
  pluto: ['galaxy'],
  zephyra: ['zephyra', 'tibble'],
};

/** Listens to game events and fills in the Codex. First visits to real places show a fun fact. */
export function codexListener(e: GameEvent, st: GameState): void {
  switch (e.type) {
    case 'launch':
      discover(st, 'rocket');
      discover(st, 'star');
      discover(st, 'earth');
      discover(st, 'c_stella');
      break;
    case 'near':
    case 'land': {
      const id = codexIdForBody(e.body);
      const isNew = discover(st, id);
      if (isNew && id && BODY_BY_ID[e.body]?.real) st.post({ kind: 'fact', id });
      if (e.type === 'land' && e.body !== 'earth') discover(st, 'gravity');
      break;
    }
    case 'scan':
      if (e.target.startsWith('sat:')) discover(st, 'satellite');
      else {
        const id = codexIdForBody(e.target);
        if (discover(st, id) && id && BODY_BY_ID[e.target]?.real) st.post({ kind: 'fact', id });
      }
      break;
    case 'arrive':
      for (const id of SYSTEM_ENTRIES[e.system] ?? []) discover(st, id);
      break;
    case 'enterArea':
      for (const id of AREA_ENTRIES[e.area] ?? []) discover(st, id);
      if (/^(mercury|venus)_/.test(e.area)) discover(st, 'rover');
      break;
    case 'bump':
      discover(st, 'asteroid');
      break;
    case 'comet':
      discover(st, 'comet');
      break;
    case 'slingshot':
      discover(st, 'slingshot');
      break;
    case 'tow':
      discover(st, 'c_tuggy');
      break;
    case 'glimmer':
      discover(st, 'c_glimmers');
      break;
    case 'visit':
      if (e.place === 'hangar') discover(st, 'c_boltzy');
      if (e.place === 'lounge') {
        discover(st, 'c_pip');
        discover(st, 'c_rio');
      }
      break;
    case 'talk':
      discover(st, CODEX_BY_ID[`c_${e.npc}`] ? `c_${e.npc}` : null);
      break;
    case 'codex':
      discover(st, e.id);
      break;
    default:
      break;
  }
}
