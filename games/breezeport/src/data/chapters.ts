/**
 * The story: nine chapters from a sleepy harbour town to the Bay Festival. Each chapter has a few
 * lines of dialogue, a list of goals (some are requests from the townsfolk), what it opens, and a
 * thank-you. Every line is short and plain (tests/unit/readability.test.ts keeps them at grade 7 or
 * below). Numbers here are the pacing; the playthrough bot checks them (tests/sim/pacing.test.ts).
 */
import type { AreaId } from '../sim/map';
import type { ServiceKind } from './things';

export type ProjectId = 'lighthouse' | 'clocktower' | 'pier';

/** Town projects: big things the whole town chips in for, funded at City Hall. */
export const PROJECTS: Record<ProjectId, { name: string; cost: number; text: string }> = {
  lighthouse: { name: 'Relight the lighthouse', cost: 300, text: 'Fix the old lamp so the lighthouse shines over the bay again every night.' },
  clocktower: { name: 'A clock for City Hall', cost: 500, text: 'Put a big clock in City Hall’s tower, so everyone knows when the bus comes.' },
  pier: { name: 'Mend the harbour pier', cost: 980, text: 'Mend the old pier so Captain Noor’s ferry can bring visitors across the bay.' },
};

export type Goal = { id: string; text: string; who?: string; hint?: string } & (
  | { kind: 'stat'; stat: string; n: number }
  | { kind: 'pop'; n: number }
  | { kind: 'happy'; n: number }
  | { kind: 'count'; cls?: string; def?: string; defs?: string[]; level?: number; n: number }
  | { kind: 'cover'; service: ServiceKind; pct: number }
  | { kind: 'project'; project: ProjectId }
  | { kind: 'lanes'; lane: 'bike' | 'tram'; n: number }
  | { kind: 'eco'; n: number }
  | { kind: 'flag'; flag: string }
  | { kind: 'routes'; n: number }
  | { kind: 'jams'; max: number; minPop: number }
);

export interface Line { who: string; text: string }

export interface Chapter {
  title: string;
  intro: Line[];
  goals: Goal[];
  outro: Line[];
  /** Land that opens when the chapter starts. */
  opens?: AreaId;
  reward: number;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    title: 'The Junior Mayor',
    intro: [
      { who: 'marisol', text: 'Hello, Junior Mayor! I’m Marisol, the city planner. Welcome to Breezeport!' },
      { who: 'marisol', text: 'Our little harbour town has gone very quiet. Let’s wake it up together.' },
      { who: 'marisol', text: 'Towns grow along roads. Pick Roads and drag along the grid to draw a street.' },
    ],
    goals: [
      { id: 'c0-road', kind: 'stat', stat: 'road', n: 8, text: 'Draw a new street', hint: 'Pick Roads, then drag along the grass beside Main Street.' },
      { id: 'c0-zone', kind: 'stat', stat: 'zone-1', n: 8, text: 'Zone 8 tiles for homes', hint: 'Pick Zones, then Homes, and drag a rectangle beside your street.' },
      { id: 'c0-family', kind: 'stat', stat: 'built-home', n: 1, text: 'Welcome the first family', hint: 'Homes grow on zoned lots beside a road. Wait a moment and watch!' },
      { id: 'c0-shopzone', kind: 'stat', stat: 'zone-2', n: 4, text: 'Zone some shops', hint: 'Pick Zones, then Shops. People like a shop near home.' },
      { id: 'c0-shop', kind: 'count', cls: 'shop', n: 1, text: 'Open the first shop' },
      { id: 'c0-collect', kind: 'stat', stat: 'collected', n: 5, text: 'Collect coins from a shop', hint: 'When a coin bubble floats over a shop, tap it!' },
    ],
    outro: [
      { who: 'marisol', text: 'Look at that: people are moving in, and the shop is busy!' },
      { who: 'marisol', text: 'Homes pay a little to the town, and shops fill coin bubbles. That’s our budget.' },
      { who: 'marisol', text: 'And now Creative mode is open too, for building anything you dream up, with no limits.' },
    ],
    reward: 500,
  },
  {
    title: 'Main Street',
    intro: [
      { who: 'rania', text: 'Hi, Mayor! I’m Rania. I want to open a café on Main Street, but it needs a lively street first.' },
      { who: 'teodor', text: 'And I’m Teodor. I’ve kept the old lighthouse for fifty years. Its lamp went dark long ago.' },
      { who: 'marisol', text: 'Parks are open now. Green streets make people happy, and happy homes grow bigger.' },
    ],
    goals: [
      { id: 'c1-pop', kind: 'pop', n: 85, text: 'Grow to 85 people' },
      { id: 'c1-grow', kind: 'count', cls: 'home', level: 2, n: 3, text: 'Help 3 homes grow bigger', hint: 'Happy homes grow bigger. Tap a home to see what it wishes for.' },
      { id: 'c1-shops', kind: 'count', cls: 'shop', n: 3, text: 'Have 3 shops', who: 'rania' },
      { id: 'c1-trees', kind: 'stat', stat: 'placed-tree', n: 6, text: 'Plant 6 trees', hint: 'Pick Parks and choose a tree. Trees make streets shady and cool.' },
      { id: 'c1-play', kind: 'count', defs: ['playground', 'fountain'], n: 1, text: 'Build a playground or a fountain', who: 'rania' },
      { id: 'c1-happy', kind: 'happy', n: 68, text: 'Make the town 68% happy', hint: 'Tap a home to see what would help it. Trees and shops nearby help a lot.' },
      { id: 'c1-light', kind: 'project', project: 'lighthouse', text: 'Relight the lighthouse', who: 'teodor', hint: 'Open City Hall and fund the lighthouse project.' },
    ],
    outro: [
      { who: 'teodor', text: 'The lighthouse is shining again! Ships can see Breezeport from far away.' },
      { who: 'marisol', text: 'You’re a natural, Mayor. Main Street is buzzing.' },
    ],
    reward: 700,
  },
  {
    title: 'School Bells',
    intro: [
      { who: 'abernathy', text: 'Good morning, Mayor. I’m Mr. Abernathy. Our families need a school and a library!' },
      { who: 'marisol', text: 'Services cover a circle around them. Homes inside the circle are happier.' },
      { who: 'marisol', text: 'Families need jobs too. Workplaces are open now: zone some near your homes.' },
    ],
    goals: [
      { id: 'c2-school', kind: 'count', def: 'school', n: 1, text: 'Build a school', who: 'abernathy' },
      { id: 'c2-library', kind: 'count', def: 'library', n: 1, text: 'Build a library', who: 'abernathy' },
      { id: 'c2-work', kind: 'count', cls: 'work', n: 3, text: 'Have 3 workplaces', hint: 'Zone workplaces on a road that joins your homes.' },
      { id: 'c2-pop', kind: 'pop', n: 150, text: 'Grow to 150 people' },
      { id: 'c2-grow', kind: 'count', cls: 'home', level: 2, n: 9, text: 'Help 9 homes grow bigger' },
      { id: 'c2-cover', kind: 'cover', service: 'school', pct: 60, text: 'Reach 6 in 10 homes with a school', hint: 'Open Maps and pick School to see where its circle reaches.' },
      { id: 'c2-maps', kind: 'flag', flag: 'openedMaps', text: 'Look at the town’s maps', hint: 'Pick Maps on the tool bar.' },
    ],
    outro: [
      { who: 'abernathy', text: 'The school bell is ringing, and the library is full of readers. Splendid!' },
      { who: 'marisol', text: 'Maps show where people are happy and where they need help. They’re a mayor’s best friend.' },
    ],
    reward: 750,
  },
  {
    title: 'Busy Streets',
    intro: [
      { who: 'kofi', text: 'Hey there, Mayor! Kofi here. The streets are getting busy. Want a bus?' },
      { who: 'marisol', text: 'Put bus stops beside the roads, then make a route through them. Fewer cars, calmer streets.' },
      { who: 'ozzie', text: 'Hi! I’m Ozzie. Can we have a skate park? Please, please, please?' },
    ],
    goals: [
      { id: 'c3-stops', kind: 'count', def: 'busstop', n: 5, text: 'Build 5 bus stops', who: 'kofi' },
      { id: 'c3-route', kind: 'routes', n: 2, text: 'Start 2 bus routes', who: 'kofi', hint: 'In Transit, tap New bus route, then tap your stops in order.' },
      { id: 'c3-pop', kind: 'pop', n: 175, text: 'Grow to 175 people' },
      { id: 'c3-grow', kind: 'count', cls: 'home', level: 2, n: 20, text: 'Help 20 homes grow bigger' },
      { id: 'c3-skate', kind: 'count', def: 'skatepark', n: 1, text: 'Build a skate park', who: 'ozzie' },
      { id: 'c3-clock', kind: 'project', project: 'clocktower', text: 'Put a clock on City Hall', hint: 'Fund it at City Hall.' },
      { id: 'c3-jams', kind: 'jams', max: 3, minPop: 150, text: 'Keep traffic jams to 3 or fewer', hint: 'Open Maps and pick Traffic. Add a road or a bus route where it’s red.' },
    ],
    outro: [
      { who: 'kofi', text: 'Beep beep! The bus is full of happy riders. Thanks, Mayor!' },
      { who: 'ozzie', text: 'The skate park is AMAZING. I did a kickflip! Well, almost.' },
    ],
    reward: 700,
  },
  {
    title: 'Maple Row',
    opens: 'maple',
    intro: [
      { who: 'marisol', text: 'More families want to live here! The land of Maple Row is yours to plan now.' },
      { who: 'lin', text: 'I’m Dr. Lin. A clinic would help everyone stay well.' },
      { who: 'dalia', text: 'Chief Dalia, safety crew. We check smoke alarms and teach bike safety. We need a station!' },
    ],
    goals: [
      { id: 'c4-clinic', kind: 'count', def: 'clinic', n: 1, text: 'Build a clinic', who: 'lin' },
      { id: 'c4-safety', kind: 'count', def: 'safety', n: 1, text: 'Build a safety station', who: 'dalia' },
      { id: 'c4-community', kind: 'count', def: 'community', n: 1, text: 'Build a community center' },
      { id: 'c4-pop', kind: 'pop', n: 380, text: 'Grow to 380 people' },
      { id: 'c4-level', kind: 'count', cls: 'home', level: 2, n: 8, text: 'Have 8 homes grow bigger', hint: 'Homes grow bigger when they’re happy. Tap one to see what it needs.' },
      { id: 'c4-hall', kind: 'flag', flag: 'openedCityHall', text: 'Check the budget at City Hall', hint: 'Pick City Hall on the tool bar.' },
    ],
    outro: [
      { who: 'lin', text: 'The clinic is open, and everyone is feeling great.' },
      { who: 'marisol', text: 'Maple Row is a real neighbourhood now. See how the budget pays for it all?' },
    ],
    reward: 500,
  },
  {
    title: 'Greenway',
    opens: 'greenway',
    intro: [
      { who: 'gemma', text: 'I’m Gemma! Let’s make Breezeport the greenest town on the coast.' },
      { who: 'gemma', text: 'Trees, parks, solar roofs, recycling and bike lanes all help. Watch the eco leaves at City Hall.' },
    ],
    goals: [
      { id: 'c5-recycle', kind: 'count', def: 'recycling', n: 1, text: 'Build a recycling center', who: 'gemma' },
      { id: 'c5-solar', kind: 'stat', stat: 'solar', n: 8, text: 'Put solar panels on 8 roofs', who: 'gemma', hint: 'Tap a home, shop or workplace and add solar panels.' },
      { id: 'c5-bike', kind: 'lanes', lane: 'bike', n: 16, text: 'Paint 16 tiles of bike lane', hint: 'In Roads, pick Bike lane and drag along a road.' },
      { id: 'c5-trees', kind: 'stat', stat: 'placed-tree', n: 30, text: 'Plant 30 trees in all' },
      { id: 'c5-glass', kind: 'count', def: 'glasshouse', n: 1, text: 'Build the glasshouse', who: 'gemma' },
      { id: 'c5-eco', kind: 'eco', n: 3, text: 'Reach 3 eco leaves' },
      { id: 'c5-pop', kind: 'pop', n: 540, text: 'Grow to 540 people' },
    ],
    outro: [
      { who: 'gemma', text: 'Three leaves! The air smells like flowers and the sea. You did it!' },
    ],
    reward: 600,
  },
  {
    title: 'Seaside Boardwalk',
    opens: 'boardwalk',
    intro: [
      { who: 'noor', text: 'Ahoy, Mayor! Captain Noor here. My ferry could bring visitors, if the old pier were mended.' },
      { who: 'marisol', text: 'The sunny shore is open now. Let’s make it the place everyone wants to visit.' },
    ],
    goals: [
      { id: 'c6-pier', kind: 'project', project: 'pier', text: 'Mend the harbour pier', who: 'noor' },
      { id: 'c6-aquarium', kind: 'count', def: 'aquarium', n: 1, text: 'Build the aquarium' },
      { id: 'c6-ferris', kind: 'count', def: 'ferris', n: 1, text: 'Build the Ferris wheel' },
      { id: 'c6-pop', kind: 'pop', n: 720, text: 'Grow to 720 people' },
      { id: 'c6-happy', kind: 'happy', n: 78, text: 'Make the town 78% happy' },
    ],
    outro: [
      { who: 'noor', text: 'The ferry is full of visitors! They love the aquarium and the big wheel.' },
    ],
    reward: 700,
  },
  {
    title: 'Hilltop Tram',
    opens: 'hilltop',
    intro: [
      { who: 'marisol', text: 'Up by the hills there’s room for a new neighbourhood, and a tram to get there.' },
      { who: 'marisol', text: 'A tram carries lots of people at once. Lay tracks along a road, and add tram stops.' },
    ],
    goals: [
      { id: 'c7-tracks', kind: 'lanes', lane: 'tram', n: 24, text: 'Lay 24 tiles of tram track' },
      { id: 'c7-stops', kind: 'count', def: 'tramstop', n: 4, text: 'Build 4 tram stops' },
      { id: 'c7-obs', kind: 'count', def: 'observatory', n: 1, text: 'Build the observatory' },
      { id: 'c7-pop', kind: 'pop', n: 850, text: 'Grow to 850 people' },
      { id: 'c7-tall', kind: 'count', cls: 'home', level: 3, n: 5, text: 'Have 5 blocks of flats', hint: 'Homes grow into flats when they’re very happy, with a school and a clinic nearby.' },
    ],
    outro: [
      { who: 'marisol', text: 'Ding ding! The tram climbs the hill, and the observatory is ready for the stars.' },
    ],
    reward: 800,
  },
  {
    title: 'The Bay Festival',
    intro: [
      { who: 'pearl', text: 'Mayor! I’m Auntie Pearl. The Bay Festival hasn’t happened in years. Let’s bring it back!' },
      { who: 'pearl', text: 'We need a stage, a happy town and flowers everywhere.' },
    ],
    goals: [
      { id: 'c8-stage', kind: 'count', def: 'stage', n: 1, text: 'Build the festival stage', who: 'pearl' },
      { id: 'c8-flowers', kind: 'stat', stat: 'placed-flowerbed', n: 10, text: 'Plant 10 flower beds', who: 'pearl' },
      { id: 'c8-pop', kind: 'pop', n: 1100, text: 'Grow to 1,100 people' },
      { id: 'c8-happy', kind: 'happy', n: 80, text: 'Make the town 80% happy' },
      { id: 'c8-clinic', kind: 'cover', service: 'clinic', pct: 70, text: 'Reach 7 in 10 homes with a clinic' },
    ],
    outro: [
      { who: 'pearl', text: 'Lanterns, kites, music and the whole bay dancing. The Bay Festival is back!' },
      { who: 'marisol', text: 'You did it, Mayor. Breezeport is lively and happy again. Thank you!' },
    ],
    reward: 1000,
  },
];
