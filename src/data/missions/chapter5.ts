import type { MissionDef } from '../missionTypes';

/** Chapter 5: Beyond the Stars. Through the wormhole to Zephyra, to light the Star Beacon. */
export const CHAPTER5: MissionDef[] = [
  {
    id: 'c5_wormhole', chapter: 5, kind: 'main', title: 'Into the Wormhole', giver: 'stella', glyph: 'wormhole',
    summary: 'Fly through the wormhole to Zibbo\'s home.',
    requires: ['c4_starpath'], briefing: 'c5_wormhole_brief', done: 'c5_wormhole_done',
    objectives: [
      { kind: 'near', body: 'wormhole', text: 'Fly into the wormhole', icon: 'rocket', where: { system: 'wormhole', body: 'wormhole' }, hint: 'The wormhole is past Neptune on the Star Map.' },
    ],
    rewards: { coins: 100, stickers: ['st_wormhole'], flags: ['wormholeDone'], cutscene: 'wormhole', codex: ['wormhole'] },
  },
  {
    id: 'c5_zephyra', chapter: 5, kind: 'main', title: 'Welcome to Zephyra', giver: 'zibbo', glyph: 'alien',
    summary: 'Land on Zephyra and meet Zibbo\'s friends.',
    requires: ['c5_wormhole'], briefing: 'c5_zephyra_brief', done: 'c5_zephyra_done',
    objectives: [
      { kind: 'land', body: 'zephyra', text: 'Land on Zephyra', icon: 'land', where: { system: 'zephyra', body: 'zephyra' } },
      { kind: 'talk', npc: 'ollo', area: 'zephyra_village', text: 'Meet Glowkeeper Ollo', icon: 'chat', where: { body: 'zephyra', area: 'zephyra_village' } },
      { kind: 'reach', marker: 'village_beacon', area: 'zephyra_village', text: 'Go see the Star Beacon', icon: 'flag', where: { body: 'zephyra', area: 'zephyra_village' } },
    ],
    rewards: { coins: 100, parts: ['nose_prism'], codex: ['zephyra', 'c_ollo'] },
  },
  {
    id: 'c5_crystal', chapter: 5, kind: 'main', title: 'The Crystal Spark', giver: 'ollo', glyph: 'crystal',
    summary: 'Find a beacon spark in the Crystal Caves.',
    requires: ['c5_zephyra'], startFlags: ['crystalOpen'], briefing: 'c5_crystal_brief', done: 'c5_spark_done',
    objectives: [
      { kind: 'solve', puzzle: 'cave_colors', area: 'zephyra_crystal', text: 'Match the cave crystals', icon: 'sparkle', where: { body: 'zephyra', area: 'zephyra_crystal' }, hint: 'Tap each crystal until it matches the sign.' },
      { kind: 'collect', item: 'spark', area: 'zephyra_crystal', text: 'Grab the Crystal Spark', icon: 'star', where: { body: 'zephyra', area: 'zephyra_crystal' } },
    ],
    rewards: { coins: 100 },
  },
  {
    id: 'c5_bubble', chapter: 5, kind: 'main', title: 'The Bubble Spark', giver: 'pibble', glyph: 'bubble',
    summary: 'Bounce across the Bubble Sea for a beacon spark.',
    requires: ['c5_zephyra'], startFlags: ['bubbleOpen'], briefing: 'c5_bubble_brief', done: 'c5_spark_done',
    objectives: [
      { kind: 'talk', npc: 'pibble', area: 'zephyra_bubble', text: 'Find Pibble at the Bubble Sea', icon: 'chat', where: { body: 'zephyra', area: 'zephyra_bubble' } },
      { kind: 'solve', puzzle: 'bubble_machine', area: 'zephyra_bubble', text: 'Start the bubble machine', icon: 'bolt', where: { body: 'zephyra', area: 'zephyra_bubble' }, hint: 'Carry 2 power orbs to the machine.' },
      { kind: 'collect', item: 'spark', area: 'zephyra_bubble', text: 'Grab the Bubble Spark', icon: 'star', where: { body: 'zephyra', area: 'zephyra_bubble' } },
    ],
    rewards: { coins: 100 },
  },
  {
    id: 'c5_sky', chapter: 5, kind: 'main', title: 'The Sky Spark', giver: 'wobb', glyph: 'wind',
    summary: 'Push two crates on the Windy Peaks to find a spark.',
    requires: ['c5_zephyra'], startFlags: ['skyOpen'], briefing: 'c5_sky_brief', done: 'c5_spark_done',
    objectives: [
      { kind: 'collect', item: 'spark', area: 'zephyra_sky', text: 'Grab the Sky Spark', icon: 'star', where: { body: 'zephyra', area: 'zephyra_sky' }, hint: 'Push both crates onto the orange buttons to open the door.' },
    ],
    rewards: { coins: 100, parts: ['tank_glow'] },
  },
  {
    id: 'c5_beacon', chapter: 5, kind: 'main', title: 'Light the Star Beacon', giver: 'ollo', glyph: 'beacon',
    summary: 'Climb the Star Beacon and light it up!',
    requires: ['c5_crystal', 'c5_bubble', 'c5_sky'], startFlags: ['beaconOpen'], briefing: 'c5_beacon_brief', done: 'c5_beacon_done',
    objectives: [
      { kind: 'talk', npc: 'ollo', area: 'zephyra_village', text: 'Give the 3 sparks to Ollo', icon: 'chat', where: { body: 'zephyra', area: 'zephyra_village' }, onDone: 'c5_beacon_ollo' },
      { kind: 'reach', marker: 'beacon_top', area: 'zephyra_beacon', text: 'Climb the Star Beacon', icon: 'flag', where: { body: 'zephyra', area: 'zephyra_beacon' }, hint: 'Use the jump pads to climb up the tower.' },
      { kind: 'solve', puzzle: 'beacon_power', area: 'zephyra_beacon', text: 'Light the Star Beacon!', icon: 'star', where: { body: 'zephyra', area: 'zephyra_beacon' }, hint: 'Put 3 glowing orbs into the beacon.' },
    ],
    rewards: { coins: 200, parts: ['eng_star'], flags: ['beaconLit'], cutscene: 'finale' },
  },
  {
    id: 'c5s_glimmers', chapter: 5, kind: 'side', title: 'Lost Glimmers', giver: 'ollo', glyph: 'glimmer',
    summary: 'Gather the little glowing glimmers floating near Zephyra.',
    requires: ['c5_zephyra'], briefing: 'c5s_glimmers_brief', done: 'c5s_glimmers_done',
    objectives: [{ kind: 'glimmer', count: 6, text: 'Gather 6 lost glimmers', icon: 'sparkle', where: { system: 'zephyra' }, flight: { glimmers: { count: 8, around: 'zephyra', radius: 520 } }, hint: 'Glimmers are tiny glowing stars. Fly into them!' }],
    rewards: { coins: 80, stickers: ['st_glimmer'], codex: ['c_glimmers'] },
  },
  {
    id: 'c5s_berries', chapter: 5, kind: 'side', title: 'Glow-berry Picnic', giver: 'wobb', glyph: 'flower',
    summary: 'Pick glow-berries for a big Zephyra picnic.',
    requires: ['c5_zephyra'], briefing: 'c5s_berries_brief', done: 'c5s_berries_done',
    objectives: [{ kind: 'collect', item: 'glowberry', count: 5, area: 'zephyra_village', text: 'Pick 5 glow-berries', icon: 'flower', where: { body: 'zephyra', area: 'zephyra_village' } }],
    rewards: { coins: 80, items: ['outfit_zephyra'] },
  },
];
