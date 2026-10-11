import type { MissionDef } from '../missionTypes';

/** Chapter 1: Cadet Training. Learn to fly, land on the Moon, collect your first samples. */
export const CHAPTER1: MissionDef[] = [
  {
    id: 'c1_welcome', chapter: 1, kind: 'main', title: 'Welcome, Cadet!', giver: 'stella', glyph: 'star',
    summary: 'Look around the Space Sky Academy and meet the crew.',
    requires: [], briefing: 'c1_welcome_brief', done: 'c1_welcome_done',
    objectives: [
      { kind: 'visit', place: 'hangar', text: 'Visit the Hangar', icon: 'wrench', where: { place: 'hangar' }, hint: 'The Hangar is where your rocket lives. Tap the wrench button!' },
      { kind: 'visit', place: 'lounge', text: 'Meet the crew in the Lounge', icon: 'chat', where: { place: 'lounge' }, hint: 'Tap the Lounge button to meet the crew.' },
      { kind: 'talk', npc: 'pip', area: 'lounge', text: 'Say hi to Professor Pip', icon: 'chat', where: { place: 'lounge' }, hint: 'Tap Professor Pip in the Lounge.' },
    ],
    rewards: { coins: 30 },
  },
  {
    id: 'c1_first_flight', chapter: 1, kind: 'main', title: 'First Flight', giver: 'rio', glyph: 'rocket',
    summary: 'Fly through the training rings and collect star-coins.',
    requires: ['c1_welcome'], briefing: 'c1_first_flight_brief', done: 'c1_first_flight_done',
    objectives: [
      { kind: 'gates', course: 'training', text: 'Fly through all 6 rings', icon: 'target', where: { system: 'earth' }, flight: { course: 'training' }, hint: 'Steer toward the yellow ring. Fly through the middle!', onStart: 'c1_first_flight_rings' },
      { kind: 'coins', count: 10, system: 'earth', text: 'Collect 10 star-coins', icon: 'coin', where: { system: 'earth' }, hint: 'Fly into the shiny star-coins.' },
      { kind: 'land', body: 'earth', text: 'Land back at the Academy', icon: 'land', where: { system: 'earth', body: 'earth' }, hint: 'Fly next to Earth and press Land.' },
    ],
    rewards: { coins: 40, stickers: ['st_rocket'] },
  },
  {
    id: 'c1_fuel', chapter: 1, kind: 'main', title: 'Fuel Up!', giver: 'rio', glyph: 'fuel',
    summary: 'Learn about fuel, boosting and bumpy rocks.',
    requires: ['c1_first_flight'], briefing: 'c1_fuel_brief', done: 'c1_fuel_done',
    objectives: [
      { kind: 'fuel', count: 3, text: 'Grab 3 green fuel cells', icon: 'fuel', where: { system: 'earth' }, hint: 'Fuel cells are green with a lightning bolt.' },
      { kind: 'boost', count: 3, text: 'Use Boost 3 times', icon: 'boost', where: { system: 'earth' }, hint: 'Press the big Boost button (or Space) to zoom!' },
      { kind: 'land', body: 'earth', text: 'Land back at the Academy', icon: 'land', where: { system: 'earth', body: 'earth' } },
    ],
    rewards: { coins: 40, parts: ['nose_bubble'] },
  },
  {
    id: 'c1_moon', chapter: 1, kind: 'main', title: 'To the Moon!', giver: 'stella', glyph: 'moon',
    summary: 'Fly to the Moon and land at Moon Base.',
    requires: ['c1_fuel'], briefing: 'c1_moon_brief', done: 'c1_moon_done',
    objectives: [
      { kind: 'near', body: 'moon', text: 'Fly to the Moon', icon: 'rocket', where: { system: 'earth', body: 'moon' }, hint: 'Follow the yellow arrow to the Moon.' },
      { kind: 'land', body: 'moon', text: 'Land on the Moon', icon: 'land', where: { system: 'earth', body: 'moon' }, hint: 'Hold Thrust to slow down. Land on the glowing pad.', onStart: 'c1_moon_land_tip' },
      { kind: 'talk', npc: 'sol', area: 'moon_base', text: 'Say hello to Skipper Sol', icon: 'chat', where: { body: 'moon', area: 'moon_base' }, hint: 'Skipper Sol is by the dome. Walk close and press Talk.' },
    ],
    rewards: { coins: 50, codex: ['moon'] },
  },
  {
    id: 'c1_moon_rocks', chapter: 1, kind: 'main', title: 'Moon Rocks', giver: 'pip', glyph: 'rock',
    summary: 'Collect three Moon rocks and bring them to Professor Pip.',
    requires: ['c1_moon'], briefing: 'c1_moon_rocks_brief', done: 'c1_moon_rocks_done',
    objectives: [
      { kind: 'collect', item: 'moonrock', count: 3, area: 'moon_base', text: 'Find 3 glowing Moon rocks', icon: 'sparkle', where: { body: 'moon', area: 'moon_base' }, hint: 'One rock is on a hill. One is behind the Moon Base door. One is on a tall tower!' },
      { kind: 'home', text: 'Fly home to the Academy', icon: 'home', where: { system: 'earth', body: 'earth' }, hint: 'Go back to your rocket, fly to Earth and land.' },
      { kind: 'talk', npc: 'pip', area: 'lounge', text: 'Give the rocks to Professor Pip', icon: 'chat', where: { place: 'lounge' }, hint: 'Professor Pip is in the Lounge.' },
    ],
    rewards: { coins: 80, parts: ['eng_twin'], chapter: 2, cutscene: 'chapter2' },
  },
  {
    id: 'c1s_satellites', chapter: 1, kind: 'side', title: 'Satellite Check-up', giver: 'boltzy', glyph: 'satellite',
    summary: 'Scan three satellites flying around Earth.',
    requires: ['c1_first_flight'], briefing: 'c1s_satellites_brief', done: 'c1s_satellites_done',
    objectives: [
      { kind: 'scan', target: 'sat:', count: 3, text: 'Scan 3 satellites', icon: 'scan', where: { system: 'earth' }, flight: { scanObjects: { prefix: 'sat', count: 3, around: 'earth', radius: 480 } }, hint: 'Fly close to a satellite and hold Action to scan it.' },
    ],
    rewards: { coins: 40, stickers: ['st_satellite'] },
  },
  {
    id: 'c1s_coins', chapter: 1, kind: 'side', title: 'Star-Coin Sprint', giver: 'rio', glyph: 'coin',
    summary: 'Collect 40 star-coins near Earth.',
    requires: ['c1_first_flight'], briefing: 'c1s_coins_brief', done: 'c1s_coins_done',
    objectives: [
      { kind: 'coins', count: 40, system: 'earth', text: 'Collect 40 star-coins near Earth', icon: 'coin', where: { system: 'earth' }, hint: 'Star-coins make trails and circles. Follow them!' },
    ],
    rewards: { coins: 20, parts: ['paint_ocean'] },
  },
];
