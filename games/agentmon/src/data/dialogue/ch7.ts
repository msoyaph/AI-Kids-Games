/**
 * Chapters 7–8: the Canyon Trail (Juno spars as a friend now), Dunehollow, the Dune Flats (Mabel
 * and Juno switch off a tower together), the Redrock Beacon, and Velour, the club's curator.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, shopScript, storySpar, trainerScript } from './common';

const JUNO = 'Juno', MABEL = 'Mabel', RIO = 'Rio', SOL = 'Sol', VELOUR = 'Velour';

export const CH7: Record<string, Script> = {
  'trainer-agent-noa': trainerScript('agent-noa', 'Noa', 'The canyon echoes! Spar, spar, spar! Want to?', 'Great spar! Great spar! Great spar!', 'Whirrbird can fly backwards. So can real hummingbirds!'),
  'juno-canyon': storySpar({
    trainer: 'juno-3', who: JUNO, flag: 'juno-3',
    before: [
      '{player}! I have been training hard since Cragtop.',
      'No more racing. Let\'s spar to get stronger together!',
    ],
    win: ['Great spar! We both got better.'],
    lose: ['Good spar! We both got better.'],
    after: [say('I will go ahead and look for the Spotlight Club\'s tower on the Dune Flats. See you there, partner!', JUNO)],
  }),

  'dune-arrive': [
    say('Dunehollow, the desert town! The Redrock Trial is south, on the Dune Flats.'),
    { set: 'dune-arrive' },
    { quest: 'main', stage: 11 },
  ],
  'not-yet-frost': [say('The path north climbs to icy Frost Pass. Help the Redrock Beacon first!'), { walk: 'player', path: 'd' }],
  'dune-amar': [
    say('They say a giant made of sandstone sleeps by the great arch on the Dune Flats.', 'Old Amar'),
    say('When every Beacon shines again, maybe it will wake up.', 'Old Amar'),
  ],
  'dune-pet': [say('Bathlet adjusts its tiny towel and sighs happily.')],
  'shop-dunehollow': shopScript('dunehollow'),
  'velour-dune': [
    say('So you are the Field Agent everyone talks about. I am Velour, curator of the Spotlight Club.', VELOUR),
    say('Dot and Mabel say our towers make the fog. Nonsense! The towers bring Agentmon to the most beautiful show in Sunreach.', VELOUR),
    say('Our grandest tower stands at Frost Pass. Come and see it, if you dare.', VELOUR),
    { set: 'velour-dune' },
  ],

  'club-mabel': [
    { if: 'mabel-met', then: [say('Thank you for showing me. The desert looks so clear now.', MABEL)], else: storySpar({
      trainer: 'club-mabel', who: MABEL, flag: 'mabel-met',
      before: [
        'Welcome to the Dune Flats stop of the Spotlight Club!',
        'Our tower hums all day, so Agentmon come and see our show.',
        'Dot keeps saying it makes fog. Let\'s spar, and I will show you it is just fine!',
      ],
      win: ['Hmm. Your friends spar happily with you, and you never needed a tower.'],
      lose: ['See? A win for the Spotlight Club!'],
      after: [
        say('Juno runs up, out of breath.'),
        say('Mabel, look up! The fog is pouring out of the top of your tower.', JUNO),
        say('Oh. Oh no. You are right. I will switch it off.', MABEL),
        { set: 'dunes-tower-off' },
        say('Mabel switches the tower off. The air clears a little.'),
        say('Nice teamwork, {player}! Now go wake up that Beacon.', JUNO),
      ],
    }) },
  ],
  'flats-rami': [say('Stay on the path and rest in the shade. The Redrock Trial is inside the red mesa.', 'Guide Rami')],

  'sunstone-hall': [
    say('Welcome to the Redrock Trial! I am Rio.', RIO),
    say('This Trial is all about light. Beams bounce off mirrors. Turn a purple-stand mirror by facing it and pressing A.', RIO),
    say('Light up every crystal to open the door!', RIO),
    { set: 'sunstone-hall' },
  ],
  'trainer-sunstone-helper': trainerScript('sunstone-helper', RIO, 'A sunny warm-up spar?', 'Bright work! Sol is waiting at the top.', 'Mirrors bounce light at right angles. Think like a beam!'),
  'keeper-sol': keeperScript({
    trainer: 'keeper-sol', who: SOL, beacon: 'beacon-sunstone',
    hello: [
      'You found your way through the sunbeams! I am Sol, the Redrock Keeper.',
      'The fog has dimmed even the desert sun. Let\'s make a spark so bright, the stars can see it!',
      'Many of my friends are Flare Agentmon. Tip: Tide and Stone moves are super strong against them!',
    ],
    win: [
      'The Redrock Beacon blazes again! Look how the sand sparkles.',
      'Next is Frostfall, high in the icy mountains. Take Frost Pass, north of Dunehollow. Bundle up!',
      'Ice walls block the pass. A Flare friend can melt them with a warm glow.',
    ],
    gift: { item: 'sun-pepper', n: 3, line: 'Sun Peppers! Spicy, and a Flare friend\'s favorite.' },
    quest: 12,
    after: 'Frost Pass is north of Dunehollow. A Flare friend can melt the ice walls!',
  }),
};
