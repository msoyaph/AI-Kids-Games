/**
 * The story: Larkford's community farm has been asleep since its old keeper, Hattie, retired, and the
 * town's Harvest Fair stopped with it. You are the new keeper. Over eight chapters (about two years
 * of farm seasons) you wake the farm up, meet the town and the neighbours, and bring back the Grand
 * Harvest Fair. After the credits, the farm goes on forever, with new goals.
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
    title: 'A Sleepy Farm',
    intro: [
      { who: 'hattie', text: 'Hello there! You must be the new keeper. I’m Hattie.' },
      { who: 'hattie', text: 'I looked after this farm for the town for forty years.' },
      { who: 'hattie', text: 'Then I retired to keep bees, and the farm fell asleep.' },
      { who: 'hattie', text: 'Larkford used to hold a Harvest Fair every autumn. It stopped when the farm went quiet.' },
      { who: 'hattie', text: 'Shall we wake it up together? Let’s start small.' },
    ],
    goals: [
      stat('c1-clear', 'Clear 5 bits of old clutter', 'Tap weeds, stones and logs with the Farm tool.', 'cleared', 5),
      stat('c1-plant', 'Plant 4 fields', 'Tap an empty field and choose some seeds.', 'planted', 4),
      stat('c1-water', 'Water a growing crop', 'Choose Water, then tap a crop that is growing.', 'watered', 1),
      stat('c1-pick', 'Pick 10 crops', 'Ripe crops look ready. Tap them, or drag along a row.', 'harvest', 10),
      stat('c1-sell', 'Sell something in the barn', 'Open the Barn and press Sell.', 'sold', 1),
    ],
    requests: [],
    outro: [
      { who: 'hattie', text: 'Look at that! The fields are waking up.' },
      { who: 'hattie', text: 'Silas will come by soon with his boat. Orders from town, I expect!' },
    ],
    reward: { coins: 100 },
  },
  {
    title: 'The Little Lark',
    intro: [
      { who: 'silas', text: 'Ahoy, keeper! I’m Silas. I sail the Little Lark down to Larkford.' },
      { who: 'silas', text: 'The town has missed this farm. Look, there are orders on the board already!' },
      { who: 'silas', text: 'Fill an order, and I’ll carry it to town for you.' },
    ],
    goals: [
      stat('c2-orders', 'Deliver 3 orders', 'Tap the board by the dock, then press Deliver.', 'orders', 3),
      { id: 'c2-level', text: 'Reach farm level 3', hint: 'Everything you do on the farm helps you level up.', kind: 'level', n: 3 },
      have('c2-coop', 'Build a chicken coop', 'Open the Shop and choose the Chicken Coop.', 'coop'),
      { id: 'c2-hens', text: 'Welcome 2 chickens', hint: 'Tap the coop and press New chicken.', kind: 'animals', animal: 'chicken', n: 2 },
      stat('c2-eggs', 'Collect 3 eggs', 'When an egg sign floats over the coop, tap it.', 'collect:egg', 3),
    ],
    requests: [],
    outro: [
      { who: 'silas', text: 'The whole town is talking about your eggs!' },
      { who: 'silas', text: 'And I know a baker who would love to meet you.' },
    ],
    reward: { coins: 150 },
  },
  {
    title: 'Flour Power',
    intro: [
      { who: 'tomasz', text: 'Good morning! I’m Tomasz, the baker.' },
      { who: 'tomasz', text: 'The farm used to send me flour every week. My ovens miss it!' },
      { who: 'tomasz', text: 'Could you build a windmill and send me some flour?' },
    ],
    goals: [
      have('c3-mill', 'Build the windmill', 'Open the Shop, then Workshops.', 'mill'),
      stat('c3-flour', 'Make 4 flour', 'Tap the windmill, then Make. Wheat goes in, flour comes out.', 'made:flour', 4),
      stat('c3-request', 'Send Tomasz his flour', 'His order is on the board by the dock.', 'story:tomasz-flour', 1),
      { id: 'c3-meadow', text: 'Open the Sunny Meadow', hint: 'Press Build, then Land.', kind: 'land', area: 'meadow' },
      stat('c3-plough', 'Plough 4 new fields', 'Choose the Plough and tap open ground.', 'ploughed', 4),
    ],
    requests: [{ id: 'tomasz-flour', who: 'tomasz', items: [{ id: 'flour', n: 3 }], coins: 120, note: 'For the first farm bread in years!' }],
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
      { who: 'hattie', text: 'Put a hive near flowering crops, and watch what happens.' },
      { who: 'hattie', text: 'Water, compost, and a change of crop help too. Let’s aim for three stars!' },
    ],
    goals: [
      have('c4-hive', 'Set up a beehive', 'Open the Shop and choose the Beehive.', 'beehive'),
      stat('c4-honey', 'Collect 2 jars of honey', 'Tap the hive when a honey sign floats over it.', 'collect:honey', 2),
      stat('c4-rotate', 'Rotate crops 3 times', 'Plant a different kind of crop where something else just grew.', 'rotation', 3),
      stat('c4-stars', 'Pick 6 three-star crops', 'Care makes stars: water, compost, rotation, and bees.', 'stars3', 6),
      have('c4-bakery', 'Build the bakery', 'Open the Shop, then Workshops.', 'bakery'),
      stat('c4-bread', 'Bake 2 loaves of bread', 'Tap the bakery. Bread needs flour.', 'made:bread', 2),
    ],
    requests: [],
    outro: [
      { who: 'hattie', text: 'Three stars! My old bees would be proud of you.' },
      { who: 'hattie', text: 'Here is my Garden Set. A farm should be pretty as well as busy.' },
      { who: 'hattie', text: 'Oh, and your neighbours are coming to say hello.' },
    ],
    reward: { coins: 250, set: 'garden' },
  },
  {
    title: 'Good Neighbours',
    intro: [
      { who: 'ingrid', text: 'Hello! I’m Ingrid, from Plumridge Orchard up the river.' },
      { who: 'femi', text: 'And I’m Femi, from Nannyberry Farm. We have goats. So many goats!' },
      { who: 'lu', text: 'I am Lu, from Reedmere. Welcome, neighbour.' },
      { who: 'ingrid', text: 'We help each other here. Let’s swap things now and then.' },
      { who: 'femi', text: 'And the town fair is back this season. You should enter!' },
    ],
    goals: [
      stat('c5-trade', 'Swap with neighbours 3 times', 'Open Town, then Neighbours.', 'trades', 3),
      stat('c5-coop', 'Fill a co-op order', 'Start one in Town, then Neighbours. No hurry!', 'coops', 1),
      have('c5-barn', 'Build a cow barn', 'Open the Shop and choose the Cow Barn.', 'cowbarn'),
      { id: 'c5-cows', text: 'Welcome 2 cows', hint: 'Tap the cow barn and press New cow.', kind: 'animals', animal: 'cow', n: 2 },
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
    title: 'Warm Hands',
    intro: [
      { who: 'amara', text: 'Hello! I’m Amara. I cook at the school in Larkford.' },
      { who: 'amara', text: 'Winter is coming, and the children need warm scarves.' },
      { who: 'amara', text: 'Do you think some sheep could help?' },
    ],
    goals: [
      have('c6-shed', 'Build a sheep shed', 'Open the Shop and choose the Sheep Shed.', 'sheepshed'),
      { id: 'c6-sheep', text: 'Welcome 3 sheep', hint: 'Tap the sheep shed and press New sheep.', kind: 'animals', animal: 'sheep', n: 3 },
      have('c6-loom', 'Build the loom house', 'Open the Shop, then Workshops.', 'loom'),
      stat('c6-yarn', 'Spin 3 yarn', 'Tap the loom house. Yarn needs wool.', 'made:yarn', 3),
      stat('c6-request', 'Send the school its scarves', 'Amara’s order is on the board.', 'story:amara-scarves', 1),
    ],
    requests: [{ id: 'amara-scarves', who: 'amara', items: [{ id: 'scarf', n: 2 }], coins: 260, note: 'Warm scarves for the school children.' }],
    outro: [
      { who: 'amara', text: 'The children love them! Look at all the colours.' },
      { who: 'amara', text: 'Here is a little Winter Set to say thank you.' },
    ],
    reward: { coins: 350, set: 'winter' },
  },
  {
    title: 'Orchard Hill',
    intro: [
      { who: 'wendell', text: 'Hello, I’m Wendell, from the library.' },
      { who: 'wendell', text: 'An old book says this farm once had the finest orchard in the valley.' },
      { who: 'wendell', text: 'Shall we plant it again? I’m planning a story-time picnic.' },
    ],
    goals: [
      { id: 'c7-land', text: 'Open Orchard Hill', hint: 'Press Build, then Land.', kind: 'land', area: 'orchard' },
      { id: 'c7-trees', text: 'Plant 4 fruit trees or bushes', hint: 'Open the Shop, then Orchard.', kind: 'trees', n: 4 },
      have('c7-jam', 'Build the jam kitchen', 'Open the Shop, then Workshops.', 'jamkitchen'),
      stat('c7-made', 'Make 10 things in your workshops', 'Any workshop counts.', 'made', 10),
      stat('c7-request', 'Send Wendell the picnic', 'His order is on the board.', 'story:wendell-picnic', 1),
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
      { who: 'penrose', text: 'Everyone will bring their very best. The farm will be the heart of it.' },
      { who: 'hattie', text: 'Make the farm beautiful, and grow your finest crops. You can do this!' },
    ],
    goals: [
      { id: 'c8-beauty', text: 'Make the farm Pretty (beauty 70)', hint: 'Build mode: paths, flowers, fences and decorations.', kind: 'beauty', n: 70 },
      { id: 'c8-land', text: 'Open the Duck Pond or the Riverside', hint: 'Press Build, then Land.', kind: 'land', area: 'pond|riverside' },
      stat('c8-stars', 'Pick or make 20 three-star things', 'Your best produce for the fair!', 'stars3', 20),
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
export const SPEAKERS: Record<string, string> = { hattie: 'Hattie', silas: 'Silas', tomasz: 'Tomasz', amara: 'Amara', wendell: 'Wendell', penrose: 'Mrs. Penrose', ingrid: 'Ingrid', femi: 'Femi', lu: 'Mr. Lu' };
