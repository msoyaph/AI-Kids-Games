import type { GlyphId } from '../gfx/art/glyphs';

/** Things you can collect for missions (samples and special items). */
export interface ItemDef {
  id: string;
  name: string;
  plural: string;
  /** Samples look like glowing rocks in this color; special items use a glyph. */
  color: string;
  glyph?: GlyphId;
}

export const ITEMS: ItemDef[] = [
  { id: 'moonrock', name: 'Moon rock', plural: 'Moon rocks', color: '#d6d4dc' },
  { id: 'mercuryrock', name: 'Mercury rock', plural: 'Mercury rocks', color: '#a89f94' },
  { id: 'venusdata', name: 'Weather data', plural: 'Weather data', color: '#ffe066', glyph: 'cloud' },
  { id: 'roverpart', name: 'Rover part', plural: 'Rover parts', color: '#ff9f43', glyph: 'wrench' },
  { id: 'marsrock', name: 'Mars rock', plural: 'Mars rocks', color: '#e0623a' },
  { id: 'marsice', name: 'Mars ice', plural: 'Mars ice', color: '#e6f7ff', glyph: 'snowflake' },
  { id: 'canyonmap', name: 'Map piece', plural: 'Map pieces', color: '#fff6e0', glyph: 'map' },
  { id: 'cereschip', name: 'Signal chip', plural: 'Signal chips', color: '#4dd4ff', glyph: 'bolt' },
  { id: 'europaice', name: 'Europa ice', plural: 'Europa ice', color: '#bff6ff', glyph: 'snowflake' },
  { id: 'podpart', name: 'Pod part', plural: 'Pod parts', color: '#2de0c7', glyph: 'wrench' },
  { id: 'ganymederock', name: 'Ganymede rock', plural: 'Ganymede rocks', color: '#b5ab9e' },
  { id: 'clue', name: 'Clue crystal', plural: 'Clue crystals', color: '#c89bff', glyph: 'crystal' },
  { id: 'titandrop', name: 'Titan lake drop', plural: 'Titan lake drops', color: '#ff9f43', glyph: 'drop' },
  { id: 'tritonsnow', name: 'Triton snow', plural: 'Triton snow', color: '#f6e6e2', glyph: 'snowflake' },
  { id: 'plutoice', name: 'Pluto ice', plural: 'Pluto ice', color: '#fff3e6', glyph: 'heart' },
  { id: 'spark', name: 'Beacon spark', plural: 'Beacon sparks', color: '#ffe066', glyph: 'star' },
  { id: 'glowberry', name: 'Glow-berry', plural: 'Glow-berries', color: '#ff7ad9', glyph: 'flower' },
  { id: 'ice', name: 'Ring ice', plural: 'Ring ice', color: '#bff6ff', glyph: 'snowflake' },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function itemName(id: string, count = 1): string {
  const it = ITEM_BY_ID[id];
  if (!it) return id;
  return count === 1 ? it.name : it.plural;
}
