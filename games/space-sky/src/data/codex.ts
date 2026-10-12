import type { GlyphId } from '../gfx/art/glyphs';

/**
 * The Space Codex: an encyclopedia that fills in as you explore.
 * Real things get facts from facts.ts. Made-up story things are marked `real: false`
 * and the Codex shows them with a "Story" tag so kids know they are pretend.
 */
export type CodexCategory = 'star' | 'planet' | 'dwarf' | 'moon' | 'space' | 'tech' | 'story';

export interface CodexEntry {
  id: string;
  name: string;
  category: CodexCategory;
  real: boolean;
  /** Planet picture (body id), a glyph, or a character portrait. */
  picture: { body: string } | { glyph: GlyphId; color?: string } | { char: string };
  /** One short sentence shown under the name. */
  blurb: string;
  /** How to find it (shown for locked entries). */
  hint: string;
}

export const CATEGORY_NAMES: Record<CodexCategory, string> = {
  star: 'Stars',
  planet: 'Planets',
  dwarf: 'Dwarf planets',
  moon: 'Moons',
  space: 'Space things',
  tech: 'Space machines',
  story: 'Story friends',
};

const E = (e: CodexEntry) => e;

export const CODEX: CodexEntry[] = [
  E({ id: 'sun', name: 'The Sun', category: 'star', real: true, picture: { body: 'sun' }, blurb: 'Our very own star.', hint: 'Visit Mercury, close to the Sun.' }),
  E({ id: 'star', name: 'Stars', category: 'star', real: true, picture: { glyph: 'star' }, blurb: 'Giant balls of glowing gas.', hint: 'Look up! Fly your first flight.' }),
  E({ id: 'galaxy', name: 'The Milky Way', category: 'star', real: true, picture: { glyph: 'swirl', color: '#c9b8ff' }, blurb: 'Our home galaxy.', hint: 'Explore far away.' }),
  E({ id: 'scale', name: 'Space Is Huge!', category: 'space', real: true, picture: { glyph: 'telescope', color: '#4dd4ff' }, blurb: 'Real space is much, much bigger than in our game.', hint: 'Fly your rocket.' }),
  E({ id: 'mercury', name: 'Mercury', category: 'planet', real: true, picture: { body: 'mercury' }, blurb: 'The closest planet to the Sun.', hint: 'Fly to Mercury.' }),
  E({ id: 'venus', name: 'Venus', category: 'planet', real: true, picture: { body: 'venus' }, blurb: 'The hottest planet, wrapped in thick clouds.', hint: 'Fly to Venus.' }),
  E({ id: 'earth', name: 'Earth', category: 'planet', real: true, picture: { body: 'earth' }, blurb: 'Our home planet.', hint: 'Fly near Earth.' }),
  E({ id: 'mars', name: 'Mars', category: 'planet', real: true, picture: { body: 'mars' }, blurb: 'The red planet.', hint: 'Fly to Mars.' }),
  E({ id: 'jupiter', name: 'Jupiter', category: 'planet', real: true, picture: { body: 'jupiter' }, blurb: 'The biggest planet.', hint: 'Fly to Jupiter.' }),
  E({ id: 'saturn', name: 'Saturn', category: 'planet', real: true, picture: { body: 'saturn' }, blurb: 'The planet with big, bright rings.', hint: 'Fly to Saturn.' }),
  E({ id: 'uranus', name: 'Uranus', category: 'planet', real: true, picture: { body: 'uranus' }, blurb: 'The planet that spins on its side.', hint: 'Fly to Uranus.' }),
  E({ id: 'neptune', name: 'Neptune', category: 'planet', real: true, picture: { body: 'neptune' }, blurb: 'The windy, faraway blue planet.', hint: 'Fly to Neptune.' }),
  E({ id: 'ceres', name: 'Ceres', category: 'dwarf', real: true, picture: { body: 'ceres' }, blurb: 'The dwarf planet in the asteroid belt.', hint: 'Fly to the asteroid belt.' }),
  E({ id: 'pluto', name: 'Pluto', category: 'dwarf', real: true, picture: { body: 'pluto' }, blurb: 'The dwarf planet with a heart.', hint: 'Fly past Neptune to Pluto.' }),
  E({ id: 'moon', name: 'The Moon', category: 'moon', real: true, picture: { body: 'moon' }, blurb: "Earth's moon.", hint: 'Fly to the Moon.' }),
  E({ id: 'phobos', name: 'Phobos', category: 'moon', real: true, picture: { body: 'phobos' }, blurb: 'The bigger moon of Mars.', hint: 'Scan the moons of Mars.' }),
  E({ id: 'deimos', name: 'Deimos', category: 'moon', real: true, picture: { body: 'deimos' }, blurb: 'The smaller moon of Mars.', hint: 'Scan the moons of Mars.' }),
  E({ id: 'io', name: 'Io', category: 'moon', real: true, picture: { body: 'io' }, blurb: "Jupiter's volcano moon.", hint: 'Scan Io near Jupiter.' }),
  E({ id: 'europa', name: 'Europa', category: 'moon', real: true, picture: { body: 'europa' }, blurb: "Jupiter's icy moon.", hint: 'Visit Europa.' }),
  E({ id: 'ganymede', name: 'Ganymede', category: 'moon', real: true, picture: { body: 'ganymede' }, blurb: 'The biggest moon of all.', hint: 'Visit Ganymede.' }),
  E({ id: 'callisto', name: 'Callisto', category: 'moon', real: true, picture: { body: 'callisto' }, blurb: 'A moon covered in craters.', hint: 'Visit Callisto.' }),
  E({ id: 'titan', name: 'Titan', category: 'moon', real: true, picture: { body: 'titan' }, blurb: "Saturn's hazy orange moon.", hint: 'Visit Titan.' }),
  E({ id: 'enceladus', name: 'Enceladus', category: 'moon', real: true, picture: { body: 'enceladus' }, blurb: 'A small moon with icy fountains.', hint: 'Scan Enceladus near Saturn.' }),
  E({ id: 'miranda', name: 'Miranda', category: 'moon', real: true, picture: { body: 'miranda' }, blurb: 'The moon with a giant cliff.', hint: 'Visit Miranda near Uranus.' }),
  E({ id: 'triton', name: 'Triton', category: 'moon', real: true, picture: { body: 'triton' }, blurb: "Neptune's frosty moon.", hint: 'Visit Triton near Neptune.' }),
  E({ id: 'charon', name: 'Charon', category: 'moon', real: true, picture: { body: 'charon' }, blurb: "Pluto's big moon.", hint: 'Fly to Pluto.' }),
  E({ id: 'belt', name: 'The Asteroid Belt', category: 'space', real: true, picture: { glyph: 'rock' }, blurb: 'A ring of rocks between Mars and Jupiter.', hint: 'Fly into the belt.' }),
  E({ id: 'asteroid', name: 'Asteroids', category: 'space', real: true, picture: { glyph: 'rock', color: '#b39a86' }, blurb: 'Space rocks!', hint: 'Bump into a space rock.' }),
  E({ id: 'vesta', name: 'Vesta', category: 'space', real: true, picture: { body: 'vesta' }, blurb: 'A giant asteroid.', hint: 'Scan Vesta in the belt.' }),
  E({ id: 'comet', name: 'Comets', category: 'space', real: true, picture: { glyph: 'comet' }, blurb: 'Icy travelers with glowing tails.', hint: 'Ride a comet tail.' }),
  E({ id: 'rings', name: 'Planet Rings', category: 'space', real: true, picture: { glyph: 'ringed' }, blurb: 'Rings of ice and rock around big planets.', hint: 'Visit Saturn.' }),
  E({ id: 'valles', name: 'Valles Marineris', category: 'space', real: true, picture: { glyph: 'mountain' }, blurb: 'A giant canyon on Mars.', hint: 'Explore the Big Canyon.' }),
  E({ id: 'olympus', name: 'Olympus Mons', category: 'space', real: true, picture: { glyph: 'volcano' }, blurb: 'A giant volcano on Mars.', hint: 'Climb Olympus Mons.' }),
  E({ id: 'gravity', name: 'Gravity', category: 'space', real: true, picture: { glyph: 'planet', color: '#9b6bff' }, blurb: 'The pull that keeps us on the ground.', hint: 'Land on another world.' }),
  E({ id: 'slingshot', name: 'Gravity Slingshot', category: 'space', real: true, picture: { glyph: 'comet', color: '#ffe066' }, blurb: 'Swing past a planet to speed up.', hint: 'Do a slingshot past a big planet.' }),
  E({ id: 'wormhole', name: 'Wormholes', category: 'space', real: false, picture: { glyph: 'wormhole' }, blurb: 'A science idea: a shortcut through space.', hint: 'Find the wormhole.' }),
  E({ id: 'rocket', name: 'Rockets', category: 'tech', real: true, picture: { glyph: 'rocket' }, blurb: 'Machines that fly into space.', hint: 'Fly your rocket.' }),
  E({ id: 'satellite', name: 'Satellites', category: 'tech', real: true, picture: { glyph: 'satellite' }, blurb: 'Machines that go around a planet.', hint: 'Scan a satellite.' }),
  E({ id: 'rover', name: 'Rovers', category: 'tech', real: true, picture: { glyph: 'rover' }, blurb: 'Robot cars that explore.', hint: 'Drive a rover.' }),
  E({ id: 'astronaut', name: 'Astronauts', category: 'tech', real: true, picture: { glyph: 'helmet' }, blurb: 'People who travel to space.', hint: 'Walk on the Moon.' }),
  E({ id: 'zephyra', name: 'Zephyra', category: 'story', real: false, picture: { body: 'zephyra' }, blurb: "Zibbo's home planet, made up for our story.", hint: 'Go through the wormhole.' }),
  E({ id: 'tibble', name: 'Tibble and Tobble', category: 'story', real: false, picture: { body: 'tibble' }, blurb: 'The two bouncy moons of Zephyra (made up).', hint: 'Fly around Zephyra.' }),
  E({ id: 'beacon', name: 'The Star Beacon', category: 'story', real: false, picture: { glyph: 'beacon' }, blurb: 'A lighthouse that guides explorers home (made up).', hint: 'Visit the Zephyra village.' }),
  E({ id: 'c_zibbo', name: 'Zibbo', category: 'story', real: false, picture: { char: 'zibbo' }, blurb: 'Your alien best friend from Zephyra.', hint: 'Rescue someone on Callisto.' }),
  E({ id: 'c_ollo', name: 'Glowkeeper Ollo', category: 'story', real: false, picture: { char: 'ollo' }, blurb: 'The keeper of the Star Beacon.', hint: 'Meet the Zephyrans.' }),
  E({ id: 'c_glimmers', name: 'Glimmers', category: 'story', real: false, picture: { glyph: 'glimmer' }, blurb: 'Tiny glowing space friends (made up).', hint: 'Help the lost glimmers.' }),
  E({ id: 'c_stella', name: 'Commander Stella', category: 'story', real: false, picture: { char: 'stella' }, blurb: 'Leader of the Space Sky Academy.', hint: 'Start your adventure.' }),
  E({ id: 'c_pip', name: 'Professor Pip', category: 'story', real: false, picture: { char: 'pip' }, blurb: 'The Academy scientist.', hint: 'Meet the crew.' }),
  E({ id: 'c_rio', name: 'Captain Rio', category: 'story', real: false, picture: { char: 'rio' }, blurb: 'Your flight teacher.', hint: 'Meet the crew.' }),
  E({ id: 'c_boltzy', name: 'Boltzy', category: 'story', real: false, picture: { char: 'boltzy' }, blurb: 'The robot who fixes rockets.', hint: 'Visit the Hangar.' }),
  E({ id: 'c_tuggy', name: 'Tuggy', category: 'story', real: false, picture: { char: 'tuggy' }, blurb: 'The friendly tow-bot.', hint: 'Get a tow from Tuggy.' }),
];

export const CODEX_BY_ID: Record<string, CodexEntry> = Object.fromEntries(CODEX.map((c) => [c.id, c]));
