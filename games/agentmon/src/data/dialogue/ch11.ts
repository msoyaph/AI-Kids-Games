/**
 * Chapters 11–13: Updraft Ridge (Juno's last spar as a best friend, Velour understands), the Sky
 * Island, the Beacon Spire, and the finale: all six Beacons shine, Aurelune comes down on the sky
 * lights, the Spotlight Club switches every tower off, and the town celebrates. Then the credits.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, storySpar, trainerScript } from './common';

const NELL = 'Chief Nell', GRAN = 'Gran', JUNO = 'Juno', VELOUR = 'Velour', DOT = 'Dot', NOVA = 'Nova', CELESTE = 'Celeste';

export const CH11: Record<string, Script> = {
  'juno-ridge': storySpar({
    trainer: 'juno-4', who: JUNO, flag: 'juno-4',
    before: [
      '{player}! Look how far we have come. From the Academy Garden all the way up to the clouds!',
      'One more spar. Our best one yet. Ready, partner?',
    ],
    win: ['That was amazing. You really are a great Field Agent. And my best friend.'],
    lose: ['I won! But honestly? We are both great.'],
    after: [say('Go relight the last Beacon. I will be right behind you. As a team!', JUNO)],
  }),
  'club-velour-2': storySpar({
    trainer: 'club-velour-2', who: VELOUR, flag: 'velour-2',
    before: [
      'You climbed all the way up here? Nobody follows the Spotlight Club this far.',
      'I built my tower above the clouds. And still the fog follows me.',
      'One last spar, Field Agent. Then I will listen to everything you say.',
    ],
    win: [
      'I understand now. The towers make the fog. My show made Agentmon grumpy and the Beacons dim.',
      'I wanted everyone to see how wonderful Agentmon are. But they are most wonderful when they are free.',
    ],
    lose: ['I won. But my heart is not in it anymore. I see the fog wherever I build.'],
    after: [
      say('When the last Beacon shines, I will switch every tower off. I promise.', VELOUR),
      say('Please take this. A thank-you, from me.', VELOUR),
      { give: 'comfy-scarf' },
    ],
  }),
  'ride-up': [
    say('The updraft roars! The wind lifts you up, up, up, above the clouds!'),
    { fade: 'out' }, { warp: 'sky-island', x: 5, y: 20, dir: 3 }, { fade: 'in' },
  ],
  'ride-down': [
    say('You step into the gentle downdraft and float softly back down to the ridge.'),
    { fade: 'out' }, { warp: 'updraft-ridge', x: 4, y: 5, dir: 0 }, { fade: 'in' },
  ],

  'sky-arrive': [
    say('The Sky Island! Clouds drift by under your feet.'),
    say('The Beacon Spire rises at the top of the island.'),
    { set: 'sky-arrive' },
    { quest: 'main', stage: 15 },
  ],
  'sky-lumi': [
    say('Long ago, Aurelune painted the sky with lights.', 'Sage Lumi'),
    say('When all six Beacons shine together, the lights will dance again. Maybe Aurelune will too.', 'Sage Lumi'),
  ],
  'sky-zephyr': [
    say('Fact: the colorful lights in the sky near the North and South Poles are called auroras.', 'Agent Zephyr'),
    say('They glow when tiny bits from the Sun bump into the air, very high up.', 'Agent Zephyr'),
  ],
  'spire-hall': [
    say('Welcome to the Beacon Spire Trial, the last one! I am Nova.', NOVA),
    say('Every kind of puzzle you have solved is here: blocks, gates, mirrors, ice and clouds.', NOVA),
    say('Take your time. You can always reset!', NOVA),
    { set: 'spire-hall' },
  ],
  'trainer-spire-helper': trainerScript('spire-helper', NOVA, 'One last warm-up spar?', 'You are ready for Celeste!', 'Clouds drift on their own. Wait for one, then hop on!'),
  'keeper-celeste': keeperScript({
    trainer: 'keeper-celeste', who: CELESTE, beacon: 'beacon-spire', rematch: 'rematch-celeste',
    hello: [
      'You made it to the top of the Spire! I am Celeste, the last Keeper.',
      'Five Beacons shine below us. This is the sixth. Let\'s make the brightest spark of all!',
    ],
    win: ['The Spire Beacon blazes! Look, {player}! All six Beacons are shining at once!'],
    quest: 16,
    then: [{ goto: 'finale' }],
    after: 'All six Beacons shine together. Thank you, {player}.',
  }),

  finale: [
    say('The six Beacons send their light high into the sky, all at once.'),
    say('Soft ribbons of green, pink and gold ripple across the clouds.'),
    say('A great, gentle Agentmon floats down on the glowing ribbons.'),
    say('It is Aurelune, the guardian of Sunreach! Nobody has seen it for a hundred years.', CELESTE),
    say('Aurelune looks at you and your friends. It wants to see your friendship.'),
    { set: 'guardian-met' },
    { goto: 'guardian-aurelune' },
    { fade: 'out' }, { warp: 'brightmoor', x: 16, y: 12, dir: 0 }, { fade: 'in' },
    say('Back in Brightmoor, the whole town gathers in the plaza. Soft lights dance in the sky.'),
    say('{player}! You did it! Every Beacon shines, and the fog is gone.', NELL),
    say('I am so proud of you. Wait until your mom and dad hear about this!', GRAN),
    say('Partner! We did it! Well, you did most of it. But I helped!', JUNO),
    say('Velour steps forward with Dot, Rudy and Mabel.'),
    say('We switched off every tower. No more fog. And our show...', VELOUR),
    say('...is now an open garden! The Starlit Meadow, east of Cragtop. Agentmon can come and go as they please.', DOT),
    say('Everyone is welcome. Especially you, {player}.', VELOUR),
    { set: 'towers-off' }, { set: 'woods-tower-off' }, { set: 'dunes-tower-off' }, { set: 'pass-tower-off' },
    say('Sunreach shines again. Thank you, Field Agent {player}!', NELL),
    { credits: true },
    { set: 'credits' },
    { quest: 'main', stage: 17 },
    say('There is still so much to explore. Old stories say three more guardians sleep somewhere in Sunreach.', NELL),
    say('And the Academy\'s training hall is open now: the Challenge Tower! Come and try it.', NELL),
  ],
  'guardian-aurelune': [
    { wild: { species: 'aurelune', level: 45, guardian: true },
      friend: [{ set: 'aurelune-friend' }, say('Aurelune glows warmly and floats close. It wants to be your friend!')],
      win: [say('Aurelune hums softly. It will wait by the Spire Beacon for you.')],
      lose: [say('Aurelune hums softly, and your friends feel rested again.'), { heal: true }, say('It will wait by the Spire Beacon for you.')] },
  ],
};
