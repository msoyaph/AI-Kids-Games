/**
 * 3D props for the 2.5D exploration levels and the landing scene. 1 unit = 1 level tile, +y up, the
 * camera looks from +z. Origins at the bottom center (unless noted), facing +z. Static parts share
 * cached merged geometry and vertex-colored materials; per-instance state (glows that pulse, crystal
 * colors, waving cloth, canvas textures) is owned by the prop and freed by `disposeObject`.
 */
export type { Prop } from './propKit';
export { makeBoulder, makeCrate, makeFlag, makeGeyserVent, makeItemToken, makeLamp, makePanel, makePlant, makeSample, makeSign } from './propsBasic';
export { makeDeco } from './propsDeco';
export { MachineProp } from './propsMachines';
export { BumblerProp, CoinSet, CrystalProp, DoorProp, GoalProp, JumpPadProp, LandingPadProp, OrbProp, PlateProp, StickerProp } from './propsActive';
