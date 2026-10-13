/**
 * Accessories (1.1): twelve things a friend can wear, every one earned by playing (never bought).
 * Each is earned by a milestone the save already keeps (a Beacon, a quest, a rematch, the Field
 * Guide), so a 1.0 adventure gets the ones it has earned the moment it loads, and nothing new
 * has to be saved except what each friend wears. `n` is the stable number saved for what a friend
 * wears: never renumber, only add.
 */
export type AccessorySlot = 'head' | 'neck' | 'back';

export interface AccessoryDef {
  n: number;
  id: string;
  name: string;
  slot: AccessorySlot;
  /** How to earn it, in one short line. */
  how: string;
  /** A flag expression, or a Field Guide badge. */
  earned: string | 'guide52' | 'guide77';
}

export const ACCESSORIES: AccessoryDef[] = [
  { n: 1, id: 'sailor-hat', name: 'Sailor Hat', slot: 'head', how: 'Relight the Lighthouse Beacon.', earned: 'beacon-lighthouse' },
  { n: 2, id: 'flower-crown', name: 'Flower Crown', slot: 'head', how: 'Relight the Canopy Beacon.', earned: 'beacon-canopy' },
  { n: 3, id: 'miner-lamp', name: 'Miner Lamp', slot: 'head', how: 'Relight the Old Mine Beacon.', earned: 'beacon-mine' },
  { n: 4, id: 'sun-hat', name: 'Sun Hat', slot: 'head', how: 'Relight the Redrock Beacon.', earned: 'beacon-sunstone' },
  { n: 5, id: 'snow-earmuffs', name: 'Snow Earmuffs', slot: 'head', how: 'Relight the Summit Beacon.', earned: 'beacon-summit' },
  { n: 6, id: 'star-cape', name: 'Star Cape', slot: 'back', how: 'Relight the Beacon on the Spire.', earned: 'beacon-spire' },
  { n: 7, id: 'lantern-cap', name: 'Lantern Cap', slot: 'head', how: 'Help Fen find the Lantern Seeds in Banyan Hollow.', earned: 'sq-lantern-done' },
  { n: 8, id: 'leaf-cape', name: 'Leaf Cape', slot: 'back', how: 'Run the Root Relay in Banyan Hollow.', earned: 'sq-relay-done' },
  { n: 9, id: 'teacup-bow', name: 'Teacup Bow', slot: 'neck', how: 'Have tea with Grandma Mo in Banyan Hollow.', earned: 'sq-tea-done' },
  { n: 10, id: 'agent-goggles', name: 'Agent Goggles', slot: 'head', how: 'Win a rematch against Juno.', earned: 'beat:rematch-juno' },
  { n: 11, id: 'silver-star', name: 'Silver Star', slot: 'neck', how: 'Befriend all of the first 52 Agentmon (the Silver Guide).', earned: 'guide52' },
  { n: 12, id: 'rainbow-scarf', name: 'Rainbow Scarf', slot: 'neck', how: 'Befriend every Agentmon (the Golden Guide).', earned: 'guide77' },
];

export const ACCESSORY_BY_ID: Record<string, AccessoryDef> = Object.fromEntries(ACCESSORIES.map(a => [a.id, a]));
export const ACCESSORY_BY_N: Record<number, AccessoryDef> = Object.fromEntries(ACCESSORIES.map(a => [a.n, a]));

/** Hearts (0–5) from friendship, which only ever goes up; five hearts is a "Best buddy". */
export const heartsOf = (friendship: number) => Math.max(0, Math.min(5, Math.floor(friendship / 50)));
/** The friendship a little care adds (petting, a snack, a favorite snack, a game of Bubble Catch). */
export const CARE = { pet: 3, snack: 8, favorite: 16, play: 10 } as const;
