/**
 * Items. `n` is the stable number used in saves: never renumber, only add at the end.
 * Snacks help befriending (each Agentmon has a favorite). Berries restore energy or calm a status.
 * Gear gives one friend a small, steady boost. Key items are story things and can't be sold.
 * Prices are in coins earned from spars and quests. Nothing is ever random or bought with money.
 */
import type { Item, SnackId } from '../core/types';

const LIST: Item[] = [
  // Snacks (befriending)
  { n: 1, id: 'berry-bun', name: 'Berry Bun', kind: 'snack', price: 30, desc: 'A soft bun with berries inside. Some Agentmon love it most.' },
  { n: 2, id: 'crunch-seed', name: 'Crunch Seeds', kind: 'snack', price: 30, desc: 'Crunchy roasted seeds. A favorite of diggers and fliers.' },
  { n: 3, id: 'honey-drop', name: 'Honey Drop', kind: 'snack', price: 30, desc: 'A sweet, golden drop. Quick little Agentmon love it.' },
  { n: 4, id: 'sea-crisp', name: 'Sea Crisp', kind: 'snack', price: 30, desc: 'A salty seaweed crisp. Swimmers love it.' },
  { n: 5, id: 'sun-pepper', name: 'Sunny Pepper', kind: 'snack', price: 30, desc: 'A mild, sweet pepper that tastes like summer.' },
  { n: 6, id: 'frost-mint', name: 'Frost Mint', kind: 'snack', price: 30, desc: 'A cool mint leaf. Snowy Agentmon love it.' },
  { n: 7, id: 'spark-fizz', name: 'Fizz Candy', kind: 'snack', price: 30, desc: 'A fizzy candy that tingles. Sparky Agentmon love it.' },
  { n: 8, id: 'moon-melon', name: 'Moon Melon', kind: 'snack', price: 30, desc: 'A pale, juicy melon slice. Calm, glowing Agentmon love it.' },

  // Berries (energy and statuses)
  { n: 20, id: 'pep-berry', name: 'Pep Berry', kind: 'berry', price: 20, desc: 'Gives back some energy (about a third).', restore: 0.35 },
  { n: 21, id: 'big-pep-berry', name: 'Big Pep Berry', kind: 'berry', price: 60, desc: 'Gives back lots of energy (about two thirds).', restore: 0.7 },
  { n: 22, id: 'calm-leaf', name: 'Calm Leaf', kind: 'berry', price: 25, desc: 'Shakes off Sleepy, Dizzy, Soaked, Toasty or Chilly.', cleanse: true },
  { n: 23, id: 'wake-berry', name: 'Wake Berry', kind: 'berry', price: 80, desc: 'Wakes a napping friend with half its energy.', restore: 0.5, revive: true },
  { n: 24, id: 'rainbow-berry', name: 'Rainbow Berry', kind: 'berry', price: 200, desc: 'Full energy, no status, and wakes a napping friend.', restore: 1, cleanse: true, revive: true },

  // Gear (one per friend)
  { n: 40, id: 'flare-charm', name: 'Flare Charm', kind: 'gear', price: 300, desc: 'Flare moves bump a little harder.', gear: { element: 'flare', moveBoost: 0.1 } },
  { n: 41, id: 'tide-charm', name: 'Tide Charm', kind: 'gear', price: 300, desc: 'Tide moves bump a little harder.', gear: { element: 'tide', moveBoost: 0.1 } },
  { n: 42, id: 'leaf-charm', name: 'Leaf Charm', kind: 'gear', price: 300, desc: 'Leaf moves bump a little harder.', gear: { element: 'leaf', moveBoost: 0.1 } },
  { n: 43, id: 'stone-charm', name: 'Stone Charm', kind: 'gear', price: 300, desc: 'Stone moves bump a little harder.', gear: { element: 'stone', moveBoost: 0.1 } },
  { n: 44, id: 'gust-charm', name: 'Gust Charm', kind: 'gear', price: 300, desc: 'Gust moves bump a little harder.', gear: { element: 'gust', moveBoost: 0.1 } },
  { n: 45, id: 'frost-charm', name: 'Frost Charm', kind: 'gear', price: 300, desc: 'Frost moves bump a little harder.', gear: { element: 'frost', moveBoost: 0.1 } },
  { n: 46, id: 'volt-charm', name: 'Volt Charm', kind: 'gear', price: 300, desc: 'Volt moves bump a little harder.', gear: { element: 'volt', moveBoost: 0.1 } },
  { n: 47, id: 'glow-charm', name: 'Glow Charm', kind: 'gear', price: 300, desc: 'Glow moves bump a little harder.', gear: { element: 'glow', moveBoost: 0.1 } },
  { n: 48, id: 'comfy-scarf', name: 'Comfy Scarf', kind: 'gear', price: 250, desc: 'Rest gives back a bit more energy.', gear: { restBoost: 0.1 } },
  { n: 49, id: 'swift-ribbon', name: 'Swift Ribbon', kind: 'gear', price: 250, desc: 'A little faster.', gear: { speed: 0.1 } },
  { n: 50, id: 'sturdy-band', name: 'Sturdy Band', kind: 'gear', price: 250, desc: 'A little sturdier against bumps.', gear: { guard: 0.1 } },

  // Key items (story; can't be sold)
  { n: 70, id: 'agent-card', name: 'Agent Card', kind: 'key', price: 0, desc: 'Your Field Agent card from the Academy.' },
  { n: 71, id: 'field-guide', name: 'Field Guide', kind: 'key', price: 0, desc: 'Fills in as you meet and befriend Agentmon.' },
  { n: 72, id: 'beacon-lens', name: 'Beacon Lens', kind: 'key', price: 0, desc: 'A glass lens that shows how bright each Beacon is.' },
  { n: 73, id: 'snack-pouch', name: 'Snack Pouch', kind: 'key', price: 0, desc: 'Lets you offer a snack when you befriend.' },
  { n: 74, id: 'tower-pass', name: 'Tower Pass', kind: 'key', price: 0, desc: 'Lets you into the Challenge Tower.' },
  { n: 75, id: 'tide-pearl', name: 'Tide Pearl', kind: 'key', price: 0, desc: 'A moon-white pearl that hums near the sea.' },
  { n: 76, id: 'canyon-bell', name: 'Canyon Bell', kind: 'key', price: 0, desc: 'Its ring echoes for a long time in the canyon.' },
  { n: 77, id: 'frost-feather', name: 'Frost Feather', kind: 'key', price: 0, desc: 'A feather of frost that never melts.' },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(LIST.map(i => [i.id, i]));
export const SNACKS: SnackId[] = ['berry-bun', 'crunch-seed', 'honey-drop', 'sea-crisp', 'sun-pepper', 'frost-mint', 'spark-fizz', 'moon-melon'];
