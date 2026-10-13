/**
 * Chapters 9–10: Frost Pass (Velour's grand tower, and her first spar), Frostfall, the Frostfall
 * Slopes and the Summit Beacon. Velour starts to see the fog, but needs time to think.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, shopScript, storySpar, trainerScript } from './common';

const VELOUR = 'Velour', PELL = 'Pell', YUKI = 'Yuki';

export const CH9: Record<string, Script> = {
  'pass-arrive': [say('Frost Pass. Brr! The snow crunches under your feet.'), { set: 'pass-arrive' }],
  'pass-hiker': [say('The frozen cave is slippery! On ice you slide until you bump into something. Stuck? Just reset.', 'Hiker Bo')],
  'trainer-agent-kit': trainerScript('agent-kit', 'Kit', 'Cold paws, warm hearts! Spar to warm up?', 'Toasty! That warmed me right up.', 'A Flare friend can melt ice walls. Bathlet loves warm puddles!'),
  'club-velour': storySpar({
    trainer: 'club-velour', who: VELOUR, flag: 'velour-1',
    before: [
      'Ah, the Field Agent. Welcome to the grandest tower in Sunreach!',
      'Hear it hum? Every Agentmon for miles will come to our show.',
      'Dot, Rudy and Mabel switched their towers off. They say the towers make the fog. I say: prove it! Spar with me!',
    ],
    win: ['Your friends follow you because they want to. Not because of a hum.'],
    lose: ['A win for the curator! But your friends never left your side. How interesting.'],
    after: [
      say('Look up, Velour. Even here, the fog pours out of the tower.'),
      say('I... I see it. But the show is my dream. I need time to think.', VELOUR),
      say('I will take the show somewhere higher. Somewhere above the fog.', VELOUR),
      say('Velour walks away into the snow. The tower keeps humming.'),
    ],
  }),

  'ff-arrive': [
    say('Frostfall, the town in the snow! The Summit Trial is up the Frostfall Slopes, north of town.'),
    { set: 'ff-arrive' },
    { quest: 'main', stage: 13 },
  ],
  'not-yet-ridge': [say('A cold wind howls from the east. Updraft Ridge can wait until the Summit Beacon shines.'), { walk: 'player', path: 'l' }],
  'ff-rook': [say('The stream on the slopes rushes too fast to paddle. A Frost friend can freeze a path. Hailroll and Scarfpaw live up there!', 'Agent Rook')],
  'ff-pet': [say('Scarfcub wraps its fluffy tail around you. So warm!')],
  'shop-frostfall': shopScript('frostfall'),

  'trainer-agent-yan': trainerScript('agent-yan', 'Yan', 'The slopes are slippery, but my friends are steady. Spar?', 'Whoa! You slid right past me!', 'Hailstones grow in layers. So does Hailroll!'),
  'summit-hall': [
    say('Welcome to the Summit Trial! I am Pell.', PELL),
    say('The floors are icy. Once you start sliding, you keep going until you bump into something.', PELL),
    say('Plan each slide. If you get stuck, press Reset!', PELL),
    { set: 'summit-hall' },
  ],
  'trainer-summit-helper': trainerScript('summit-helper', PELL, 'A frosty warm-up spar?', 'Cool moves! Yuki is waiting at the top.', 'Rocks are great for stopping a slide!'),
  'keeper-yuki': keeperScript({
    trainer: 'keeper-yuki', who: YUKI, beacon: 'beacon-summit',
    hello: [
      'You slid all the way to the top! I am Yuki, the Summit Keeper.',
      'From up here you can see four Beacons shining. Let\'s make it five!',
    ],
    win: [
      'The Summit Beacon sparkles like fresh snow!',
      'Only one Beacon is left, on the Sky Island, far above the clouds.',
      'Updraft Ridge is east of Frostfall. A Gust friend can ride the updrafts up!',
    ],
    gift: { item: 'frost-mint', n: 3, line: 'Frost Mints! A Frost friend\'s favorite.' },
    quest: 14,
    after: 'Updraft Ridge is east of Frostfall. Ride the updrafts with a Gust friend!',
  }),
};
