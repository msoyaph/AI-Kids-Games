/** Bakes every code-authored sprite into the atlas at startup. */
import type { Atlas } from '../atlas';
import { bakeBuildings } from './buildings';
import { bakeCrops } from './crops';
import { bakeResourceIcons } from './items';
import { bakePlaceables } from './placeables';
import { bakeEmotes } from './emotes';
import { bakeAnimals } from './animals';
import { bakeMine } from './mine';
import { bakeFish } from './fish';
import { bakeCrafted } from './crafted';
import { VILLAGERS } from '../../data/villagers';
import { drawCharacter, FRAMES, shadowSprite, type Look } from './characters';
import { bakeObjects } from './objects';
import { bakeProps } from './props';
import { bakeTerrain } from './terrain';

export function bakeAll(atlas: Atlas): void {
  bakeTerrain(atlas);
  bakeProps(atlas);
  bakeBuildings(atlas);
  bakeObjects(atlas);
  bakeCrops(atlas);
  bakeResourceIcons(atlas);
  bakePlaceables(atlas);
  bakeEmotes(atlas);
  bakeAnimals(atlas);
  bakeMine(atlas);
  bakeFish(atlas);
  bakeCrafted(atlas);
  for (const v of VILLAGERS) bakeCharacter(atlas, v.id, v.look as Look);
  atlas.add('shadow', shadowSprite(12));
  atlas.add('shadow.big', shadowSprite(16));
}

/** Character frames: ch.{id}.{dir}.{frame} */
export function bakeCharacter(atlas: Atlas, id: string, look: Look): void {
  for (let d = 0; d < 4; d++) for (let f = 0; f < FRAMES; f++) atlas.add(`ch.${id}.${d}.${f}`, drawCharacter(look, d, f));
}
