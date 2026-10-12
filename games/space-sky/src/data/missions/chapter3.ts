import type { MissionDef } from '../missionTypes';

/** Chapter 3: The Asteroid Belt and Jupiter. A strange signal leads to a lost alien explorer. */
export const CHAPTER3: MissionDef[] = [
  {
    id: 'c3_belt', chapter: 3, kind: 'main', title: 'Through the Belt', giver: 'rio', glyph: 'rock',
    summary: 'Fly through the asteroid belt to Ceres Station.',
    requires: ['c2_report'], briefing: 'c3_belt_brief', done: 'c3_belt_done',
    objectives: [
      { kind: 'arrive', system: 'belt', text: 'Fly to the Asteroid Belt', icon: 'rocket', where: { system: 'belt' }, hint: 'Pick the Asteroid Belt on the Star Map. Fly around the rocks!' },
      { kind: 'near', body: 'ceres', text: 'Find Ceres', icon: 'target', where: { system: 'belt', body: 'ceres' } },
      { kind: 'land', body: 'ceres', text: 'Land on Ceres', icon: 'land', where: { system: 'belt', body: 'ceres' } },
      { kind: 'talk', npc: 'pots', area: 'ceres_station', text: 'Meet Pots the robot cook', icon: 'chat', where: { body: 'ceres', area: 'ceres_station' } },
    ],
    rewards: { coins: 80, parts: ['cargo_magnet'], codex: ['belt', 'ceres', 'asteroid'] },
  },
  {
    id: 'c3_signal', chapter: 3, kind: 'main', title: 'A Strange Signal', giver: 'pots', glyph: 'bolt',
    summary: 'Fix the big antenna to hear a mystery message.',
    requires: ['c3_belt'], briefing: 'c3_signal_brief', done: 'c3_signal_done',
    objectives: [
      { kind: 'collect', item: 'cereschip', count: 3, area: 'ceres_station', text: 'Find 3 signal chips', icon: 'bolt', where: { body: 'ceres', area: 'ceres_station' }, hint: 'Ceres has weak gravity. Jump high to reach the chips!' },
      { kind: 'solve', puzzle: 'ceres_antenna', area: 'ceres_station', text: 'Fix the big antenna', icon: 'bolt', where: { body: 'ceres', area: 'ceres_station' }, hint: 'Carry 2 power orbs to the antenna.' },
    ],
    rewards: { coins: 80 },
  },
  {
    id: 'c3_jupiter', chapter: 3, kind: 'main', title: "Jupiter's Big Storm", giver: 'pip', glyph: 'swirl',
    summary: 'Scan the Great Red Spot and land at Ganymede Station.',
    requires: ['c3_signal'], briefing: 'c3_jupiter_brief', done: 'c3_jupiter_done',
    objectives: [
      { kind: 'near', body: 'jupiter', text: 'Fly to Jupiter', icon: 'rocket', where: { system: 'jupiter', body: 'jupiter' }, hint: 'Jupiter is the biggest planet. You can\'t miss it!' },
      { kind: 'scan', target: 'jupiter', text: 'Scan the Great Red Spot', icon: 'scan', where: { system: 'jupiter', body: 'jupiter' }, hint: 'Fly close to Jupiter and hold Action.' },
      { kind: 'land', body: 'ganymede', text: 'Land at Ganymede Station', icon: 'land', where: { system: 'jupiter', body: 'ganymede' } },
      { kind: 'talk', npc: 'ada', area: 'ganymede_caves', text: 'Meet Doctor Ada', icon: 'chat', where: { body: 'ganymede', area: 'ganymede_caves' } },
    ],
    rewards: { coins: 90, stickers: ['st_storm'], codex: ['jupiter', 'ganymede'] },
  },
  {
    id: 'c3_europa', chapter: 3, kind: 'main', title: 'Ice Moon Europa', giver: 'ada', glyph: 'snowflake',
    summary: 'Collect ice and follow some funny footprints.',
    requires: ['c3_jupiter'], briefing: 'c3_europa_brief', done: 'c3_europa_done',
    objectives: [
      { kind: 'land', body: 'europa', text: 'Land on Europa', icon: 'land', where: { system: 'jupiter', body: 'europa' } },
      { kind: 'collect', item: 'europaice', count: 2, area: 'europa_ice', text: 'Collect 2 ice samples', icon: 'snowflake', where: { body: 'europa', area: 'europa_ice' }, hint: 'The ice is slippery. Go slowly!' },
      { kind: 'reach', marker: 'europa_tracks', area: 'europa_ice', text: 'Follow the funny footprints', icon: 'flag', where: { body: 'europa', area: 'europa_ice' }, hint: 'Keep going to the far end of the ice.' },
    ],
    rewards: { coins: 90, codex: ['europa'] },
  },
  {
    id: 'c3_rescue', chapter: 3, kind: 'main', title: 'Rescue on Callisto', giver: 'ada', glyph: 'alien',
    summary: 'Find the crashed pod and help whoever is inside.',
    requires: ['c3_europa'], briefing: 'c3_rescue_brief', done: 'c3_rescue_done',
    objectives: [
      { kind: 'land', body: 'callisto', text: 'Land on Callisto', icon: 'land', where: { system: 'jupiter', body: 'callisto' } },
      { kind: 'collect', item: 'podpart', count: 2, area: 'callisto_crash', text: 'Find 2 pod parts', icon: 'wrench', where: { body: 'callisto', area: 'callisto_crash' } },
      { kind: 'solve', puzzle: 'zibbo_pod', area: 'callisto_crash', text: 'Power up the crashed pod', icon: 'bolt', where: { body: 'callisto', area: 'callisto_crash' }, hint: 'Carry 2 power orbs to the pod.' },
      { kind: 'talk', npc: 'zibbo', area: 'callisto_crash', text: 'Say hello to the alien!', icon: 'chat', where: { body: 'callisto', area: 'callisto_crash' }, onStart: 'c3_rescue_pod' },
      { kind: 'home', text: 'Take Zibbo home to the Academy', icon: 'home', where: { system: 'earth', body: 'earth' } },
    ],
    rewards: { coins: 120, flags: ['zibboJoined'], chapter: 4, cutscene: 'zibbo', codex: ['callisto', 'c_zibbo'] },
  },
  {
    id: 'c3s_io', chapter: 3, kind: 'side', title: 'Volcano Moon', giver: 'pip', glyph: 'volcano',
    summary: 'Peek at Io, the moon with the most volcanoes.',
    requires: ['c3_jupiter'], briefing: 'c3s_io_brief', done: 'c3s_io_done',
    objectives: [{ kind: 'scan', target: 'io', text: 'Scan Io from space', icon: 'scan', where: { system: 'jupiter', body: 'io' } }],
    rewards: { coins: 60, stickers: ['st_volcano'], codex: ['io'] },
  },
  {
    id: 'c3s_ganymede', chapter: 3, kind: 'side', title: 'Giant Moon Rocks', giver: 'ada', glyph: 'planet',
    summary: 'Collect three rocks from the biggest moon.',
    requires: ['c3_jupiter'], briefing: 'c3s_ganymede_brief', done: 'c3s_ganymede_done',
    objectives: [{ kind: 'collect', item: 'ganymederock', count: 3, area: 'ganymede_caves', text: 'Find 3 Ganymede rocks', icon: 'sparkle', where: { body: 'ganymede', area: 'ganymede_caves' } }],
    rewards: { coins: 70, parts: ['paint_galaxy'] },
  },
  {
    id: 'c3s_belt_coins', chapter: 3, kind: 'side', title: 'Belt Coin Rush', giver: 'rio', glyph: 'coin',
    summary: 'Collect 50 star-coins in the asteroid belt.',
    requires: ['c3_belt'], briefing: 'c3s_belt_coins_brief', done: 'c3s_belt_coins_done',
    objectives: [{ kind: 'coins', count: 50, system: 'belt', text: 'Collect 50 coins in the belt', icon: 'coin', where: { system: 'belt' } }],
    rewards: { coins: 50, parts: ['nose_comet'] },
  },
  {
    id: 'c3s_vesta', chapter: 3, kind: 'side', title: 'Big Rock Vesta', giver: 'pip', glyph: 'rock',
    summary: 'Scan Vesta, a giant asteroid.',
    requires: ['c3_belt'], briefing: 'c3s_vesta_brief', done: 'c3s_vesta_done',
    objectives: [{ kind: 'scan', target: 'vesta', text: 'Scan Vesta', icon: 'scan', where: { system: 'belt', body: 'vesta' } }],
    rewards: { coins: 50, codex: ['vesta'] },
  },
];
