import type { MissionDef } from '../missionTypes';

/** Chapter 4: The Outer Planets. Saturn, Uranus and Neptune hide clues to Zibbo's home. */
export const CHAPTER4: MissionDef[] = [
  {
    id: 'c4_saturn', chapter: 4, kind: 'main', title: "Saturn's Rings", giver: 'zibbo', glyph: 'ringed',
    summary: 'Fly through Saturn\'s rings and scoop up ring ice.',
    requires: ['c3_rescue'], briefing: 'c4_saturn_brief', done: 'c4_saturn_done',
    objectives: [
      { kind: 'near', body: 'saturn', text: 'Fly to Saturn', icon: 'rocket', where: { system: 'saturn', body: 'saturn' }, hint: 'Saturn is the planet with the big rings.' },
      { kind: 'gates', course: 'race_ripple', text: 'Fly through the ring trail', icon: 'target', where: { system: 'saturn' }, flight: { course: 'race_ripple' }, hint: 'Follow the yellow rings around Saturn.' },
      { kind: 'haul', item: 'ice', count: 4, text: 'Scoop up 4 pieces of ring ice', icon: 'snowflake', where: { system: 'saturn' }, flight: { hauls: { kind: 'ice', count: 7, around: 'saturn', radius: 430 } }, hint: 'Fly into the shiny blue ice pieces.' },
      { kind: 'deliver', item: 'ice', count: 4, body: 'titan', text: 'Bring the ice to Titan Station', icon: 'land', where: { system: 'saturn', body: 'titan' }, hint: 'Titan is Saturn\'s big orange moon. Land there!' },
    ],
    rewards: { coins: 100, flags: ['racesOpen'], codex: ['saturn', 'rings'] },
  },
  {
    id: 'c4_titan', chapter: 4, kind: 'main', title: "Titan's Orange Sky", giver: 'fin', glyph: 'drop',
    summary: 'Light the lake beacons and find the first clue crystal.',
    requires: ['c4_saturn'], briefing: 'c4_titan_brief', done: 'c4_titan_done',
    objectives: [
      { kind: 'talk', npc: 'fin', area: 'titan_lakes', text: 'Talk to Captain Fin', icon: 'chat', where: { body: 'titan', area: 'titan_lakes' } },
      { kind: 'solve', puzzle: 'titan_colors', area: 'titan_lakes', text: 'Light the lake beacons', icon: 'sparkle', where: { body: 'titan', area: 'titan_lakes' }, hint: 'Make the crystals match the colors on the sign.' },
      { kind: 'collect', item: 'clue', area: 'titan_lakes', text: 'Find the first clue crystal', icon: 'sparkle', where: { body: 'titan', area: 'titan_lakes' } },
    ],
    rewards: { coins: 100, codex: ['titan'] },
  },
  {
    id: 'c4_uranus', chapter: 4, kind: 'main', title: 'Tilted Uranus', giver: 'zibbo', glyph: 'planet',
    summary: 'Scan Uranus and climb down a giant cliff on Miranda.',
    requires: ['c4_titan'], briefing: 'c4_uranus_brief', done: 'c4_uranus_done',
    objectives: [
      { kind: 'near', body: 'uranus', text: 'Fly to Uranus', icon: 'rocket', where: { system: 'uranus', body: 'uranus' } },
      { kind: 'scan', target: 'uranus', text: 'Scan Uranus', icon: 'scan', where: { system: 'uranus', body: 'uranus' } },
      { kind: 'land', body: 'miranda', text: 'Land on Miranda', icon: 'land', where: { system: 'uranus', body: 'miranda' } },
      { kind: 'reach', marker: 'miranda_bottom', area: 'miranda_cliffs', text: 'Climb down the giant cliff', icon: 'flag', where: { body: 'miranda', area: 'miranda_cliffs' }, hint: 'Hop down the ledges. Your jetpack keeps you safe!' },
      { kind: 'collect', item: 'clue', area: 'miranda_cliffs', text: 'Find the second clue crystal', icon: 'sparkle', where: { body: 'miranda', area: 'miranda_cliffs' } },
    ],
    rewards: { coins: 110, codex: ['uranus', 'miranda'] },
  },
  {
    id: 'c4_neptune', chapter: 4, kind: 'main', title: 'Windy Neptune', giver: 'zibbo', glyph: 'wind',
    summary: 'Brave the winds of Neptune and help Ivy on Triton.',
    requires: ['c4_uranus'], briefing: 'c4_neptune_brief', done: 'c4_neptune_done',
    objectives: [
      { kind: 'near', body: 'neptune', text: 'Fly to Neptune', icon: 'rocket', where: { system: 'neptune', body: 'neptune' }, hint: 'In our game, Neptune\'s wind pushes your rocket. Steer against it!' },
      { kind: 'scan', target: 'neptune', text: "Scan Neptune's storms", icon: 'scan', where: { system: 'neptune', body: 'neptune' } },
      { kind: 'land', body: 'triton', text: 'Land on Triton', icon: 'land', where: { system: 'neptune', body: 'triton' } },
      { kind: 'talk', npc: 'ivy', area: 'triton_geysers', text: 'Meet Ivy', icon: 'chat', where: { body: 'triton', area: 'triton_geysers' } },
      { kind: 'solve', puzzle: 'triton_heater', area: 'triton_geysers', text: "Fix Ivy's heater", icon: 'bolt', where: { body: 'triton', area: 'triton_geysers' }, hint: 'Carry 2 power orbs to the heater.' },
      { kind: 'collect', item: 'clue', area: 'triton_geysers', text: 'Find the last clue crystal', icon: 'sparkle', where: { body: 'triton', area: 'triton_geysers' }, hint: 'Ride a geyser up high!' },
    ],
    rewards: { coins: 120, codex: ['neptune', 'triton'] },
  },
  {
    id: 'c4_starpath', chapter: 4, kind: 'main', title: 'The Star Path', giver: 'zibbo', glyph: 'map',
    summary: 'Put the three clue crystals together.',
    requires: ['c4_neptune'], briefing: 'c4_starpath_brief', done: 'c4_starpath_done',
    objectives: [
      { kind: 'home', text: 'Fly home to the Academy', icon: 'home', where: { system: 'earth', body: 'earth' } },
      { kind: 'talk', npc: 'zibbo', area: 'lounge', text: 'Show Zibbo the clue crystals', icon: 'chat', where: { place: 'lounge' }, onDone: 'c4_starpath_zibbo' },
      { kind: 'talk', npc: 'stella', area: 'lounge', text: 'Ask Commander Stella for help', icon: 'chat', where: { place: 'lounge' }, onDone: 'c4_starpath_stella' },
      { kind: 'talk', npc: 'boltzy', area: 'lounge', text: 'Get a wormhole shield from Boltzy', icon: 'chat', where: { place: 'lounge' } },
    ],
    rewards: { coins: 150, parts: ['body_crystal'], flags: ['wormholeFound'], chapter: 5, cutscene: 'starpath' },
  },
  {
    id: 'c4s_race1', chapter: 4, kind: 'side', title: 'Ring Ripple Race', giver: 'rio', glyph: 'rings',
    summary: 'Race through the rings around Saturn.',
    requires: ['c4_saturn'], briefing: 'c4s_race1_brief', done: 'c4s_race_done',
    objectives: [{ kind: 'race', course: 'race_ripple', text: 'Finish the Ring Ripple race', icon: 'trophy', where: { place: 'board' }, hint: 'Open Races on the Mission Board.' }],
    rewards: { coins: 60 },
  },
  {
    id: 'c4s_race2', chapter: 4, kind: 'side', title: 'Cassini Curve Race', giver: 'rio', glyph: 'trophy',
    summary: 'A longer race around Saturn.',
    requires: ['c4s_race1'], briefing: 'c4s_race2_brief', done: 'c4s_race_done',
    objectives: [{ kind: 'race', course: 'race_cassini', text: 'Finish the Cassini Curve race', icon: 'trophy', where: { place: 'board' } }],
    rewards: { coins: 80 },
  },
  {
    id: 'c4s_race3', chapter: 4, kind: 'side', title: 'Titan Twister Race', giver: 'fin', glyph: 'medal',
    summary: 'A twisty race around Titan.',
    requires: ['c4s_race2'], briefing: 'c4s_race3_brief', done: 'c4s_race_done',
    objectives: [{ kind: 'race', course: 'race_titan', text: 'Finish the Titan Twister race', icon: 'trophy', where: { place: 'board' } }],
    rewards: { coins: 100, parts: ['fins_star'] },
  },
  {
    id: 'c4s_enceladus', chapter: 4, kind: 'side', title: 'Icy Fountains', giver: 'pip', glyph: 'geyser',
    summary: 'Scan Enceladus and its icy fountains.',
    requires: ['c4_saturn'], briefing: 'c4s_enceladus_brief', done: 'c4s_enceladus_done',
    objectives: [{ kind: 'scan', target: 'enceladus', text: 'Scan Enceladus', icon: 'scan', where: { system: 'saturn', body: 'enceladus' } }],
    rewards: { coins: 60, codex: ['enceladus'] },
  },
  {
    id: 'c4s_pluto', chapter: 4, kind: 'side', title: 'Little Pluto', giver: 'ivy', glyph: 'heart',
    summary: 'Visit the dwarf planet with a heart.',
    requires: ['c4_neptune'], briefing: 'c4s_pluto_brief', done: 'c4s_pluto_done',
    objectives: [
      { kind: 'land', body: 'pluto', text: 'Land on Pluto', icon: 'land', where: { system: 'pluto', body: 'pluto' } },
      { kind: 'collect', item: 'plutoice', area: 'pluto_heart', text: 'Collect some Pluto ice', icon: 'snowflake', where: { body: 'pluto', area: 'pluto_heart' } },
      { kind: 'reach', marker: 'pluto_heart', area: 'pluto_heart', text: 'Find the big heart', icon: 'flag', where: { body: 'pluto', area: 'pluto_heart' } },
    ],
    rewards: { coins: 120, codex: ['pluto', 'charon'] },
  },
];
