import type { GlyphId } from '../gfx/art/glyphs';

/**
 * Exploration levels are ASCII maps. Fixed symbols:
 *
 *   .  empty            #  ground          %  rock / metal (solid, alt look)
 *   =  thin platform    I  ice (slippery)  ~  bouncy goo / lake (not solid, springy)
 *   ^  jump pad         !  geyser          $  star-coin (one time)
 *   *  hidden sticker   P  your rocket (start + exit)
 *   B  push block       O  power orb (carry it to a machine)
 *   X  bumbler (a friendly critter that bounces you back)
 *   T  plant / tree     R  boulder         L  lamp          F  flag      (decorations)
 *
 * Lowercase letters a-z are defined per level in `ents` (NPCs, samples, doors, plates...).
 * A door letter repeated straight down makes one tall door.
 * The bottom row must be solid (no bottomless pits).
 */

/** Show an entity only when this is true (missions and story flags). */
export interface Cond {
  /** The mission must be active and on this objective (or later with minStep). */
  mission?: string;
  step?: number;
  minStep?: number;
  /** The mission must be finished / not finished. */
  done?: string;
  notDone?: string;
  flag?: string;
  notFlag?: string;
}

export type MachineArt = 'machine' | 'rover' | 'pod' | 'beacon' | 'weather' | 'antenna' | 'heater' | 'drill' | 'lift';

export type DecoArt =
  | 'dish' | 'antenna' | 'tent' | 'dome' | 'crate' | 'pipe' | 'crater' | 'crystals' | 'mushroom' | 'house'
  | 'flagpole' | 'statue' | 'lamp' | 'icicle' | 'vent' | 'station' | 'window' | 'bench' | 'cloud' | 'roverOld' | 'podCrashed';

export type EntDef =
  | { kind: 'npc'; char: string; talk: string; when?: Cond; face?: 1 | -1 }
  | { kind: 'sample'; item: string; when?: Cond }
  | { kind: 'item'; item: string; name: string; glyph: GlyphId; color?: string; when?: Cond }
  | { kind: 'door'; id: string; open: string[]; when?: Cond }
  | { kind: 'plate'; id: string; heavy?: boolean }
  | { kind: 'machine'; id: string; needs: number; puzzle: string; art: MachineArt; name: string; when?: Cond }
  | { kind: 'crystal'; group: string; start?: number }
  | { kind: 'panel'; group: string }
  | { kind: 'goal'; marker: string; when?: Cond }
  | { kind: 'sign'; text: string }
  | { kind: 'deco'; art: DecoArt; when?: Cond };

export interface CrystalGroup {
  /** Target color index per crystal, left to right (0 red, 1 yellow, 2 blue). */
  target: number[];
  puzzle: string;
}

export interface LevelDef {
  id: string;
  name: string;
  body: string;
  theme: string;
  avatar?: 'astronaut' | 'rover';
  map: string[];
  ents?: Record<string, EntDef>;
  groups?: Record<string, CrystalGroup>;
  /** Dialogue shown the first time you visit. */
  intro?: string;
  /** Only open when this is true (areas on worlds with several areas). */
  unlock?: Cond;
  /** Music track key. */
  music?: string;
}

export const CRYSTAL_COLORS = ['#ff5d73', '#ffe066', '#4dd4ff'];
export const CRYSTAL_NAMES = ['red', 'yellow', 'blue'];
