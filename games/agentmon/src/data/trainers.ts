/**
 * Everyone you spar with by choice: the six Trial Keepers, your rival Juno, the Spotlight Club,
 * fellow Field Agents along the routes, and the post-game rematches.
 *
 * Levels are for Normal. Easy and Hard shift Keeper and rival levels (tuning.ts difficulty), and
 * Hard adds one more teammate to Keepers. `@rival` is Juno's partner, which depends on yours:
 * Juno picks one that is never strong against your partner.
 */
import type { Difficulty } from '../core/types';

export interface TrainerMon {
  /** A species id, or '@rival:N' for Juno's partner at growth stage N. */
  species: string;
  level: number;
  moves?: string[];
  gear?: string;
}

export type TrainerKind = 'keeper' | 'rival' | 'club' | 'agent' | 'rematch';

export interface TrainerDef {
  id: string;
  name: string;
  title: string;
  kind: TrainerKind;
  area: string;
  chapter: number;
  team: TrainerMon[];
  /** The AI level is the game's difficulty, except where a trainer is always gentle. */
  gentle?: boolean;
  /** Extra teammate on Hard (Keepers). */
  hardExtra?: TrainerMon;
  /** A story boss: the map always has a Rest Stop just before. */
  boss?: boolean;
}

/** Juno's partner for each of yours (never one that's strong against yours). */
export const RIVAL_PARTNER: Record<string, string> = { spinnet: 'druzling', druzling: 'spinnet', buzzbill: 'spinnet' };
const FAMILY_LINE: Record<string, [string, string, string]> = {
  spinnet: ['spinnet', 'twirlwing', 'maplegale'],
  druzling: ['druzling', 'druzette', 'druzarch'],
  buzzbill: ['buzzbill', 'zipbill', 'voltabill'],
};

export function resolveSpecies(species: string, playerStarter: string): string {
  const m = species.match(/^@rival:(\d)$/);
  if (!m) return species;
  const partner = RIVAL_PARTNER[playerStarter] ?? 'spinnet';
  return FAMILY_LINE[partner]![Number(m[1]) - 1]!;
}

const mon = (species: string, level: number, extra: Partial<TrainerMon> = {}): TrainerMon => ({ species, level, ...extra });

export const TRAINERS: TrainerDef[] = [
  // ---- Chapter 0–1: Brightmoor and the Meadow Path
  { id: 'juno-1', name: 'Juno', title: 'Rival', kind: 'rival', area: 'academy-garden', chapter: 0, gentle: true, team: [mon('@rival:1', 4)] },
  { id: 'agent-pia', name: 'Pia', title: 'Field Agent', kind: 'agent', area: 'meadow-path', chapter: 1, gentle: true, team: [mon('kernip', 5)] },
  { id: 'agent-tomo', name: 'Tomo', title: 'Field Agent', kind: 'agent', area: 'meadow-path', chapter: 1, team: [mon('snipsy', 5), mon('burrowby', 6)] },

  // ---- Chapter 2: Saltwhistle and the Lighthouse Trial (Tide)
  { id: 'agent-coral', name: 'Coral', title: 'Field Agent', kind: 'agent', area: 'sandy-shore', chapter: 2, team: [mon('dewpud', 8), mon('hummet', 8)] },
  { id: 'lighthouse-helper', name: 'Finch', title: 'Lighthouse Helper', kind: 'agent', area: 'lighthouse-trial', chapter: 2, team: [mon('lullakin', 9)] },
  {
    id: 'keeper-marisol', name: 'Marisol', title: 'Lighthouse Keeper', kind: 'keeper', area: 'lighthouse-trial', chapter: 2,
    team: [mon('dewpud', 10), mon('lullakin', 12)], hardExtra: mon('kernip', 11),
  },

  // ---- Chapter 3: Cliff Road
  { id: 'agent-rafi', name: 'Rafi', title: 'Field Agent', kind: 'agent', area: 'cliff-road', chapter: 3, team: [mon('zestle', 11), mon('spinnet', 11)] },
  { id: 'agent-lou', name: 'Lou', title: 'Field Agent', kind: 'agent', area: 'cliff-road', chapter: 3, team: [mon('druzling', 12)] },
  { id: 'juno-2', name: 'Juno', title: 'Rival', kind: 'rival', area: 'cliff-road', chapter: 3, team: [mon('snipsy', 12), mon('@rival:1', 14)] },

  // ---- Chapter 4: Mossgrove and the Canopy Trial (Leaf)
  { id: 'agent-ivo', name: 'Ivo', title: 'Field Agent', kind: 'agent', area: 'mossgrove-woods', chapter: 4, team: [mon('buzzbill', 13), mon('fiddlit', 14)] },
  { id: 'canopy-helper', name: 'Tilly', title: 'Canopy Helper', kind: 'agent', area: 'canopy-trial', chapter: 4, team: [mon('snipsy', 14), mon('gleamgrub', 14)] },
  {
    id: 'keeper-oren', name: 'Oren', title: 'Canopy Keeper', kind: 'keeper', area: 'canopy-trial', chapter: 4,
    team: [mon('fiddlit', 14), mon('leafhauler', 16), mon('frondle', 17)], hardExtra: mon('lullakin', 16),
  },

  // ---- Chapter 5: Whisper Woods and Glimmer Cave (the Spotlight Club appears)
  { id: 'agent-bea', name: 'Bette', title: 'Field Agent', kind: 'agent', area: 'whisper-woods', chapter: 5, team: [mon('poplet', 17), mon('zestle', 16)] },
  { id: 'club-dot', name: 'Dot', title: 'Spotlight Club', kind: 'club', area: 'whisper-woods', chapter: 5, team: [mon('leafhauler', 17), mon('poplet', 18)] },
  { id: 'club-rudy', name: 'Rudy', title: 'Spotlight Club', kind: 'club', area: 'glimmer-cave', chapter: 5, team: [mon('glintle', 17), mon('druzette', 18)] },

  // ---- Chapter 6: Cragtop and the Old Mine Trial (Volt)
  { id: 'agent-sami', name: 'Sami', title: 'Field Agent', kind: 'agent', area: 'cragtop-slopes', chapter: 6, team: [mon('burrowbat', 20), mon('twirlwing', 20)] },
  { id: 'mine-helper', name: 'Gus', title: 'Mine Helper', kind: 'agent', area: 'old-mine-trial', chapter: 6, team: [mon('zipbill', 21), mon('druzette', 21)] },
  {
    id: 'keeper-vee', name: 'Vee', title: 'Old Mine Keeper', kind: 'keeper', area: 'old-mine-trial', chapter: 6,
    team: [mon('zestwick', 21), mon('zipbill', 22), mon('druzette', 22), mon('zestwick', 24)], hardExtra: mon('gleamgrub', 22),
  },

  // ---- Chapter 7: Canyon Trail
  { id: 'agent-noa', name: 'Noa', title: 'Field Agent', kind: 'agent', area: 'canyon-trail', chapter: 7, team: [mon('whirrbird', 24), mon('prismble', 24)] },
  { id: 'juno-3', name: 'Juno', title: 'Rival', kind: 'rival', area: 'canyon-trail', chapter: 7, team: [mon('leafhauler', 24), mon('poplet', 24), mon('@rival:2', 26)] },

  // ---- Chapter 8: Dunehollow and the Redrock Trial (Flare)
  { id: 'club-mabel', name: 'Mabel', title: 'Spotlight Club', kind: 'club', area: 'dune-flats', chapter: 8, team: [mon('zestwick', 26), mon('prismble', 27)] },
  { id: 'sunstone-helper', name: 'Rio', title: 'Redrock Helper', kind: 'agent', area: 'sunstone-trial', chapter: 8, team: [mon('poplet', 27), mon('whirrbird', 27)] },
  {
    id: 'keeper-sol', name: 'Sol', title: 'Redrock Keeper', kind: 'keeper', area: 'sunstone-trial', chapter: 8,
    team: [mon('poplet', 27), mon('whirrbird', 28), mon('burrowbat', 28), mon('fluffkorn', 31)], hardExtra: mon('zestwick', 28),
  },

  // ---- Chapter 9: Frost Pass
  { id: 'agent-kit', name: 'Kit', title: 'Field Agent', kind: 'agent', area: 'frost-pass', chapter: 9, team: [mon('hailbit', 29), mon('bathlet', 30)] },
  {
    id: 'club-velour', name: 'Velour', title: 'Spotlight Club Curator', kind: 'club', area: 'frost-pass', chapter: 9, boss: true,
    team: [mon('prismble', 30), mon('zestwick', 30), mon('leafhauler', 31), mon('fluffkorn', 32)],
  },

  // ---- Chapter 10: Frostfall and the Summit Trial (Frost)
  { id: 'agent-yan', name: 'Yan', title: 'Field Agent', kind: 'agent', area: 'frostfall-slopes', chapter: 10, team: [mon('scarfpaw', 32), mon('steambly', 32)] },
  { id: 'summit-helper', name: 'Pell', title: 'Summit Helper', kind: 'agent', area: 'summit-trial', chapter: 10, team: [mon('hailroll', 33), mon('mossbub', 33)] },
  {
    id: 'keeper-yuki', name: 'Yuki', title: 'Summit Keeper', kind: 'keeper', area: 'summit-trial', chapter: 10,
    team: [mon('hailroll', 33), mon('hardigrade', 34), mon('scarfpaw', 34), mon('steambly', 35), mon('scarfpaw', 36)], hardExtra: mon('hailroll', 35),
  },

  // ---- Chapter 11: Updraft Ridge
  { id: 'juno-4', name: 'Juno', title: 'Rival', kind: 'rival', area: 'updraft-ridge', chapter: 11, team: [mon('canopant', 35), mon('fluffkorn', 35), mon('galehum', 35), mon('steambly', 35), mon('@rival:3', 38)] },
  {
    id: 'club-velour-2', name: 'Velour', title: 'Spotlight Club Curator', kind: 'club', area: 'updraft-ridge', chapter: 11, boss: true,
    team: [mon('fluorelle', 35), mon('citrivolt', 35), mon('canopant', 36), mon('fluffkorn', 36), mon('prismble', 37)],
  },

  // ---- Chapter 12: Sky Island and the Beacon Spire Trial (Glow)
  { id: 'spire-helper', name: 'Nova', title: 'Spire Helper', kind: 'agent', area: 'beacon-spire', chapter: 12, team: [mon('silklight', 37), mon('galehum', 38)] },
  {
    id: 'keeper-celeste', name: 'Celeste', title: 'Beacon Spire Keeper', kind: 'keeper', area: 'beacon-spire', chapter: 12,
    team: [mon('silklight', 38), mon('fluorelle', 39), mon('galehum', 39), mon('citrivolt', 40), mon('starwisp', 41)], hardExtra: mon('maplegale', 40),
  },

  // ---- Post-game rematches (Normal levels; stronger teams with full move sets)
  { id: 'rematch-marisol', name: 'Marisol', title: 'Lighthouse Keeper', kind: 'rematch', area: 'lighthouse-trial', chapter: 14, team: [mon('hardigrade', 46), mon('grandatee', 47), mon('thermabara', 46), mon('voltabill', 46), mon('grandatee', 48)] },
  { id: 'rematch-oren', name: 'Oren', title: 'Canopy Keeper', kind: 'rematch', area: 'canopy-trial', chapter: 14, team: [mon('fernadore', 46), mon('canopant', 47), mon('starwisp', 46), mon('grandatee', 46), mon('fernadore', 48)] },
  { id: 'rematch-vee', name: 'Vee', title: 'Old Mine Keeper', kind: 'rematch', area: 'old-mine-trial', chapter: 14, team: [mon('citrivolt', 46), mon('voltabill', 47), mon('druzarch', 46), mon('fluorelle', 46), mon('citrivolt', 48)] },
  { id: 'rematch-sol', name: 'Sol', title: 'Redrock Keeper', kind: 'rematch', area: 'sunstone-trial', chapter: 14, team: [mon('fluffkorn', 46), mon('thermabara', 47), mon('bouldwom', 46), mon('galehum', 46), mon('fluffkorn', 48)] },
  { id: 'rematch-yuki', name: 'Yuki', title: 'Summit Keeper', kind: 'rematch', area: 'summit-trial', chapter: 14, team: [mon('hailcastle', 46), mon('scarfspire', 47), mon('hardigrade', 46), mon('thermabara', 46), mon('scarfspire', 48)] },
  { id: 'rematch-celeste', name: 'Celeste', title: 'Beacon Spire Keeper', kind: 'rematch', area: 'beacon-spire', chapter: 14, team: [mon('starwisp', 47), mon('fluorelle', 47), mon('maplegale', 47), mon('citrivolt', 47), mon('galehum', 48), mon('starwisp', 50)] },
  { id: 'rematch-juno', name: 'Juno', title: 'Rival', kind: 'rematch', area: 'brightmoor', chapter: 14, team: [mon('canopant', 47), mon('fluffkorn', 47), mon('galehum', 47), mon('thermabara', 47), mon('grandatee', 47), mon('@rival:3', 50)] },
];

export const TRAINER_BY_ID: Record<string, TrainerDef> = Object.fromEntries(TRAINERS.map(t => [t.id, t]));

/** A trainer's team for a difficulty (Keeper/rival levels shift; Hard adds a Keeper's extra). */
/**
 * How far a difficulty shifts levels in a chapter: the full shift from chapter 5 on, eased in over
 * the first chapters so the very first spars stay fair on Hard (and not trivial on Easy).
 */
export const difficultyShift = (shift: number, chapter: number) => Math.round(shift * Math.min(1, chapter / 5));

export function trainerTeam(t: TrainerDef, difficulty: Difficulty, playerStarter: string, offsets: { keeperLevel: number; keeperExtra: number }): TrainerMon[] {
  const full = difficultyShift(offsets.keeperLevel, t.chapter);
  const shift = t.kind === 'keeper' || t.kind === 'rival' || t.kind === 'club' || t.kind === 'rematch' ? full : Math.round(full / 2);
  const team = t.team.map(m => ({ ...m, species: resolveSpecies(m.species, playerStarter), level: Math.max(2, Math.min(50, m.level + shift)) }));
  if (difficulty === 'hard' && offsets.keeperExtra > 0 && t.hardExtra && t.chapter >= 4) team.splice(team.length - 1, 0, { ...t.hardExtra, level: Math.min(50, t.hardExtra.level + shift) });
  return team;
}
