/**
 * Chapter 2: Saltwhistle, Sandy Shore and the Lighthouse Beacon. The Spotlight Club appears for the
 * first time (Pip and the humming tower); nobody knows yet that the towers make the static fog.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, shopScript, trainerScript } from './common';

const MARISOL = 'Marisol', JUNO = 'Juno', FINCH = 'Finch', PIP = 'Pip';

export const CH2: Record<string, Script> = {
  'salt-arrive': [
    say('Saltwhistle! You can hear the wind whistle over the waves.'),
    say('The Lighthouse is east, on Sandy Shore. Keeper Marisol should be there.'),
    { set: 'salt-arrive' },
    { quest: 'main', stage: 3 },
  ],
  'not-yet-west': [
    say('The Cliff Road is steep and windy. Help the Lighthouse Beacon first!'),
    { walk: 'player', path: 'r' },
  ],
  'salt-lin': [say('Field Agent tip: a tired wild Agentmon is easier to befriend. Its favorite snack helps a lot!', 'Agent Lin')],
  'salt-pet': [say('Lullakin blows a happy bubble at you. Pop!')],
  'juno-salt': [
    say('{player}! You relit the Beacon? Wow. I mean, I was busy filling my Field Guide.', JUNO),
    say('The next Beacon is mine! See you on the Cliff Road!', JUNO),
    { set: 'juno-salt' },
  ],
  'shop-saltwhistle': shopScript('saltwhistle'),

  'shore-finch': [
    say('Hi! I am Finch. I help Keeper Marisol at the Lighthouse.', FINCH),
    say('The Lighthouse is on that little island. You need a Tide friend to paddle across.', FINCH),
    say('Lullakin and Dewpud love this beach. Spar with one until it is tired, then make friends!', FINCH),
    say('See you inside!', FINCH),
    { set: 'met-finch' },
    { quest: 'main', stage: 4 },
  ],
  'club-pip': [
    say('Hi there! I am Pip from the Spotlight Club.', PIP),
    say('This tower plays a special hum. It calls Agentmon to come and see our show!', PIP),
    say('Our show will have the shiniest Agentmon in all of Sunreach. Isn\'t that great?', PIP),
    { if: 'pip-asked', then: [], else: [
      { ask: 'Do the Agentmon like the hum?', yesText: 'Ask Pip', noText: 'Never mind', yes: [
        say('Like it? Of course! Well, they do look a bit grumpy. But that must be the fog.', PIP),
        { set: 'pip-asked' },
      ] },
    ] },
  ],

  'lighthouse-hall': [
    say('You made it across! The Trial is up these stairs.', FINCH),
    say('Each room is a puzzle. Push blocks onto the round plates to open the doors.', FINCH),
    say('Stuck? Press Reset. Everything goes back the way it was.', FINCH),
    say('Want to warm up with a spar first? Just talk to me!', FINCH),
    { set: 'lighthouse-hall' },
  ],
  'trainer-lighthouse-helper': trainerScript('lighthouse-helper', FINCH, 'A warm-up spar before the Trial?', 'You are ready! Marisol is waiting at the top.', 'The stairs lead to the Trial. Good luck!'),

  'keeper-marisol': keeperScript({
    trainer: 'keeper-marisol', who: MARISOL, beacon: 'beacon-lighthouse',
    hello: [
      'You solved my Trial! Welcome to the top. I am Marisol, the Lighthouse Keeper.',
      'Look at the Beacon. The static fog has made it so dim.',
      'A Beacon wakes up with a big, happy spark. A friendly spar between a Keeper and a Field Agent makes the best spark of all!',
    ],
    win: [
      'The Lighthouse Beacon shines again! The sea looks calmer already.',
      'Hmm. That tower on the beach hums all day long. I wonder what it does.',
      'The next Beacon is in Mossgrove, past the Cliff Road. Go west from Saltwhistle.',
    ],
    gift: { item: 'sea-crisp', n: 3, line: 'Here. Sea Crisps are a Tide friend\'s favorite snack.' },
    quest: 5,
    after: 'The Beacon shines again. Thank you, {player}! The Cliff Road is west of Saltwhistle.',
  }),
};
