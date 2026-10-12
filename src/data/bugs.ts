// Bug catalogue: every catchable bug, its habitat and hours, flee behavior, and pastel icon palette.
import type { BugDef } from './types';

export const BUGS: BugDef[] = [
  // ---------- flowers ----------
  { id: 'bug_dozy_clover_bee', name: 'Dozy Clover Bee', desc: 'It naps in clover flowers. You can catch it at any time of day.', habitat: 'flowers', hours: [0, 24], weather: 'any', rarity: 1, price: 60, shape: 'bee', colors: [0xf7d870, 0x5c5048, 0xf8f4e8], speed: 1, wariness: 1 },
  { id: 'bug_meadow_puffwing', name: 'Meadow Puffwing', desc: 'Its fluffy wings flap so softly. Flowers hardly feel it land.', habitat: 'flowers', hours: [4, 19], weather: 'any', rarity: 1, price: 90, shape: 'butterfly', colors: [0xf8f0d0, 0xf2c8a0, 0xa8c890], speed: 1, wariness: 1 },
  { id: 'bug_honeydrop_bee', name: 'Honeydrop Bee', desc: 'A busy little bee. It always takes one gold drop home.', habitat: 'flowers', hours: [6, 18], weather: 'any', rarity: 2, price: 250, shape: 'bee', colors: [0xf7c45e, 0x6b5a48, 0xfff2b0], speed: 2, wariness: 1 },
  { id: 'bug_moonbloom_moth', name: 'Moonbloom Moth', desc: 'It visits flowers at night. Its pale wings get dusty with silver pollen.', habitat: 'flowers', hours: [19, 4], weather: 'any', rarity: 2, price: 400, shape: 'moth', colors: [0xe8e4f2, 0xc4bce0, 0xf2e8a8], speed: 1, wariness: 2 },
  { id: 'bug_petalguard_mantis', name: 'Petalguard Mantis', desc: 'On sunny days, it stands very still in pink petals. It waits for a snack!', habitat: 'flowers', hours: [8, 17], weather: 'clear', rarity: 3, price: 1200, shape: 'hopper', colors: [0xf7c4d4, 0xa8d4a0, 0xfff0f4], speed: 2, wariness: 2 },
  { id: 'bug_crowned_silkwing', name: 'Crowned Silkwing', desc: 'A fancy butterfly with soft wings and gold edges. It never stays long!', habitat: 'flowers', hours: [8, 16], weather: 'any', rarity: 4, price: 3500, shape: 'butterfly', colors: [0x9c8cd4, 0xf2d47a, 0xf8f0ff], speed: 3, wariness: 2 },
  { id: 'bug_prismwing_butterfly', name: 'Prismwing Butterfly', desc: 'Its wings shine with every color. It only comes out under a rainbow.', habitat: 'flowers', hours: [0, 24], weather: 'rainbow', rarity: 5, price: 11000, shape: 'butterfly', colors: [0xf8d0e8, 0xa8e0f2, 0xfff0a0], speed: 3, wariness: 3 },

  // ---------- air ----------
  { id: 'bug_petal_moth', name: 'Petal Moth', desc: 'It drifts on the breeze day and night. It is too sleepy to hurry.', habitat: 'air', hours: [0, 24], weather: 'any', rarity: 1, price: 70, shape: 'moth', colors: [0xf2d8e0, 0xd8b8c8, 0xfff8f0], speed: 1, wariness: 1 },
  { id: 'bug_sunny_skimmer', name: 'Sunny Skimmer', desc: 'It zigzags over the grass in the day. It shines like a tossed coin.', habitat: 'air', hours: [8, 17], weather: 'any', rarity: 1, price: 110, shape: 'dragonfly', colors: [0xf7d88c, 0xd8ecf2, 0xf2a86b], speed: 2, wariness: 1 },
  { id: 'bug_cottonwisp_butterfly', name: 'Cottonwisp Butterfly', desc: 'So light and white, it looks like a seed puff floating by.', habitat: 'air', hours: [4, 19], weather: 'any', rarity: 2, price: 220, shape: 'butterfly', colors: [0xfaf8f2, 0xe0dcd0, 0xb8d8f0], speed: 1, wariness: 2 },
  { id: 'bug_glowdrop_firefly', name: 'Glowdrop Firefly', desc: 'It blinks a soft green and gold glow at night. It seems to say good night!', habitat: 'air', hours: [19, 4], weather: 'any', rarity: 2, price: 350, shape: 'firefly', colors: [0x6b6458, 0xd8f08c, 0xfff4b0], speed: 1, wariness: 2 },
  { id: 'bug_ember_darter', name: 'Ember Darter', desc: 'A quick little dragonfly. Its wings shine orange in the noon sun.', habitat: 'air', hours: [9, 16], weather: 'any', rarity: 3, price: 1000, shape: 'dragonfly', colors: [0xf2a07c, 0xf8e0d0, 0xf7d070], speed: 3, wariness: 2 },
  { id: 'bug_starveil_moth', name: 'Starveil Moth', desc: 'Its dark wings have tiny pale stars. Look for it on clear nights.', habitat: 'air', hours: [21, 4], weather: 'clear', rarity: 4, price: 3200, shape: 'moth', colors: [0x7c78a8, 0x5c5888, 0xf8f0c8], speed: 2, wariness: 3 },
  { id: 'bug_sunbow_dragonfly', name: 'Sunbow Dragonfly', desc: 'Some say it comes from the end of a rainbow. It goes away when the colors fade.', habitat: 'air', hours: [0, 24], weather: 'rainbow', rarity: 5, price: 10000, shape: 'dragonfly', colors: [0xa8e8d8, 0xf2c4e8, 0xfff2a0], speed: 3, wariness: 3 },

  // ---------- trees ----------
  { id: 'bug_barkbutton_beetle', name: 'Barkbutton Beetle', desc: 'It clings to tree trunks like a little round button.', habitat: 'trees', hours: [0, 24], weather: 'any', rarity: 1, price: 100, shape: 'beetle', colors: [0xb88c6b, 0x8c6448, 0xf2d8a8], speed: 1, wariness: 1 },
  { id: 'bug_leafsong_hopper', name: 'Leafsong Hopper', desc: 'It sings a bright song from the leaves. It hops away if you get close!', habitat: 'trees', hours: [8, 17], weather: 'any', rarity: 2, price: 240, shape: 'hopper', colors: [0xa8d48c, 0x7cb068, 0xf2f0a8], speed: 2, wariness: 2 },
  { id: 'bug_dewweb_spider', name: 'Dewweb Spider', desc: 'It spins thin webs. In the morning, dew drops hang on them like tiny pearls.', habitat: 'trees', hours: [16, 9], weather: 'any', rarity: 2, price: 300, shape: 'spider', colors: [0x9c94a8, 0x6c6478, 0xe0ecf2], speed: 1, wariness: 2 },
  { id: 'bug_pinecone_weevil', name: 'Pinecone Weevil', desc: 'A little bug with a long nose. It naps between the scales of pinecones.', habitat: 'trees', hours: [4, 19], weather: 'any', rarity: 3, price: 900, shape: 'beetle', colors: [0xc8a07c, 0x8c6c54, 0xa8c4a0], speed: 2, wariness: 2 },
  { id: 'bug_acorn_horncap', name: 'Acorn Horncap', desc: 'Its horn looks like an acorn cap. It wrestles other beetles for tree sap.', habitat: 'trees', hours: [17, 8], weather: 'any', rarity: 3, price: 1500, shape: 'beetle', colors: [0x9c7458, 0x6b4c38, 0xe8c48c], speed: 2, wariness: 3 },
  { id: 'bug_mossbuck_beetle', name: 'Mossbuck Beetle', desc: 'A big beetle with jaws like antlers. Soft moss grows on its shell.', habitat: 'trees', hours: [19, 8], weather: 'any', rarity: 4, price: 4200, shape: 'beetle', colors: [0x7c9c78, 0x5c7458, 0xd8e0a8], speed: 2, wariness: 3 },

  // ---------- ground ----------
  { id: 'bug_clover_hopper', name: 'Clover Hopper', desc: 'It hops from clover to clover, in rain or in sun.', habitat: 'ground', hours: [0, 24], weather: 'any', rarity: 1, price: 70, shape: 'hopper', colors: [0xb8dc90, 0x88b46c, 0xf2e8b0], speed: 1, wariness: 1 },
  { id: 'bug_crumb_ant', name: 'Crumb Ant', desc: 'It carries crumbs much bigger than itself. It never complains!', habitat: 'ground', hours: [0, 24], weather: 'any', rarity: 1, price: 50, shape: 'ant', colors: [0x8c6c64, 0x6b4c48, 0xf2c4b0], speed: 1, wariness: 1 },
  { id: 'bug_moonchirp_cricket', name: 'Moonchirp Cricket', desc: 'It sings sweet songs in the grass at night. Tiptoe, or it will stop!', habitat: 'ground', hours: [17, 8], weather: 'any', rarity: 2, price: 320, shape: 'hopper', colors: [0x8c8068, 0x6c6450, 0xd8d0f0], speed: 2, wariness: 2 },
  { id: 'bug_emberback_beetle', name: 'Emberback Beetle', desc: 'It runs across warm paths. Its shiny shell is the color of hot coals.', habitat: 'ground', hours: [8, 17], weather: 'any', rarity: 3, price: 900, shape: 'beetle', colors: [0xf2907c, 0xc8685c, 0xf8d8a0], speed: 3, wariness: 2 },
  { id: 'bug_thistledown_spider', name: 'Thistledown Spider', desc: 'A fuzzy spider that walks at night. Its soft legs make no sound.', habitat: 'ground', hours: [19, 4], weather: 'any', rarity: 3, price: 1300, shape: 'spider', colors: [0xc4b8d0, 0x9c90ac, 0xf2e8f0], speed: 2, wariness: 3 },

  // ---------- rocks ----------
  { id: 'bug_stonehug_spider', name: 'Stonehug Spider', desc: 'It hugs warm rocks so tight that it looks like stone.', habitat: 'rocks', hours: [0, 24], weather: 'any', rarity: 1, price: 90, shape: 'spider', colors: [0xb8b0a8, 0x8c8480, 0xe8d8c0], speed: 1, wariness: 1 },
  { id: 'bug_drizzle_snail', name: 'Drizzle Snail', desc: 'In the rain, it sips drops from the rocks. It leaves sparkly trails!', habitat: 'rocks', hours: [0, 24], weather: 'rain', rarity: 1, price: 100, shape: 'snail', colors: [0xd8c4a8, 0xa8907c, 0xc8d8e8], speed: 1, wariness: 1 },
  { id: 'bug_opal_shell_snail', name: 'Opal Shell Snail', desc: 'Its swirly shell shines like a pearl in the rain.', habitat: 'rocks', hours: [0, 24], weather: 'rain', rarity: 3, price: 1400, shape: 'snail', colors: [0xe8e0f2, 0xb8d8e8, 0xf2d0e0], speed: 1, wariness: 2 },

  // ---------- beach ----------
  { id: 'bug_sandskip_hopper', name: 'Sandskip Hopper', desc: 'It bounces along the beach. It hops away from every wave.', habitat: 'beach', hours: [0, 24], weather: 'any', rarity: 1, price: 80, shape: 'hopper', colors: [0xf2e0c0, 0xd0b894, 0xa8d4e0], speed: 1, wariness: 1 },
  { id: 'bug_seaglass_beetle', name: 'Seaglass Beetle', desc: 'Its shell looks just like a smooth bit of sea glass. Look on the beach at night.', habitat: 'beach', hours: [19, 4], weather: 'any', rarity: 4, price: 2800, shape: 'beetle', colors: [0xa8dcd0, 0x7cb4a8, 0xf0f8f4], speed: 3, wariness: 3 },

  // ---------- water ----------
  { id: 'bug_reedtip_damsel', name: 'Reedtip Damsel', desc: 'A thin dragonfly that sits on reeds. It dips down to the water to say hello.', habitat: 'water', hours: [8, 19], weather: 'any', rarity: 2, price: 280, shape: 'dragonfly', colors: [0x94c4e8, 0xe0f0f8, 0x6c94c8], speed: 2, wariness: 2 },
  { id: 'bug_raindance_strider', name: 'Raindance Strider', desc: 'It skates on ponds in the rain. It spins between the ripples.', habitat: 'water', hours: [0, 24], weather: 'rain', rarity: 3, price: 1100, shape: 'spider', colors: [0x8c9cb0, 0x6c7c94, 0xd0e4f0], speed: 3, wariness: 2 },

  // ---------- fruit ----------
  { id: 'bug_peachfuzz_ant', name: 'Peachfuzz Ant', desc: 'It sniffs out fallen fruit. Then it asks all its cousins to the feast!', habitat: 'fruit', hours: [0, 24], weather: 'any', rarity: 2, price: 220, shape: 'ant', colors: [0xf2b8a0, 0xd08c78, 0xfff0e0], speed: 1, wariness: 2 },
  { id: 'bug_jamjar_beetle', name: 'Jamjar Beetle', desc: 'It dives into ripe fruit. It comes out sticky and very happy!', habitat: 'fruit', hours: [8, 20], weather: 'any', rarity: 2, price: 400, shape: 'beetle', colors: [0xc87890, 0x985868, 0xf8c8d0], speed: 2, wariness: 2 },

  // ---------- seasonal (only around in their season) ----------
  { id: 'bug_petal_skipper', name: 'Petal Skipper', desc: 'A tiny pink butterfly. It hops from flower to flower in spring.', habitat: 'flowers', hours: [6, 18], weather: 'any', rarity: 1, price: 150, shape: 'butterfly', colors: [0xffc2d4, 0xffffff, 0xf28fae], speed: 1, wariness: 1, seasons: ['spring'] },
  { id: 'bug_sprout_beetle', name: 'Sprout Beetle', desc: 'It wears a little green leaf on its back like a hat.', habitat: 'ground', hours: [0, 24], weather: 'any', rarity: 2, price: 300, shape: 'beetle', colors: [0x8fd18a, 0x5a8a4a, 0xf3f8e8], speed: 1, wariness: 2, seasons: ['spring'] },
  { id: 'bug_sizzle_hopper', name: 'Sizzle Hopper', desc: 'It sings a buzzy song from the treetops on hot summer days.', habitat: 'trees', hours: [8, 17], weather: 'any', rarity: 2, price: 350, shape: 'hopper', colors: [0x9fc48a, 0x6a8a5a, 0xfff2b0], speed: 2, wariness: 2, seasons: ['summer'] },
  { id: 'bug_lagoon_darter', name: 'Lagoon Darter', desc: 'A blue dragonfly. It zips low over the water all summer.', habitat: 'water', hours: [8, 19], weather: 'any', rarity: 2, price: 450, shape: 'dragonfly', colors: [0x7fd3e8, 0xd8f4fa, 0x3f7fa8], speed: 3, wariness: 2, seasons: ['summer'] },
  { id: 'bug_amber_moth', name: 'Amber Moth', desc: 'Its wings look like two warm autumn leaves.', habitat: 'air', hours: [17, 4], weather: 'any', rarity: 2, price: 420, shape: 'moth', colors: [0xf2a65c, 0xffd8a8, 0x8a5a3a], speed: 1, wariness: 2, seasons: ['autumn'] },
  { id: 'bug_acorn_weevil', name: 'Acorn Weevil', desc: 'A round little bug with a long nose. It is busy hiding acorns.', habitat: 'trees', hours: [0, 24], weather: 'any', rarity: 1, price: 200, shape: 'beetle', colors: [0xb98a5e, 0x6f4a32, 0xf3dcb5], speed: 1, wariness: 1, seasons: ['autumn'] },
  { id: 'bug_frost_ant', name: 'Frost Ant', desc: 'A tough little ant with a shiny blue shell. Snow does not bother it!', habitat: 'ground', hours: [9, 16], weather: 'any', rarity: 1, price: 180, shape: 'ant', colors: [0x7fa8d9, 0x3f5a7a, 0xdff0ff], speed: 1, wariness: 1, seasons: ['winter'] },
  { id: 'bug_snowpuff_moth', name: 'Snowpuff Moth', desc: 'So fluffy and white, it looks like a flying snowball.', habitat: 'air', hours: [16, 8], weather: 'any', rarity: 3, price: 900, shape: 'moth', colors: [0xffffff, 0xe0ecf5, 0xb9c8e0], speed: 2, wariness: 2, seasons: ['winter'] },
];
