/**
 * The style frame: one city block of the seaside town, staged in memory for the look review (never
 * saved). Homes in four styles and six paints, a corner café facing the bay, a corner store, a
 * pocket park (fountain, playground, rose arch, flower beds, benches), the library, a bus stop, the
 * seaside promenade and the beach; neighbouring blocks give the street its context. Traffic and
 * citizens come from render/streetlife.ts.
 */
import { FINISH, emptyCity, layRoad, paint, type City, type Rot, type Thing } from '../sim/city';
import { H, W } from '../sim/map';
import type { FramePoint } from '../render/camera';
import { boxPoints } from '../render/camera';

/** The focus block (lots, not roads): x 5–13, z 8–16. */
export const BLOCK = { x0: 5, z0: 8, x1: 13, z1: 16 } as const;

export function styleFrameCity(seed = 7): City {
  const c = emptyCity(seed);
  c.t = 480 * 0.38; // late morning
  // streets: the avenue along the bay, two cross streets, and four running inland
  layRoad(c, 0, 7, W - 1, 7);
  layRoad(c, 0, 17, W - 1, 17);
  layRoad(c, 0, 27, W - 1, 27);
  for (const x of [4, 14, 24, 34]) layRoad(c, x, 7, x, H - 1);
  // the promenade between the avenue and the beach
  paint(c, 0, 6, W - 1, 6, FINISH.paving);
  // yards are mown lawns; the park has a gravel path
  for (const [x0, z0, x1, z1] of [[0, 8, 3, 16], [5, 8, 13, 16], [15, 8, 23, 16], [25, 8, 33, 16], [5, 18, 13, 26], [15, 18, 23, 26], [0, 18, 3, 26]] as const) paint(c, x0, z0, x1, z1, FINISH.lawn);
  // the park's gravel path from Shell Street to the fountain
  paint(c, 11, 13, 11, 13, FINISH.gravel);
  // the library's forecourt and the café's terrace
  paint(c, 8, 16, 11, 16, FINISH.paving);
  paint(c, 12, 16, 13, 16, FINISH.paving);

  const t = (def: string, x: number, z: number, rot: Rot = 0, look = 0): Thing => ({ def, x, z, rot, look });
  c.things.push(
    // the focus block. North row: homes facing the avenue and the bay (their backs to the camera)
    t('cottage', 5, 8, 2, 1), t('bungalow', 7, 8, 2, 0), t('townhouse', 9, 8, 2, 2), t('cottage', 11, 8, 2, 3), t('tree', 13, 9, 0, 0), t('postbox', 13, 8, 0),
    // the west side: homes facing the west street, and one facing Shell Street
    t('cottage', 5, 10, 1, 5), t('bungalow', 5, 12, 1, 4), t('townhouse', 5, 14, 0, 1), t('tree', 7, 11, 0, 2), t('bush', 7, 13, 0), t('blossom', 7, 10, 0, 0),
    // the pocket park in the middle
    t('fountain', 9, 10, 0), t('playground', 11, 10, 0), t('bench', 8, 11, 3), t('bench', 9, 12, 2), t('bench', 10, 12, 2),
    t('tree', 8, 13, 0, 1), t('tree', 13, 12, 0, 3), t('blossom', 8, 10, 0, 1), t('flowerbed', 10, 13, 0, 0), t('arch', 11, 13, 0), t('picnic', 13, 11, 0),
    // the east side: the corner store on the cross street
    t('store', 12, 13, 3, 1),
    // the south row, facing Shell Street and the camera: the library, the corner café, the bus stop
    t('library', 8, 14, 0), t('cafe', 12, 15, 0, 0), t('busstop', 7, 16, 0),
    // the block to the west
    t('cottage', 2, 8, 3, 4), t('townhouse', 2, 10, 3, 0), t('bungalow', 2, 12, 3, 2), t('cottage', 2, 14, 3, 5), t('tree', 0, 9, 0, 1), t('tree', 1, 13, 0, 0), t('bush', 0, 15, 0),
    // the block to the east
    t('apartments', 15, 8, 2, 1), t('cottage', 18, 8, 2, 3), t('bungalow', 20, 8, 2, 1), t('cafe', 22, 8, 2, 2),
    t('cottage', 15, 11, 1, 2), t('townhouse', 15, 13, 1, 3), t('townhouse', 15, 15, 1, 5),
    t('store', 22, 10, 3, 3), t('cottage', 22, 12, 3, 0), t('bungalow', 22, 14, 3, 5),
    t('cottage', 18, 15, 0, 4), t('cottage', 20, 15, 0, 1),
    t('tree', 18, 11, 0, 0), t('tree', 20, 12, 0, 1), t('blossom', 19, 13, 0, 0), t('bush', 18, 13, 0), t('pine', 21, 11, 0), t('picnic', 19, 11, 0),
    // the blocks to the south
    t('cottage', 5, 18, 2, 2), t('bungalow', 7, 18, 2, 3), t('townhouse', 9, 18, 2, 4), t('cottage', 11, 18, 2, 5),
    t('cottage', 15, 18, 2, 0), t('apartments', 17, 18, 2, 2), t('bungalow', 20, 18, 2, 4), t('cottage', 22, 18, 2, 1),
    t('tree', 6, 21, 0, 0), t('tree', 10, 21, 0, 1), t('pine', 12, 22, 0), t('blossom', 8, 22, 0, 0), t('tree', 16, 22, 0, 2), t('tree', 21, 22, 0, 0),
    t('townhouse', 2, 18, 3, 1), t('cottage', 2, 20, 3, 3),
    // the further east block (seen when zoomed out)
    t('apartments', 25, 8, 2, 3), t('apartments', 28, 8, 2, 0), t('cafe', 31, 8, 2, 3), t('cottage', 25, 11, 1, 5), t('tree', 29, 12, 0, 0), t('tree', 31, 13, 0, 1),
    // the promenade: benches facing the bay, lamps
    t('bench', 6, 6, 2), t('bench', 10, 6, 2), t('bench', 18, 6, 2), t('bench', 27, 6, 2), t('lamp', 8, 6), t('lamp', 12, 6), t('lamp', 16, 6), t('lamp', 20, 6), t('lamp', 24, 6), t('lamp', 4, 6),
    t('pine', 1, 6, 0), t('pine', 31, 6, 0), t('bin', 14, 6, 0),
  );
  c.version = 1;
  return c;
}

/** Citizens standing about in the style frame: at the café, the bus stop, the fountain and the playground. */
export const STANDING: readonly [number, number, number][] = [
  [12.55, 16.75, Math.PI * 0.05], [12.95, 16.7, -Math.PI * 0.4],
  [7.3, 16.62, 0], [7.65, 16.6, 0.1],
  [9.55, 12.05, Math.PI], [10.5, 12.1, Math.PI * 1.1],
  [11.6, 12.0, Math.PI * 0.8], [12.6, 11.4, -Math.PI / 2],
  [9.4, 6.6, Math.PI], [9.75, 6.55, Math.PI * 1.05], [17.4, 6.6, Math.PI], [9.9, 16.55, 0],
];

/** A walk round the fountain (the park's path). */
export const PARK_LOOP: [number, number][] = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return [10 + Math.cos(a) * 1.02, 11 + Math.sin(a) * 1.02] as [number, number];
});

/**
 * What the style frame's camera frames: from the beach down to Shell Street, across the strip of the
 * block with the park, the store, the library's and café's fronts (a phone sees this strip; wider
 * screens see the whole block round it).
 */
export function styleFramePoints(): FramePoint[] {
  return [...boxPoints(8, 4.6, 14, BLOCK.z1 + 1.6, 0, 1.2)];
}
