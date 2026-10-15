// The Invader Book: each critter's silly profile (how to handle it is the tip in roster.ts), and
// the bosses' names and profiles. Critters are snack-lovers, never villains: they poof and run home.
import { INVADERS } from './roster';

export const PROFILES: Record<string, string> = {
  snail: 'Has never once been in a hurry. Can smell a cracker from three gardens away.',
  mouse: 'Small, speedy and always peeking at the cheese sandwiches.',
  ants: 'They march in a neat line and share everything, even one snack between three.',
  'roly-poly': 'Curls into a ball when it gets a fright, then carries on as if nothing happened.',
  magpie: 'Loves shiny things and borrowing plants. Always gives them back... a little further along.',
  beetle: 'Carries a big leaf everywhere, just in case it rains (or someone throws berries).',
  grasshopper: 'Hop, hop, hop! Thinks plants are just things to jump over.',
  frog: 'Brings its own leaf umbrella, so nothing that falls from above can bother it.',
  vole: 'Digs tunnels under the garden and pops up where you least expect it.',
  hedgehog: 'Very prickly on the outside, very fond of picnics on the inside.',
  moths: 'They follow the lantern light, fluttering low over the garden at dusk.',
  badger: 'Carries a round cake-tin lid like a shield. Hopes there is still cake in the tin.',
  owlet: 'Stays up late. Swoops down low when it spots a lantern.',
  gecko: 'Loves warm tiles. The hotter the ground, the faster its little feet go.',
  goat: 'Will try a nibble of absolutely anything. Especially your plants.',
  jackrabbit: 'Two great big hops and it is halfway across the garden.',
  packrat: 'Likes to swap things. It will trade your plant for a nice shiny pebble.',
  seagull: 'Spots a picnic from the sky and dives straight for one snack.',
  'kite-crow': 'Flies its kite on the breeze and rides the updrafts over the clouds.',
  sheep: 'So fluffy it floats right over the gaps in the Cloud Garden.',
};

export interface BossInfo { id: string; name: string; world: string; profile: string; tip: string }

export const BOSS_BOOK: BossInfo[] = [
  { id: 'grand-snail', name: 'The Grand Snail', world: 'meadow', profile: 'The biggest, slowest snail in the meadow, with ants who come when it calls.', tip: 'Lots of shooters in its lane, and something for the ants it calls.' },
  { id: 'big-beetle', name: 'The Big Beetle', world: 'greenhouse', profile: 'Hides behind an enormous leaf and sometimes charges forward.', tip: 'Lob over the leaf, or pierce right through it.' },
  { id: 'badger-baron', name: 'The Badger Baron', world: 'dusk', profile: 'A very grand badger in a bow tie. Digs over to a new lane now and then.', tip: 'Keep shooters ready in more than one lane.' },
  { id: 'billy-goat', name: 'Billy the Goat', world: 'desert', profile: 'Nibbles fast and butts plants back a tile when it is in a hurry.', tip: 'Tough blockers buy time while your shooters work.' },
  { id: 'captain-gull', name: 'Captain Gull', world: 'cloud', profile: 'The captain of the seagulls, diving fast for the picnic.', tip: 'Bluebells and lobbers reach it up in the air.' },
  { id: 'parade-float', name: 'The Snack Parade Float', world: 'cloud', profile: 'Every critter in the land, riding a giant float with a cake on top!', tip: 'It is slow but very tough, and it drops critters off as it goes. Fill its lane with shooters.' },
];

export const tipOf = (id: string) => INVADERS.find(i => i.id === id)?.tip ?? BOSS_BOOK.find(b => b.id === id)?.tip ?? '';
export const nameOf = (id: string) => INVADERS.find(i => i.id === id)?.name ?? BOSS_BOOK.find(b => b.id === id)?.name ?? id;
