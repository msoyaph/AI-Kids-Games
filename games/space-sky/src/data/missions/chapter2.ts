import type { MissionDef } from '../missionTypes';

/** Chapter 2: The Inner Planets. Mercury, Venus and Mars. */
export const CHAPTER2: MissionDef[] = [
  {
    id: 'c2_mercury', chapter: 2, kind: 'main', title: 'Hot Little Mercury', giver: 'pip', glyph: 'sun',
    summary: 'Visit the planet closest to the Sun and collect rocks.',
    requires: ['c1_moon_rocks'], briefing: 'c2_mercury_brief', done: 'c2_mercury_done',
    objectives: [
      { kind: 'near', body: 'mercury', text: 'Fly to Mercury', icon: 'rocket', where: { system: 'mercury', body: 'mercury' }, hint: 'Mercury is next to the Sun. Open the Star Map and pick Mercury.' },
      { kind: 'land', body: 'mercury', text: 'Land on Mercury', icon: 'land', where: { system: 'mercury', body: 'mercury' }, hint: 'Fly close and press Land. Hold Thrust to slow down.' },
      { kind: 'collect', item: 'mercuryrock', count: 2, area: 'mercury_craters', text: 'Find 2 Mercury rocks', icon: 'sparkle', where: { body: 'mercury', area: 'mercury_craters' }, hint: 'Drive Toastie the rover over the glowing rocks.', onStart: 'c2_mercury_rover' },
    ],
    rewards: { coins: 60, codex: ['mercury', 'sun'] },
  },
  {
    id: 'c2_venus', chapter: 2, kind: 'main', title: 'Cloudy Venus', giver: 'pip', glyph: 'cloud',
    summary: 'Scan the clouds of Venus and fix a weather station.',
    requires: ['c2_mercury'], briefing: 'c2_venus_brief', done: 'c2_venus_done',
    objectives: [
      { kind: 'near', body: 'venus', text: 'Fly to Venus', icon: 'rocket', where: { system: 'venus', body: 'venus' }, hint: 'Venus is the bright yellow planet on the Star Map.' },
      { kind: 'scan', target: 'venus', text: 'Scan the thick clouds', icon: 'scan', where: { system: 'venus', body: 'venus' }, hint: 'Fly close to Venus and hold Action to scan.' },
      { kind: 'land', body: 'venus', text: 'Land on Venus', icon: 'land', where: { system: 'venus', body: 'venus' } },
      { kind: 'solve', puzzle: 'venus_weather', area: 'venus_surface', text: 'Power up the weather station', icon: 'bolt', where: { body: 'venus', area: 'venus_surface' }, hint: 'Grab a glowing power orb. Carry it to the station. Do it twice!' },
    ],
    rewards: { coins: 70, codex: ['venus'] },
  },
  {
    id: 'c2_rover', chapter: 2, kind: 'main', title: 'Rover Rescue', giver: 'kit', glyph: 'rover',
    summary: 'Help Ranger Kit fix Dusty, a rover on Mars.',
    requires: ['c2_venus'], briefing: 'c2_rover_brief', done: 'c2_rover_done',
    objectives: [
      { kind: 'near', body: 'mars', text: 'Fly to Mars', icon: 'rocket', where: { system: 'mars', body: 'mars' }, hint: 'Mars is the red planet on the Star Map.' },
      { kind: 'land', body: 'mars', text: 'Land on Mars', icon: 'land', where: { system: 'mars', body: 'mars' } },
      { kind: 'talk', npc: 'kit', area: 'mars_landing', text: 'Meet Ranger Kit', icon: 'chat', where: { body: 'mars', area: 'mars_landing' }, hint: 'Ranger Kit is near the outpost dome.' },
      { kind: 'collect', item: 'roverpart', count: 3, area: 'mars_landing', text: 'Find 3 rover parts', icon: 'wrench', where: { body: 'mars', area: 'mars_landing' }, hint: 'Look for glowing wrenches.' },
      { kind: 'solve', puzzle: 'mars_rover', area: 'mars_landing', text: 'Fix Dusty the rover', icon: 'bolt', where: { body: 'mars', area: 'mars_landing' }, hint: 'Carry 2 power orbs to Dusty.' },
    ],
    rewards: { coins: 80, flags: ['canyonOpen', 'olympusOpen'], codex: ['mars'] },
  },
  {
    id: 'c2_canyon', chapter: 2, kind: 'main', title: 'Canyon Explorer', giver: 'kit', glyph: 'mountain',
    summary: 'Explore a giant canyon on Mars.',
    requires: ['c2_rover'], startFlags: ['canyonOpen'], briefing: 'c2_canyon_brief', done: 'c2_canyon_done',
    objectives: [
      { kind: 'collect', item: 'marsrock', count: 2, area: 'mars_canyon', text: 'Find 2 red Mars rocks', icon: 'sparkle', where: { body: 'mars', area: 'mars_canyon' }, hint: 'Land on Mars and pick the Big Canyon.' },
      { kind: 'reach', marker: 'canyon_end', area: 'mars_canyon', text: 'Reach the end of the canyon', icon: 'flag', where: { body: 'mars', area: 'mars_canyon' }, hint: 'Keep going right until you see the yellow flag.' },
    ],
    rewards: { coins: 80, flags: ['iceOpen'], codex: ['valles'] },
  },
  {
    id: 'c2_ice', chapter: 2, kind: 'main', title: 'Hidden Ice', giver: 'pip', glyph: 'snowflake',
    summary: 'Find ice hidden at the Mars ice cap.',
    requires: ['c2_canyon'], startFlags: ['iceOpen'], briefing: 'c2_ice_brief', done: 'c2_ice_done',
    objectives: [
      { kind: 'solve', puzzle: 'ice_colors', area: 'mars_icecap', text: 'Open the ice cave', icon: 'sparkle', where: { body: 'mars', area: 'mars_icecap' }, hint: 'Tap the crystals until they match the colors on the sign.' },
      { kind: 'collect', item: 'marsice', area: 'mars_icecap', text: 'Find the hidden ice', icon: 'snowflake', where: { body: 'mars', area: 'mars_icecap' } },
      { kind: 'home', text: 'Fly home to the Academy', icon: 'home', where: { system: 'earth', body: 'earth' } },
    ],
    rewards: { coins: 90 },
  },
  {
    id: 'c2_report', chapter: 2, kind: 'main', title: 'Big News', giver: 'stella', glyph: 'flag',
    summary: 'Tell the crew about the ice you found.',
    requires: ['c2_ice'], briefing: 'c2_report_brief', done: 'c2_report_done',
    objectives: [
      { kind: 'talk', npc: 'pip', area: 'lounge', text: 'Give the ice to Professor Pip', icon: 'chat', where: { place: 'lounge' }, onDone: 'c2_report_pip' },
      { kind: 'talk', npc: 'stella', area: 'lounge', text: 'Tell Commander Stella', icon: 'chat', where: { place: 'lounge' } },
    ],
    rewards: { coins: 100, parts: ['tank_belly'], chapter: 3 },
  },
  {
    id: 'c2s_moons', chapter: 2, kind: 'side', title: 'Two Little Moons', giver: 'pip', glyph: 'moon',
    summary: 'Scan Phobos and Deimos, the two moons of Mars.',
    requires: ['c2_rover'], briefing: 'c2s_moons_brief', done: 'c2s_moons_done',
    objectives: [
      { kind: 'scan', target: 'phobos', text: 'Scan Phobos', icon: 'scan', where: { system: 'mars', body: 'phobos' } },
      { kind: 'scan', target: 'deimos', text: 'Scan Deimos', icon: 'scan', where: { system: 'mars', body: 'deimos' } },
    ],
    rewards: { coins: 50, codex: ['phobos', 'deimos'] },
  },
  {
    id: 'c2s_olympus', chapter: 2, kind: 'side', title: 'Giant Volcano', giver: 'kit', glyph: 'volcano',
    summary: 'Climb Olympus Mons, the tallest volcano we know.',
    requires: ['c2_rover'], startFlags: ['olympusOpen'], briefing: 'c2s_olympus_brief', done: 'c2s_olympus_done',
    objectives: [
      { kind: 'reach', marker: 'olympus_top', area: 'mars_olympus', text: 'Climb to the top of Olympus Mons', icon: 'flag', where: { body: 'mars', area: 'mars_olympus' }, hint: 'Land on Mars and pick Olympus Mons. Use the jump pads!' },
    ],
    rewards: { coins: 60, parts: ['fins_wing'], codex: ['olympus'] },
  },
  {
    id: 'c2s_sling', chapter: 2, kind: 'side', title: 'Slingshot School', giver: 'rio', glyph: 'comet',
    summary: 'Swoop past big planets to do gravity slingshots.',
    requires: ['c2_mercury'], briefing: 'c2s_sling_brief', done: 'c2s_sling_done',
    objectives: [
      { kind: 'slingshot', count: 2, text: 'Do 2 gravity slingshots', icon: 'sparkle', hint: 'Fly fast and close past a big planet. Curve around it without stopping!' },
    ],
    rewards: { coins: 60, parts: ['paint_sunset'] },
  },
];
