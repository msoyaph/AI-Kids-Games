/**
 * The story: Larkford's community farm has been asleep since its old keeper, Hattie, retired, and the
 * town's Harvest Fair stopped with it. You are the new keeper. Over eight chapters (late winter of
 * year one to autumn of year two) you wake the farm up, meet the town and the neighbours, learn each
 * new part of farming one at a time (docs/PLAN-2.md), and bring back the Grand Harvest Fair. After
 * the credits, the farm goes on forever, with new goals.
 *
 * Goals check the farm's state or count things done since the chapter began (`stat` goals). Every line
 * is short and plain (tests/unit/reading.test.ts).
 */

export interface Line { who: string; text: string }

export type Goal =
  | { id: string; text: string; hint: string; kind: 'stat'; key: string; n: number }
  | { id: string; text: string; hint: string; kind: 'have'; def: string; n: number }
  | { id: string; text: string; hint: string; kind: 'trees'; n: number }
  | { id: string; text: string; hint: string; kind: 'animals'; animal: string; n: number }
  | { id: string; text: string; hint: string; kind: 'level'; n: number }
  | { id: string; text: string; hint: string; kind: 'land'; area: string }
  | { id: string; text: string; hint: string; kind: 'beauty'; n: number }
  | { id: string; text: string; hint: string; kind: 'grandFair' };

export interface StoryRequest { id: string; who: string; items: { id: string; n: number }[]; coins: number; note: string }

export interface Chapter {
  title: string;
  /** Who starts it (for the portrait). */
  intro: Line[];
  goals: Goal[];
  /** Story requests that appear on the order board during this chapter. */
  requests: StoryRequest[];
  outro: Line[];
  reward: { coins: number; set?: string };
}

const stat = (id: string, text: string, hint: string, key: string, n: number): Goal => ({ id, text, hint, kind: 'stat', key, n });
const have = (id: string, text: string, hint: string, def: string, n = 1): Goal => ({ id, text, hint, kind: 'have', def, n });

export const CHAPTERS: readonly Chapter[] = [
  {
    title: 'The Gate Key',
    intro: [
      { who: 'hattie', text: 'Hello there! You must be the new keeper. I’m Hattie.' },
      { who: 'hattie', text: 'I kept this farm for the town of Larkford for forty years.' },
      { who: 'hattie', text: 'Then I retired to keep bees, and the farm fell asleep.' },
      { who: 'hattie', text: 'The town used to hold a Harvest Fair every autumn. It stopped when the farm went quiet.' },
      { who: 'hattie', text: 'Here is the gate key. Shall we wake the farm up together?' },
    ],
    goals: [
      stat('c1-clear', 'Clear 6 bits of old clutter', 'Tap weeds, stones and logs with the Farm tool.', 'cleared', 6),
      stat('c1-plant', 'Plant 6 fields', 'Tap an empty field and choose some seeds.', 'planted', 6),
      stat('c1-water', 'Water 3 growing crops', 'Choose Water, then tap a crop that is growing.', 'watered', 3),
      stat('c1-pick', 'Pick 18 crops', 'Ripe crops look ready. Tap them, or drag along a row.', 'harvest', 18),
      stat('c1-order', 'Deliver 2 orders to town', 'Tap the board by the dock, then press Deliver.', 'orders', 2),
    ],
    requests: [],
    outro: [
      { who: 'hattie', text: 'Look at that! The fields are waking up.' },
      { who: 'silas', text: 'Ahoy, keeper! I’m Silas. My boat, the Little Lark, takes your orders to town.' },
      { who: 'silas', text: 'The whole town is happy the farm is back!' },
    ],
    reward: { coins: 100 },
  },
  {
    title: 'Eggs and Elbow Grease',
    intro: [
      { who: 'hattie', text: 'A farm needs hens. Fresh eggs make everyone smile.' },
      { who: 'hattie', text: 'And good soil grows good food. Clover feeds the soil, and so does compost.' },
      { who: 'hattie', text: 'Oh, and the town has a spot for your own farm stand. You set the prices!' },
    ],
    goals: [
      have('c2-coop', 'Build a chicken coop', 'Open the Shop and choose the Chicken Coop.', 'coop'),
      stat('c2-eggs', 'Collect 6 eggs', 'Tap the coop to welcome some chickens. When an egg sign floats over it, tap it.', 'collect:egg', 6),
      stat('c2-clover', 'Plant clover to feed the soil', 'Clover adds nitrogen to a field. Pick it in the Seeds panel.', 'planted:clover', 1),
      stat('c2-compost', 'Use compost on 3 crops', 'Choose Compost, then tap growing crops.', 'composted', 3),
      stat('c2-stand', 'Sell 8 things at your farm stand', 'Open Town, then Stand. Put things out and set a price.', 'stand-sold', 8),
      stat('c2-orders', 'Deliver 4 orders to town', 'The board by the dock always has orders. Fill one and press Deliver.', 'orders', 4),
    ],
    requests: [],
    outro: [
      { who: 'hattie', text: 'Eggs, clover, and a stand in town. You are a natural!' },
      { who: 'hattie', text: 'Tomasz the baker came by. He wants to talk about flour.' },
    ],
    reward: { coins: 150 },
  },
  {
    title: 'The Baker’s Bargain',
    intro: [
      { who: 'tomasz', text: 'Good morning! I’m Tomasz, the baker.' },
      { who: 'tomasz', text: 'The farm used to send me flour every week. My ovens miss it!' },
      { who: 'tomasz', text: 'Build a windmill, and let’s make a deal. Flour and eggs, again and again.' },
      { who: 'hattie', text: 'That is a lot of work. A friend from town wants to help on the farm!' },
    ],
    goals: [
      have('c3-mill', 'Build the windmill', 'Open the Shop, then Workshops.', 'mill'),
      stat('c3-flour', 'Make 8 flour', 'Tap the windmill, then Make. Wheat goes in, flour comes out.', 'made:flour', 8),
      stat('c3-helper', 'Welcome your first helper', 'Tap the farmhouse, then Helpers.', 'hired', 1),
      stat('c3-bakery', 'Send 2 baskets to the bakery', 'Open Town, then Contracts. Fill the basket and send it. The next one is wanted a day later.', 'contract:bakery', 2),
      { id: 'c3-meadow', text: 'Open the Sunny Meadow', hint: 'Press Build, then Land.', kind: 'land', area: 'meadow' },
      stat('c3-plough', 'Plough 6 new fields', 'Choose the Plough and tap open ground.', 'ploughed', 6),
    ],
    requests: [],
    outro: [
      { who: 'tomasz', text: 'Bread from farm flour! The whole street can smell it.' },
      { who: 'tomasz', text: 'Hattie says her bees could help your fields. Go and see her!' },
    ],
    reward: { coins: 200 },
  },
  {
    title: 'Busy Bees',
    intro: [
      { who: 'hattie', text: 'Bees carry pollen from flower to flower. That helps fruit and seeds grow.' },
      { who: 'hattie', text: 'Here are some old seeds I saved. Heirloom seeds, from my grandmother.' },
      { who: 'hattie', text: 'Plant two kinds side by side near a hive. Who knows what the bees will make!' },
    ],
    goals: [
      have('c4-hive', 'Set up a beehive', 'Open the Shop and choose the Beehive.', 'beehive'),
      stat('c4-honey', 'Collect 4 jars of honey', 'Tap the hive when a honey sign floats over it.', 'collect:honey', 4),
      stat('c4-heirloom', 'Plant some heirloom seeds', 'Heirloom seeds are in the Seeds panel, under each crop.', 'planted-heirloom', 1),
      stat('c4-bred', 'Discover a new variety', 'Plant two kinds of one crop side by side, with a hive close by. Then pick them.', 'bred', 1),
      stat('c4-stars', 'Pick 12 three-star crops', 'Care makes stars: water, compost, good soil and bees.', 'stars3', 12),
      stat('c4-rotate', 'Rotate crops 5 times', 'Plant a different kind of crop where something else just grew.', 'rotation', 5),
    ],
    requests: [],
    outro: [
      { who: 'hattie', text: 'A brand new variety! My old bees would be proud of you.' },
      { who: 'hattie', text: 'Here is my Garden Set. A farm should be pretty as well as busy.' },
      { who: 'hattie', text: 'Mr. Lu from Reedmere wants to show you a trick with water.' },
    ],
    reward: { coins: 250, set: 'garden' },
  },
  {
    title: 'Water Wise',
    intro: [
      { who: 'lu', text: 'Hello, neighbour. I am Lu, from Reedmere, down the river.' },
      { who: 'lu', text: 'Water can do your watering for you. Dig a little channel from the river or a pond.' },
      { who: 'lu', text: 'Fields next to a wet channel drink by themselves. Sprinklers help too.' },
      { who: 'amara', text: 'And I am Amara, the school cook. The children would love your vegetables!' },
    ],
    goals: [
      { id: 'c5-orchard', text: 'Open Orchard Hill', hint: 'Press Build, then Land.', kind: 'land', area: 'orchard' },
      stat('c5-channel', 'Dig a channel that reaches water', 'Press Build, then Water. Start next to the river or a pond.', 'channel-wet', 1),
      stat('c5-auto', 'Let water reach 8 fields', 'Fields next to a wet channel, or near a sprinkler, are watered every morning.', 'auto-watered', 8),
      stat('c5-school', 'Send a basket to the school', 'Open Town, then Contracts.', 'contract:school', 1),
      stat('c5-trade', 'Swap with neighbours 3 times', 'Open Town, then Neighbours.', 'trades', 3),
      stat('c5-fair', 'Enter a seasonal fair', 'The fair opens on the last day of each season.', 'fairs', 1),
    ],
    requests: [],
    outro: [
      { who: 'penrose', text: 'What a lovely entry! I’m Mrs. Penrose. I judge the fair.' },
      { who: 'penrose', text: 'If this farm keeps growing… perhaps the Grand Harvest Fair could come back.' },
    ],
    reward: { coins: 300 },
  },
  {
    title: 'Glass and Wool',
    intro: [
      { who: 'hattie', text: 'Winter is here. Most crops rest now, but a greenhouse keeps them growing.' },
      { who: 'hattie', text: 'My old study in the farmhouse is yours, too. It is full of ideas!' },
      { who: 'amara', text: 'And the school children need warm scarves for winter. Could some sheep help?' },
    ],
    goals: [
      have('c6-glass', 'Build a greenhouse', 'Open the Shop, then Greenhouses.', 'greenhouse'),
      stat('c6-grow', 'Pick a crop from the greenhouse', 'Tap the greenhouse to plant and pick, in any season.', 'greenhouse-picked', 1),
      stat('c6-lab', 'Try 2 ideas in the Farm Lab', 'Tap the farmhouse, then Lab. Ideas come from levels and contracts.', 'lab', 2),
      { id: 'c6-sheep', text: 'Welcome 4 sheep', hint: 'Build a sheep shed, then tap it and press New sheep.', kind: 'animals', animal: 'sheep', n: 4 },
      stat('c6-cafe', 'Send a basket to the café', 'Open Town, then Contracts.', 'contract:cafe', 1),
      stat('c6-scarves', 'Send the school its scarves', 'Amara’s order is on the board. Scarves need yarn from the loom.', 'story:amara-scarves', 1),
    ],
    requests: [{ id: 'amara-scarves', who: 'amara', items: [{ id: 'scarf', n: 2 }], coins: 260, note: 'Warm scarves for the school children.' }],
    outro: [
      { who: 'amara', text: 'The children love them! Look at all the colours.' },
      { who: 'amara', text: 'Here is a little Winter Set to say thank you.' },
    ],
    reward: { coins: 350, set: 'winter' },
  },
  {
    title: 'River Days',
    intro: [
      { who: 'silas', text: 'Spring again! The river is high and the ducks are back.' },
      { who: 'silas', text: 'There is good land down by the water, if you are ready for it.' },
      { who: 'wendell', text: 'Hello, I’m Wendell, from the library. I’m planning a story-time picnic!' },
    ],
    goals: [
      { id: 'c7-land', text: 'Open the Duck Pond or the Riverside', hint: 'Press Build, then Land.', kind: 'land', area: 'pond|riverside' },
      { id: 'c7-ducks', text: 'Welcome 2 ducks', hint: 'Build a duck house, then tap it.', kind: 'animals', animal: 'duck', n: 2 },
      stat('c7-coop', 'Fill a co-op order with a neighbour', 'Open Town, then Neighbours. No hurry!', 'coops', 1),
      stat('c7-contract', 'Finish a whole contract', 'Send every basket for one contract. Open Town, then Contracts.', 'contracts-done', 1),
      stat('c7-helper', 'Let a helper send 15 baskets', 'Tap the farmhouse, then Helpers. Give someone the Deliveries job.', 'helper:deliveries', 15),
      stat('c7-picnic', 'Send Wendell the picnic', 'His order is on the board. Strawberries grow in spring and summer, or any time in a greenhouse.', 'story:wendell-picnic', 1),
    ],
    requests: [{ id: 'wendell-picnic', who: 'wendell', items: [{ id: 'strawberryjam', n: 2 }, { id: 'bread', n: 3 }], coins: 380, note: 'A picnic for story time at the library.' }],
    outro: [
      { who: 'wendell', text: 'The best picnic the library has ever had!' },
      { who: 'wendell', text: 'And I think Mrs. Penrose has some big news for you.' },
    ],
    reward: { coins: 400 },
  },
  {
    title: 'The Grand Harvest Fair',
    intro: [
      { who: 'penrose', text: 'Keeper! The town has voted. The Grand Harvest Fair is coming back!' },
      { who: 'penrose', text: 'There are four prizes: biggest produce, best-made goods, prettiest farm, and best new variety.' },
      { who: 'hattie', text: 'Make the farm beautiful, and grow your finest crops. You can do this!' },
    ],
    goals: [
      { id: 'c8-beauty', text: 'Make the farm Pretty (beauty 70)', hint: 'Build mode: paths, flowers, fences and decorations.', kind: 'beauty', n: 70 },
      { id: 'c8-hill', text: 'Open the Hilltop', hint: 'Press Build, then Land. You can see the whole valley from up there!', kind: 'land', area: 'hilltop' },
      stat('c8-stars', 'Pick or make 30 three-star things', 'Your best produce for the fair!', 'stars3', 30),
      stat('c8-made', 'Make 15 things for the fair', 'Keep your workshops busy. Every good thing helps!', 'made', 15),
      stat('c8-request', 'Send the fair supplies', 'Mrs. Penrose’s order is on the board.', 'story:penrose-fair', 1),
      { id: 'c8-fair', text: 'Hold the Grand Harvest Fair', hint: 'When everything else is done, open your goals and start the fair.', kind: 'grandFair' },
    ],
    requests: [{ id: 'penrose-fair', who: 'penrose', items: [{ id: 'cake', n: 2 }, { id: 'cheese', n: 2 }, { id: 'bread', n: 4 }], coins: 600, note: 'For the Grand Harvest Fair tables.' }],
    outro: [
      { who: 'penrose', text: 'What a fair! The whole of Larkford came out to see it.' },
      { who: 'hattie', text: 'The farm is wide awake again. Thank you, keeper.' },
      { who: 'silas', text: 'And there will be orders tomorrow, and the day after that!' },
    ],
    reward: { coins: 800, set: 'fair' },
  },
];

/** Who says what, by id (the cast lives in src/data/cast.ts). */
export const SPEAKERS: Record<string, string> = { hattie: 'Hattie', silas: 'Silas', tomasz: 'Tomasz', amara: 'Amara', wendell: 'Wendell', penrose: 'Mrs. Penrose', ingrid: 'Ingrid', femi: 'Femi', lu: 'Mr. Lu', rosa: 'Rosa', hollis: 'Mr. Hollis' };
