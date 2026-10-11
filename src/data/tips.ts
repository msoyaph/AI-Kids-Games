/** First-time tips: one short sentence each, shown once per save (skippable, can be turned off). */
export interface TipDef {
  id: string;
  icon: string;
  /** Words for touch screens and for keyboard players. */
  touch: string;
  keys: string;
}

export const TIPS: Record<string, TipDef> = {
  flight_steer: { id: 'flight_steer', icon: 'rocket', touch: 'Drag on the left side to steer your rocket!', keys: 'Use the arrow keys or W A S D to steer!' },
  flight_boost: { id: 'flight_boost', icon: 'boost', touch: 'Tap Boost to zoom! It uses extra fuel.', keys: 'Press Space to boost! It uses extra fuel.' },
  flight_fuel: { id: 'flight_fuel', icon: 'fuel', touch: 'Fuel is getting low. Grab green fuel cells!', keys: 'Fuel is getting low. Grab green fuel cells!' },
  flight_land: { id: 'flight_land', icon: 'land', touch: 'You are close! Tap Land to land here.', keys: 'You are close! Press E to land here.' },
  flight_scan: { id: 'flight_scan', icon: 'scan', touch: 'Hold the Scan button to scan it!', keys: 'Hold E to scan it!' },
  flight_bump: { id: 'flight_bump', icon: 'shield', touch: 'Bonk! Rocks take a little shield. Fly around them!', keys: 'Bonk! Rocks take a little shield. Fly around them!' },
  flight_comet: { id: 'flight_comet', icon: 'sparkle', touch: 'Fly inside a comet tail for a speed boost!', keys: 'Fly inside a comet tail for a speed boost!' },
  landing: { id: 'landing', icon: 'land', touch: 'Hold Thrust to slow down. Land on the glowing pad!', keys: 'Hold Space or Up to slow down. Land on the glowing pad!' },
  explore_move: { id: 'explore_move', icon: 'jump', touch: 'Drag left or right to walk. Tap Jump to jump!', keys: 'Arrow keys to walk. Space to jump!' },
  explore_hover: { id: 'explore_hover', icon: 'boost', touch: 'Hold Jump in the air to use your jetpack!', keys: 'Hold Space in the air to use your jetpack!' },
  explore_orb: { id: 'explore_orb', icon: 'hand', touch: 'Tap Grab to pick up a power orb. Bring it to the machine!', keys: 'Press E to pick up a power orb. Bring it to the machine!' },
  explore_crate: { id: 'explore_crate', icon: 'box', touch: 'Walk into a crate to push it.', keys: 'Walk into a crate to push it.' },
  explore_crystal: { id: 'explore_crystal', icon: 'sparkle', touch: 'Tap a crystal to change its color.', keys: 'Press E next to a crystal to change its color.' },
  explore_rover: { id: 'explore_rover', icon: 'rover', touch: 'You are driving a robot rover! It can hop, but it can\'t fly.', keys: 'You are driving a robot rover! It can hop, but it can\'t fly.' },
  map: { id: 'map', icon: 'map', touch: 'Tap a planet, then tap Fly there!', keys: 'Use the arrow keys to pick a planet, then press E!' },
  race: { id: 'race', icon: 'trophy', touch: 'Fly through the rings in order. The clock starts at the first ring!', keys: 'Fly through the rings in order. The clock starts at the first ring!' },
  zibbo: { id: 'zibbo', icon: 'alien', touch: 'Zibbo is your buddy now. Zibbo follows you everywhere!', keys: 'Zibbo is your buddy now. Zibbo follows you everywhere!' },
};
