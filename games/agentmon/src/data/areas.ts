/**
 * Wild Agentmon by area. Levels are for Normal (Easy and Hard shift them, see tuning.ts). Wild
 * Agentmon walk around visibly in their habitat (no hidden random battles); `spawns` is how many
 * are out at once, and they come back a little while after they wander off or make friends.
 * Every stage-1 Agentmon has at least one area, so all 48 can be befriended or grown without luck.
 */

export interface WildEntry {
  species: string;
  min: number;
  max: number;
  /** Relative chance among this area's spawns. */
  weight: number;
}

export interface AreaDef {
  id: string;
  name: string;
  /** Story chapter where the player first arrives (chapters.ts). */
  chapter: number;
  /** grass, cave, water, snow, sand, sky: where the visible spawns walk. */
  terrain: 'grass' | 'cave' | 'water' | 'snow' | 'sand' | 'sky' | 'none';
  spawns: number;
  wild: WildEntry[];
  /**
   * Species that are always out here while you can't yet pass a gate nearby: one of them shows
   * up first if you have no friend of its element (so the friend a gate needs is always visible).
   */
  ensure?: string[];
}

const w = (species: string, min: number, max: number, weight = 10): WildEntry => ({ species, min, max, weight });

export const AREAS: AreaDef[] = [
  { id: 'brightmoor', name: 'Brightmoor', chapter: 0, terrain: 'none', spawns: 0, wild: [] },
  { id: 'academy-garden', name: 'Academy Garden', chapter: 0, terrain: 'grass', spawns: 3, wild: [w('kernip', 2, 3), w('snipsy', 2, 3), w('burrowby', 2, 3)] },
  { id: 'meadow-path', name: 'Meadow Path', chapter: 1, terrain: 'grass', spawns: 6, wild: [w('kernip', 3, 6), w('snipsy', 3, 6), w('hummet', 4, 6, 6), w('burrowby', 3, 6)] },
  { id: 'saltwhistle', name: 'Saltwhistle', chapter: 2, terrain: 'none', spawns: 0, wild: [] },
  { id: 'sandy-shore', name: 'Sandy Shore', chapter: 2, terrain: 'sand', spawns: 6, ensure: ['lullakin'], wild: [w('lullakin', 6, 9), w('dewpud', 6, 9), w('hummet', 6, 8, 5), w('kernip', 6, 8, 5)] },
  { id: 'lighthouse-trial', name: 'Lighthouse Trial', chapter: 2, terrain: 'none', spawns: 0, wild: [] },
  { id: 'cliff-road', name: 'Cliff Road', chapter: 3, terrain: 'grass', spawns: 7, ensure: ['snipsy'], wild: [w('spinnet', 9, 12), w('druzling', 9, 12), w('zestle', 9, 12, 8), w('snipsy', 9, 11, 6), w('burrowby', 10, 12, 5), w('dewpud', 10, 12, 4)] },
  { id: 'mossgrove', name: 'Mossgrove', chapter: 4, terrain: 'none', spawns: 0, wild: [] },
  { id: 'mossgrove-woods', name: 'Mossgrove Woods', chapter: 4, terrain: 'grass', spawns: 7, ensure: ['gleamgrub'], wild: [w('fiddlit', 12, 15), w('snipsy', 12, 15, 6), w('buzzbill', 12, 15), w('gleamgrub', 13, 15, 6), w('lullakin', 12, 14, 4)] },
  { id: 'canopy-trial', name: 'Canopy Trial', chapter: 4, terrain: 'none', spawns: 0, wild: [] },
  { id: 'whisper-woods', name: 'Whisper Woods', chapter: 5, terrain: 'grass', spawns: 7, wild: [w('fiddlit', 15, 17, 6), w('frondle', 17, 19, 4), w('poplet', 16, 18, 6), w('leafhauler', 16, 19, 6), w('hummet', 15, 17, 4), w('zestle', 15, 18, 5)] },
  { id: 'glimmer-cave', name: 'Glimmer Cave', chapter: 5, terrain: 'cave', spawns: 6, ensure: ['gleamgrub'], wild: [w('gleamgrub', 15, 18), w('glintle', 15, 18), w('druzette', 16, 19, 6), w('dewpud', 15, 18, 4)] },
  { id: 'cragtop', name: 'Cragtop', chapter: 6, terrain: 'none', spawns: 0, wild: [] },
  { id: 'cragtop-slopes', name: 'Cragtop Slopes', chapter: 6, terrain: 'grass', spawns: 7, ensure: ['burrowbat', 'zipbill'], wild: [w('burrowbat', 18, 22), w('druzette', 18, 22), w('hailbit', 19, 21, 5), w('zipbill', 19, 22, 6), w('twirlwing', 18, 21, 5)] },
  { id: 'old-mine-trial', name: 'Old Mine Trial', chapter: 6, terrain: 'none', spawns: 0, wild: [] },
  { id: 'canyon-trail', name: 'Canyon Trail', chapter: 7, terrain: 'sand', spawns: 7, wild: [w('zestwick', 22, 26, 6), w('zestle', 21, 23, 4), w('whirrbird', 22, 26), w('burrowbat', 23, 26), w('glintle', 21, 23, 4), w('prismble', 23, 26, 5)] },
  { id: 'dunehollow', name: 'Dunehollow', chapter: 8, terrain: 'none', spawns: 0, wild: [] },
  { id: 'dune-flats', name: 'Dune Flats', chapter: 8, terrain: 'sand', spawns: 7, wild: [w('poplet', 25, 28), w('zestwick', 25, 28), w('prismble', 25, 28), w('whirrbird', 25, 28), w('leafhauler', 25, 28, 5)] },
  { id: 'sunstone-trial', name: 'Redrock Trial', chapter: 8, terrain: 'none', spawns: 0, wild: [] },
  { id: 'frost-pass', name: 'Frost Pass', chapter: 9, terrain: 'snow', spawns: 7, ensure: ['bathlet'], wild: [w('hailbit', 28, 31), w('hailroll', 30, 32, 5), w('scarfcub', 28, 31), w('bathlet', 28, 31), w('mossbub', 28, 32, 6)] },
  { id: 'frostfall', name: 'Frostfall', chapter: 10, terrain: 'none', spawns: 0, wild: [] },
  { id: 'frostfall-slopes', name: 'Frostfall Slopes', chapter: 10, terrain: 'snow', spawns: 7, ensure: ['hailroll'], wild: [w('hailroll', 31, 34), w('scarfpaw', 31, 34), w('steambly', 31, 34), w('mossbub', 31, 34, 6), w('scarfcub', 30, 32, 4)] },
  { id: 'summit-trial', name: 'Summit Trial', chapter: 10, terrain: 'none', spawns: 0, wild: [] },
  { id: 'updraft-ridge', name: 'Updraft Ridge', chapter: 11, terrain: 'sky', spawns: 7, ensure: ['twirlwing'], wild: [w('twirlwing', 34, 36, 6), w('maplegale', 35, 37, 4), w('galehum', 34, 37), w('silklight', 34, 37), w('prismble', 34, 36, 6)] },
  { id: 'sky-island', name: 'Sky Island', chapter: 12, terrain: 'sky', spawns: 8, wild: [w('maplegale', 37, 40), w('galehum', 37, 40), w('starwisp', 37, 40), w('fluorelle', 37, 40), w('citrivolt', 37, 40)] },
  { id: 'beacon-spire', name: 'Beacon Spire', chapter: 12, terrain: 'none', spawns: 0, wild: [] },
  // Post-game wilds: the third stages, so collectors can also meet them in the wild.
  { id: 'starlit-meadow', name: 'Starlit Meadow', chapter: 14, terrain: 'grass', spawns: 8, wild: [w('fluffkorn', 42, 46), w('canopant', 42, 46), w('bouldwom', 42, 46), w('fernadore', 42, 46), w('voltabill', 42, 46), w('druzarch', 42, 46)] },
  { id: 'deep-blue-cove', name: 'Deep Blue Cove', chapter: 14, terrain: 'water', spawns: 8, wild: [w('grandatee', 42, 46), w('hardigrade', 42, 46), w('thermabara', 42, 46), w('hailcastle', 42, 46), w('scarfspire', 42, 46)] },
];

export const AREA_BY_ID: Record<string, AreaDef> = Object.fromEntries(AREAS.map(a => [a.id, a]));
