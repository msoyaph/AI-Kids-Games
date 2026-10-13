/**
 * Chapters 3–4: the Cliff Road (Juno's second spar), the forest town of Mossgrove, Mossgrove
 * Woods and the Canopy Beacon. Elder Fen first tells the old story of the guardian of the sky lights.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, shopScript, storySpar, trainerScript } from './common';

const JUNO = 'Juno', OREN = 'Oren', TILLY = 'Tilly';

export const CH3: Record<string, Script> = {
  'trainer-agent-rafi': trainerScript('agent-rafi', 'Rafi', 'The wind up here is wild! Want a windy spar?', 'Whoosh! You blew me away.', 'Zestle loves a sour snack. Funny, right?'),
  'trainer-agent-lou': trainerScript('agent-lou', 'Lou', 'I am watching the river. Spar with me while I wait?', 'Good spar! The river sounds happy today.', 'Stone friends can shove big boulders. Try it near the rocks!'),
  'juno-cliff': storySpar({
    trainer: 'juno-2', who: JUNO, flag: 'juno-2',
    before: [
      '{player}! These vines are in my way. I was going to be first to Mossgrove!',
      'Well, since you are here... Let\'s spar! Winner goes first!',
    ],
    win: ['Wow. You and {partner} are a real team.', 'Okay, you go first. But I am right behind you!'],
    lose: ['I won! Ha! But you were really close.'],
    after: [say('A Leaf friend can snip those vines. See you in Mossgrove!', JUNO)],
  }),

  'moss-arrive': [
    say('Mossgrove, the forest town. Treehouses peek out between the pines.'),
    say('The Canopy Trial is in Mossgrove Woods, east of town.'),
    { set: 'moss-arrive' },
    { quest: 'main', stage: 6 },
  ],
  'not-yet-whisper': [
    say('The path north goes deep into Whisper Woods. The Canopy Beacon should come first!'),
    { walk: 'player', path: 'd' },
  ],
  'moss-fen': [
    say('Long ago, a great guardian painted the sky with soft, glowing lights.', 'Elder Fen'),
    say('It left the six Beacons so Sunreach would stay bright and calm. Some say it still watches from the clouds.', 'Elder Fen'),
  ],
  'moss-oak': [
    say('I carve little wooden Agentmon. This one is a Snipsy!', 'Mr. Oak'),
    say('Did you know? Real leafcutter ants do not eat the leaves. They grow a tiny garden of fungus on them!', 'Mr. Oak'),
  ],
  'moss-sky': [say('Whisper Woods has a dark cave. A Glow friend can light the way. Gleamgrub lives in Mossgrove Woods!', 'Agent Sky')],
  'moss-pet': [say('Kernip hops in a happy little circle.')],
  'shop-mossgrove': shopScript('mossgrove'),

  'trainer-agent-ivo': trainerScript('agent-ivo', 'Ivo', 'The woods are my favorite place to spar. Ready?', 'You are as quick as a Hummet!', 'Gleamgrub glows in the dark. Perfect for caves!'),
  'canopy-hall': [
    say('Welcome to the Canopy Trial! I am Tilly.', TILLY),
    say('Step on a colored switch to open the gates of the same color. Each color has its own shape, too.', TILLY),
    say('Vines in the way? In the Trial, Oren\'s helpers lend you a Leaf friend. Just face them and press A!', TILLY),
    { set: 'canopy-hall' },
  ],
  'trainer-canopy-helper': trainerScript('canopy-helper', TILLY, 'A warm-up spar before you climb?', 'You are ready for Oren!', 'Up the stairs and into the treetops. Good luck!'),
  'keeper-oren': keeperScript({
    trainer: 'keeper-oren', who: OREN, beacon: 'beacon-canopy',
    hello: [
      'You climbed my Canopy! I am Oren, the Canopy Keeper.',
      'From up here, you can see the whole forest. See the fog drifting in from the north?',
      'Let\'s make a happy spark together and wake up this Beacon!',
    ],
    win: [
      'The Canopy Beacon shines again! Look how the leaves sparkle.',
      'That fog comes from Whisper Woods, north of Mossgrove. Will you go and look?',
    ],
    gift: { item: 'big-pep-berry', n: 2, line: 'Take these Big Pep Berries. Tired friends love them.' },
    quest: 7,
    after: 'The forest feels calm again. Whisper Woods is north of Mossgrove.',
  }),
};
