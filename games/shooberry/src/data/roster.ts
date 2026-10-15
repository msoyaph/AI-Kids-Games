// Roster v2: the 24 plants and 20 critters, with their roles and the world that brings them in.
// Every name and role here went through the originality check in CLAUDE.md (IP log), and
// tests/unit/names.test.ts lints every name. Balance numbers live in tuning.ts, never here.

export type WorldId = 'meadow' | 'greenhouse' | 'dusk' | 'desert' | 'cloud';

export interface World {
  id: WorldId;
  name: string;
  /** The one new idea this world adds. */
  twist: string;
}

export const WORLDS: readonly World[] = [
  { id: 'meadow',name: 'Meadow Picnic',twist: 'Garden Friends: some plants help their real-life companions.' },
  { id: 'greenhouse',name: 'Glass Greenhouse',twist: 'Sprinkler tiles boost a plant, and channels hold water plants.' },
  { id: 'dusk',name: 'Pumpkin Patch at Dusk',twist: 'Dusk bloomers open, and lanterns you hang draw moths and owls in close.' },
  { id: 'desert',name: 'Cactus Garden',twist: 'Hot tiles dry plants out unless they sit beside a channel.' },
  { id: 'cloud',name: 'Cloud Garden',twist: 'Gaps you can\'t plant on, and updrafts that lift flyers.' },
];

export type PlantRole = 'producer' | 'shooter' | 'lobber' | 'blocker' | 'slower' | 'area' | 'support' | 'lane' | 'dusk' | 'water' | 'air';

export interface PlantInfo {
  id: string;
  /** The invented name players see. */
  name: string;
  /** The real plant that inspired it (the Seed Book page is about this plant). */
  species: string;
  role: PlantRole;
  world: WorldId;
  /** The short "what it does" line on its card. */
  does: string;
}

export const PLANTS: readonly PlantInfo[] = [
  // Meadow Picnic
  { id: 'comfrey',name: 'Comfrey Crumble',species: 'Comfrey',role: 'producer',world: 'meadow',does: 'Makes compost from its big leaves.' },
  { id: 'rowan',name: 'Rowan Flicker',species: 'Rowan (mountain ash)',role: 'shooter',world: 'meadow',does: 'Flicks red berries down its lane.' },
  { id: 'boxwood',name: 'Boxwood Block',species: 'Boxwood topiary',role: 'blocker',world: 'meadow',does: 'A sturdy clipped hedge that critters must nibble through.' },
  { id: 'lambs-ear',name: 'Snuggly Lamb\'s Ear',species: 'Lamb\'s ear',role: 'slower',world: 'meadow',does: 'So soft that critters slow down to snuggle it.' },
  { id: 'maple',name: 'Maple Twirler',species: 'Maple',role: 'lobber',world: 'meadow',does: 'Spins winged seeds over shields and onto flyers.' },
  { id: 'basil',name: 'Basil Buddy',species: 'Sweet basil',role: 'support',world: 'meadow',does: 'Helps the plants next to it work faster.' },
  { id: 'lavender',name: 'Lavender Shoo',species: 'Lavender',role: 'lane',world: 'meadow',does: 'Its strong scent makes the front critter back away.' },
  // Glass Greenhouse
  { id: 'arrowhead',name: 'Arrowhead Skimmer',species: 'Arrowhead (Sagittaria)',role: 'water',world: 'greenhouse',does: 'Grows in channels and skims leaf darts along its lane.' },
  { id: 'pickerelweed',name: 'Pickerelweed Splash',species: 'Pickerelweed',role: 'water',world: 'greenhouse',does: 'Grows in channels and splashes critters to slow them.' },
  { id: 'wisteria',name: 'Wisteria Popper',species: 'Wisteria',role: 'shooter',world: 'greenhouse',does: 'Twisty seed pods pop through a whole line of critters.' },
  { id: 'yarrow',name: 'Yarrow Brew',species: 'Yarrow',role: 'producer',world: 'greenhouse',does: 'Makes compost, and more when it has neighbors.' },
  { id: 'touch-me-not',name: 'Touch-me-not Jiggler',species: 'Touch-me-not (jewelweed)',role: 'area',world: 'greenhouse',does: 'Ripe pods jiggle and scatter seeds all around it.' },
  // Pumpkin Patch at Dusk
  { id: 'primrose',name: 'Twilight Primrose',species: 'Evening primrose',role: 'dusk',world: 'dusk',does: 'Opens at dusk and sends glowing seed darts.' },
  { id: 'four-oclock',name: 'Teatime Four-o\'clock',species: 'Four o\'clock flower',role: 'dusk',world: 'dusk',does: 'Opens at teatime; its sweet scent makes critters yawn and slow.' },
  { id: 'hop-vine',name: 'Hop Vine Twister',species: 'Hops',role: 'slower',world: 'dusk',does: 'Twining vines tangle critters\' feet for a moment.' },
  { id: 'allium',name: 'Allium Pom',species: 'Ornamental allium',role: 'area',world: 'dusk',does: 'Leaves a ticklish pollen cloud on its lane.' },
  { id: 'nasturtium',name: 'Nasturtium Lure',species: 'Nasturtium',role: 'lane',world: 'dusk',does: 'So tasty-looking it calls critters over from the next lanes.' },
  // Cactus Garden
  { id: 'agave',name: 'Agave Anchor',species: 'Agave',role: 'blocker',world: 'desert',does: 'A tough blocker that never dries out on hot tiles.' },
  { id: 'hollyhock',name: 'Hollyhock Tosser',species: 'Hollyhock',role: 'lobber',world: 'desert',does: 'Tosses flat seed discs in a high arc.' },
  { id: 'chamomile',name: 'Chamomile Cheer',species: 'Chamomile',role: 'support',world: 'desert',does: 'Plant cards get ready again sooner.' },
  { id: 'milkweed',name: 'Silky Milkweed',species: 'Common milkweed',role: 'shooter',world: 'desert',does: 'Shoots quick tufts of silky floss.' },
  // Cloud Garden
  { id: 'bluebell',name: 'Bluebell Chime',species: 'Bluebell',role: 'air',world: 'cloud',does: 'Rings to shoo flyers, high up.' },
  { id: 'borage',name: 'Borage Buzz',species: 'Borage',role: 'support',world: 'cloud',does: 'Its bees make Garden Friends bonuses bigger.' },
  { id: 'pampas',name: 'Pampas Plume',species: 'Pampas grass',role: 'blocker',world: 'cloud',does: 'Critters get stuck in its fluffy plumes.' },
];

export type InvaderMechanic = 'walker' | 'quick' | 'swarm' | 'armored' | 'flyer' | 'shield' | 'jumper' | 'lob-blocker' | 'digger' | 'nibbler' | 'swapper' | 'floater';

export interface InvaderInfo {
  id: string;
  name: string;
  /** The real animal it's based on. */
  animal: string;
  mechanic: InvaderMechanic;
  /** A second trick, when it has one. */
  also?: InvaderMechanic;
  world: WorldId;
  /** How to handle it (the Invader Book's tip). */
  tip: string;
}

export const INVADERS: readonly InvaderInfo[] = [
  // Meadow Picnic
  { id: 'snail',name: 'Snack Snail',animal: 'Garden snail',mechanic: 'walker',world: 'meadow',tip: 'Slow and steady. Any plant can shoo it.' },
  { id: 'mouse',name: 'Field Mouse',animal: 'Field mouse',mechanic: 'quick',world: 'meadow',tip: 'Quick! Slow it down with soft or sticky plants.' },
  { id: 'ants',name: 'Ant Column',animal: 'Ants',mechanic: 'swarm',world: 'meadow',tip: 'A line of tiny ants. Area plants shoo lots at once.' },
  { id: 'roly-poly',name: 'Roly-poly',animal: 'Pill bug',mechanic: 'armored',world: 'meadow',tip: 'Curls into its shell when hit. Keep the pressure on.' },
  { id: 'magpie',name: 'Magpie',animal: 'Magpie',mechanic: 'flyer',also: 'swapper',world: 'meadow',tip: 'Borrows a plant and drops it farther down. Replant it, or reach it with lobbers.' },
  // Glass Greenhouse
  { id: 'beetle',name: 'Leaf-shield Beetle',animal: 'Stag beetle',mechanic: 'shield',world: 'greenhouse',tip: 'Holds a leaf in front. Lob over it or pop through it.' },
  { id: 'grasshopper',name: 'Grasshopper',animal: 'Grasshopper',mechanic: 'jumper',world: 'greenhouse',tip: 'Hops in bursts, right over plants. Tangle or soften its landing.' },
  { id: 'frog',name: 'Umbrella Frog',animal: 'Tree frog',mechanic: 'lob-blocker',world: 'greenhouse',tip: 'Its leaf umbrella stops lobs. Shoot it straight on.' },
  { id: 'vole',name: 'Vole',animal: 'Vole',mechanic: 'digger',world: 'greenhouse',tip: 'A molehill shows where it will pop up. Be ready there.' },
  // Pumpkin Patch at Dusk
  { id: 'hedgehog',name: 'Hedgehog',animal: 'Hedgehog',mechanic: 'armored',world: 'dusk',tip: 'Its spines stop straight shots from the front. Lobs work.' },
  { id: 'moths',name: 'Moth Flutter',animal: 'Moths',mechanic: 'swarm',also: 'flyer',world: 'dusk',tip: 'Moths fly to lanterns. Use that to lead them.' },
  { id: 'badger',name: 'Badger',animal: 'Badger',mechanic: 'shield',world: 'dusk',tip: 'Carries a big tin lid. Wear it down, or go over it.' },
  { id: 'owlet',name: 'Owlet',animal: 'Little owl',mechanic: 'flyer',world: 'dusk',tip: 'Swoops low past lanterns, where lobbers can reach it.' },
  // Cactus Garden
  { id: 'gecko',name: 'Desert Gecko',animal: 'Gecko',mechanic: 'quick',world: 'desert',tip: 'Extra quick on hot tiles. Keep channels nearby.' },
  { id: 'goat',name: 'Nibble Goat',animal: 'Young goat',mechanic: 'nibbler',world: 'desert',tip: 'Nibbles plants fast. Stop it before it reaches them.' },
  { id: 'jackrabbit',name: 'Jackrabbit',animal: 'Jackrabbit',mechanic: 'jumper',world: 'desert',tip: 'Makes two big hops. Put blockers past where it lands.' },
  { id: 'packrat',name: 'Packrat',animal: 'Desert woodrat',mechanic: 'swapper',world: 'desert',tip: 'Trades a plant for a pebble. Tap the pebble to clear it.' },
  // Cloud Garden
  { id: 'seagull',name: 'Seagull',animal: 'Gull',mechanic: 'flyer',world: 'cloud',tip: 'Dives for a snack. Bluebells and lobbers shoo it.' },
  { id: 'kite-crow',name: 'Kite Crow',animal: 'Crow',mechanic: 'flyer',also: 'floater',world: 'cloud',tip: 'Rides updrafts on its kite. Watch the wind.' },
  { id: 'sheep',name: 'Cloud Sheep',animal: 'Lamb',mechanic: 'floater',world: 'cloud',tip: 'Floats over gaps. Big and soft, so it takes a while.' },
];
