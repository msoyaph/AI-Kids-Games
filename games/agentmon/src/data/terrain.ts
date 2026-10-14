/**
 * Map terrain: one character per 16×16 tile in a map's ASCII rows. What each terrain is, whether
 * you can walk on it, which field ability it needs, and where wild Agentmon roam.
 * Objects that stand on terrain (trees, houses, signs, puzzle pieces) are listed separately.
 */

export type Ter =
  | 'grass' | 'tall' | 'flowers' | 'path' | 'plaza' | 'sand' | 'water' | 'shallow' | 'ice' | 'snow'
  | 'cave' | 'dark' | 'bridge' | 'floor' | 'cloud' | 'void' | 'cliff' | 'wall' | 'rug' | 'stairs';

export interface TerInfo {
  ch: string;
  walk: boolean;
  /** Needs this field ability to walk on (paddle for water, light for dark caves). */
  needs?: 'paddle' | 'light';
  /** Wild Agentmon of this kind of terrain roam here. */
  wild?: 'grass' | 'water' | 'cave' | 'snow' | 'sand' | 'sky';
  /** Sliding (ice). */
  slide?: boolean;
  /** Edge-blending order: higher terrain spills softly over lower neighbours. */
  layer: number;
}

export const TER: Record<Ter, TerInfo> = {
  void: { ch: ' ', walk: false, layer: 0 },
  water: { ch: '~', walk: true, needs: 'paddle', wild: 'water', layer: 1 },
  shallow: { ch: '-', walk: true, layer: 2 },
  sand: { ch: 's', walk: true, wild: 'sand', layer: 3 },
  snow: { ch: '*', walk: true, wild: 'snow', layer: 4 },
  ice: { ch: 'i', walk: true, slide: true, layer: 5 },
  grass: { ch: '.', walk: true, layer: 6 },
  flowers: { ch: '"', walk: true, layer: 6 },
  tall: { ch: ',', walk: true, wild: 'grass', layer: 6 },
  path: { ch: ':', walk: true, layer: 7 },
  plaza: { ch: '=', walk: true, layer: 8 },
  cave: { ch: 'c', walk: true, wild: 'cave', layer: 3 },
  dark: { ch: 'd', walk: true, needs: 'light', wild: 'cave', layer: 2 },
  cloud: { ch: 'k', walk: true, wild: 'sky', layer: 4 },
  bridge: { ch: 'b', walk: true, layer: 9 },
  floor: { ch: 'f', walk: true, layer: 9 },
  rug: { ch: 'r', walk: true, layer: 10 },
  stairs: { ch: '^', walk: true, layer: 10 },
  cliff: { ch: '#', walk: false, layer: 11 },
  wall: { ch: 'W', walk: false, layer: 12 },
};

export const TER_BY_CHAR: Record<string, Ter> = Object.fromEntries(Object.entries(TER).map(([k, v]) => [v.ch, k as Ter]));
