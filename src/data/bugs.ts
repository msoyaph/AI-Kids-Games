// Bug catalogue: every catchable bug, its habitat and hours, flee behavior, and pastel icon palette.
import type { BugDef } from './types';

export const BUGS: BugDef[] = [
  // ---------- flowers ----------
  { id: 'bug_dozy_clover_bee', name: 'Dozy Clover Bee', desc: 'Naps inside clover blossoms and can be scooped up at any hour of the day.', habitat: 'flowers', hours: [0, 24], weather: 'any', rarity: 1, price: 60, shape: 'bee', colors: [0xf7d870, 0x5c5048, 0xf8f4e8], speed: 1, wariness: 1 },
  { id: 'bug_meadow_puffwing', name: 'Meadow Puffwing', desc: 'Its fluffy wings flutter so softly that flowers barely notice it landing.', habitat: 'flowers', hours: [4, 19], weather: 'any', rarity: 1, price: 90, shape: 'butterfly', colors: [0xf8f0d0, 0xf2c8a0, 0xa8c890], speed: 1, wariness: 1 },
  { id: 'bug_honeydrop_bee', name: 'Honeydrop Bee', desc: 'A busy little forager that always seems to carry one golden droplet home.', habitat: 'flowers', hours: [6, 18], weather: 'any', rarity: 2, price: 250, shape: 'bee', colors: [0xf7c45e, 0x6b5a48, 0xfff2b0], speed: 2, wariness: 1 },
  { id: 'bug_moonbloom_moth', name: 'Moonbloom Moth', desc: 'Visits night-blooming flowers, dusting its pale wings with silver pollen.', habitat: 'flowers', hours: [19, 4], weather: 'any', rarity: 2, price: 400, shape: 'moth', colors: [0xe8e4f2, 0xc4bce0, 0xf2e8a8], speed: 1, wariness: 2 },
  { id: 'bug_petalguard_mantis', name: 'Petalguard Mantis', desc: 'Poses perfectly still among pink petals on sunny days, waiting for a snack.', habitat: 'flowers', hours: [8, 17], weather: 'clear', rarity: 3, price: 1200, shape: 'hopper', colors: [0xf7c4d4, 0xa8d4a0, 0xfff0f4], speed: 2, wariness: 2 },
  { id: 'bug_crowned_silkwing', name: 'Crowned Silkwing', desc: 'A regal butterfly with velvet wings edged in gold, rarely seen for long.', habitat: 'flowers', hours: [8, 16], weather: 'any', rarity: 4, price: 3500, shape: 'butterfly', colors: [0x9c8cd4, 0xf2d47a, 0xf8f0ff], speed: 3, wariness: 2 },
  { id: 'bug_prismwing_butterfly', name: 'Prismwing Butterfly', desc: 'Its wings split the light into every color, and it only appears beneath a rainbow.', habitat: 'flowers', hours: [0, 24], weather: 'rainbow', rarity: 5, price: 11000, shape: 'butterfly', colors: [0xf8d0e8, 0xa8e0f2, 0xfff0a0], speed: 3, wariness: 3 },

  // ---------- air ----------
  { id: 'bug_petal_moth', name: 'Petal Moth', desc: 'Drifts on the breeze day and night, much too sleepy to hurry anywhere.', habitat: 'air', hours: [0, 24], weather: 'any', rarity: 1, price: 70, shape: 'moth', colors: [0xf2d8e0, 0xd8b8c8, 0xfff8f0], speed: 1, wariness: 1 },
  { id: 'bug_sunny_skimmer', name: 'Sunny Skimmer', desc: 'Zigzags over the grass in the daytime, glinting like a tossed coin.', habitat: 'air', hours: [8, 17], weather: 'any', rarity: 1, price: 110, shape: 'dragonfly', colors: [0xf7d88c, 0xd8ecf2, 0xf2a86b], speed: 2, wariness: 1 },
  { id: 'bug_cottonwisp_butterfly', name: 'Cottonwisp Butterfly', desc: 'So light and white it is often mistaken for a seed puff floating by.', habitat: 'air', hours: [4, 19], weather: 'any', rarity: 2, price: 220, shape: 'butterfly', colors: [0xfaf8f2, 0xe0dcd0, 0xb8d8f0], speed: 1, wariness: 2 },
  { id: 'bug_glowdrop_firefly', name: 'Glowdrop Firefly', desc: 'Blinks a gentle green-gold glow, as if saying goodnight to the island.', habitat: 'air', hours: [19, 4], weather: 'any', rarity: 2, price: 350, shape: 'firefly', colors: [0x6b6458, 0xd8f08c, 0xfff4b0], speed: 1, wariness: 2 },
  { id: 'bug_ember_darter', name: 'Ember Darter', desc: 'A quick little dragonfly with wings that shimmer orange in the noon sun.', habitat: 'air', hours: [9, 16], weather: 'any', rarity: 3, price: 1000, shape: 'dragonfly', colors: [0xf2a07c, 0xf8e0d0, 0xf7d070], speed: 3, wariness: 2 },
  { id: 'bug_starveil_moth', name: 'Starveil Moth', desc: 'Its dusky wings are freckled with tiny pale stars, best seen on clear nights.', habitat: 'air', hours: [21, 4], weather: 'clear', rarity: 4, price: 3200, shape: 'moth', colors: [0x7c78a8, 0x5c5888, 0xf8f0c8], speed: 2, wariness: 3 },
  { id: 'bug_sunbow_dragonfly', name: 'Sunbow Dragonfly', desc: 'Said to be born from the end of a rainbow, it vanishes as soon as the colors fade.', habitat: 'air', hours: [0, 24], weather: 'rainbow', rarity: 5, price: 10000, shape: 'dragonfly', colors: [0xa8e8d8, 0xf2c4e8, 0xfff2a0], speed: 3, wariness: 3 },

  // ---------- trees ----------
  { id: 'bug_barkbutton_beetle', name: 'Barkbutton Beetle', desc: 'Clings to tree trunks like a little round button sewn onto the bark.', habitat: 'trees', hours: [0, 24], weather: 'any', rarity: 1, price: 100, shape: 'beetle', colors: [0xb88c6b, 0x8c6448, 0xf2d8a8], speed: 1, wariness: 1 },
  { id: 'bug_leafsong_hopper', name: 'Leafsong Hopper', desc: 'Chirps a bright tune from the leaves and hops away the moment you get close.', habitat: 'trees', hours: [8, 17], weather: 'any', rarity: 2, price: 240, shape: 'hopper', colors: [0xa8d48c, 0x7cb068, 0xf2f0a8], speed: 2, wariness: 2 },
  { id: 'bug_dewweb_spider', name: 'Dewweb Spider', desc: 'Weaves delicate webs that catch the morning dew like strings of tiny pearls.', habitat: 'trees', hours: [16, 9], weather: 'any', rarity: 2, price: 300, shape: 'spider', colors: [0x9c94a8, 0x6c6478, 0xe0ecf2], speed: 1, wariness: 2 },
  { id: 'bug_pinecone_weevil', name: 'Pinecone Weevil', desc: 'A long-nosed little fellow that naps between pinecone scales.', habitat: 'trees', hours: [4, 19], weather: 'any', rarity: 3, price: 900, shape: 'beetle', colors: [0xc8a07c, 0x8c6c54, 0xa8c4a0], speed: 2, wariness: 2 },
  { id: 'bug_acorn_horncap', name: 'Acorn Horncap', desc: 'Proudly wears a horn shaped like an acorn cap and wrestles rivals for sap.', habitat: 'trees', hours: [17, 8], weather: 'any', rarity: 3, price: 1500, shape: 'beetle', colors: [0x9c7458, 0x6b4c38, 0xe8c48c], speed: 2, wariness: 3 },
  { id: 'bug_mossbuck_beetle', name: 'Mossbuck Beetle', desc: 'A grand beetle with antler-like jaws, its shell softly furred with moss.', habitat: 'trees', hours: [19, 8], weather: 'any', rarity: 4, price: 4200, shape: 'beetle', colors: [0x7c9c78, 0x5c7458, 0xd8e0a8], speed: 2, wariness: 3 },

  // ---------- ground ----------
  { id: 'bug_clover_hopper', name: 'Clover Hopper', desc: 'Springs from clover patch to clover patch, rain or shine.', habitat: 'ground', hours: [0, 24], weather: 'any', rarity: 1, price: 70, shape: 'hopper', colors: [0xb8dc90, 0x88b46c, 0xf2e8b0], speed: 1, wariness: 1 },
  { id: 'bug_crumb_ant', name: 'Crumb Ant', desc: 'Marches off with crumbs far larger than itself, never once complaining.', habitat: 'ground', hours: [0, 24], weather: 'any', rarity: 1, price: 50, shape: 'ant', colors: [0x8c6c64, 0x6b4c48, 0xf2c4b0], speed: 1, wariness: 1 },
  { id: 'bug_moonchirp_cricket', name: 'Moonchirp Cricket', desc: 'Sings sweet evening songs from the grass and goes quiet if you tiptoe near.', habitat: 'ground', hours: [17, 8], weather: 'any', rarity: 2, price: 320, shape: 'hopper', colors: [0x8c8068, 0x6c6450, 0xd8d0f0], speed: 2, wariness: 2 },
  { id: 'bug_emberback_beetle', name: 'Emberback Beetle', desc: 'Scurries across warm paths with a glossy shell the color of glowing coals.', habitat: 'ground', hours: [8, 17], weather: 'any', rarity: 3, price: 900, shape: 'beetle', colors: [0xf2907c, 0xc8685c, 0xf8d8a0], speed: 3, wariness: 2 },
  { id: 'bug_thistledown_spider', name: 'Thistledown Spider', desc: 'A fuzzy night wanderer that tiptoes over the ground on soft, silent legs.', habitat: 'ground', hours: [19, 4], weather: 'any', rarity: 3, price: 1300, shape: 'spider', colors: [0xc4b8d0, 0x9c90ac, 0xf2e8f0], speed: 2, wariness: 3 },

  // ---------- rocks ----------
  { id: 'bug_stonehug_spider', name: 'Stonehug Spider', desc: 'Hugs warm rocks so tightly it looks like part of the stone.', habitat: 'rocks', hours: [0, 24], weather: 'any', rarity: 1, price: 90, shape: 'spider', colors: [0xb8b0a8, 0x8c8480, 0xe8d8c0], speed: 1, wariness: 1 },
  { id: 'bug_drizzle_snail', name: 'Drizzle Snail', desc: 'Comes out to sip raindrops from the rocks and leaves sparkly trails behind.', habitat: 'rocks', hours: [0, 24], weather: 'rain', rarity: 1, price: 100, shape: 'snail', colors: [0xd8c4a8, 0xa8907c, 0xc8d8e8], speed: 1, wariness: 1 },
  { id: 'bug_opal_shell_snail', name: 'Opal Shell Snail', desc: 'Its spiral shell glows with milky opal hues when wet with fresh rain.', habitat: 'rocks', hours: [0, 24], weather: 'rain', rarity: 3, price: 1400, shape: 'snail', colors: [0xe8e0f2, 0xb8d8e8, 0xf2d0e0], speed: 1, wariness: 2 },

  // ---------- beach ----------
  { id: 'bug_sandskip_hopper', name: 'Sandskip Hopper', desc: 'Bounces along the tideline, skipping out of the way of every wave.', habitat: 'beach', hours: [0, 24], weather: 'any', rarity: 1, price: 80, shape: 'hopper', colors: [0xf2e0c0, 0xd0b894, 0xa8d4e0], speed: 1, wariness: 1 },
  { id: 'bug_seaglass_beetle', name: 'Seaglass Beetle', desc: 'Its frosted shell looks just like a smooth bit of sea glass washed ashore.', habitat: 'beach', hours: [19, 4], weather: 'any', rarity: 4, price: 2800, shape: 'beetle', colors: [0xa8dcd0, 0x7cb4a8, 0xf0f8f4], speed: 3, wariness: 3 },

  // ---------- water ----------
  { id: 'bug_reedtip_damsel', name: 'Reedtip Damsel', desc: 'A slender dragonfly that perches on reed tips and skims the water to say hello.', habitat: 'water', hours: [8, 19], weather: 'any', rarity: 2, price: 280, shape: 'dragonfly', colors: [0x94c4e8, 0xe0f0f8, 0x6c94c8], speed: 2, wariness: 2 },
  { id: 'bug_raindance_strider', name: 'Raindance Strider', desc: 'Skates across rainy ponds, twirling between the ripples of falling drops.', habitat: 'water', hours: [0, 24], weather: 'rain', rarity: 3, price: 1100, shape: 'spider', colors: [0x8c9cb0, 0x6c7c94, 0xd0e4f0], speed: 3, wariness: 2 },

  // ---------- fruit ----------
  { id: 'bug_peachfuzz_ant', name: 'Peachfuzz Ant', desc: 'Follows the scent of fallen fruit and invites all its cousins to the feast.', habitat: 'fruit', hours: [0, 24], weather: 'any', rarity: 2, price: 220, shape: 'ant', colors: [0xf2b8a0, 0xd08c78, 0xfff0e0], speed: 1, wariness: 2 },
  { id: 'bug_jamjar_beetle', name: 'Jamjar Beetle', desc: 'Dives headfirst into ripe fruit and comes out sticky and very pleased.', habitat: 'fruit', hours: [8, 20], weather: 'any', rarity: 2, price: 400, shape: 'beetle', colors: [0xc87890, 0x985868, 0xf8c8d0], speed: 2, wariness: 2 },
];
