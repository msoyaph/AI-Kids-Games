/**
 * Chapters 5–6: Whisper Woods (Dot finds out the club's towers make the fog), Glimmer Cave (Rudy),
 * the Cragtop Slopes, Cragtop and the Old Mine Beacon. Juno asks for help for the first time.
 */
import type { Script } from '../../core/script';
import { keeperScript, say, shopScript, storySpar, trainerScript } from './common';

const NELL = 'Chief Nell', JUNO = 'Juno', DOT = 'Dot', RUDY = 'Rudy', GUS = 'Gus', VEE = 'Vee';

export const CH5: Record<string, Script> = {
  'whisper-arrive': [
    say('Whisper Woods. The fog is thick here, and the trees whisper in the wind.'),
    { set: 'whisper-arrive' },
  ],
  'trainer-agent-bea': trainerScript('agent-bea', 'Bette', 'Field Agent Bette, at your service! A quick spar?', 'Splendid! You have a real gift.', 'Wild Agentmon in the fog look grumpy. Their favorite snack cheers them up!'),
  'club-dot': [
    { if: 'dot-met', then: [say('I switched the tower off. Velour won\'t be happy. But it was the right thing to do.', DOT)], else: storySpar({
      trainer: 'club-dot', who: DOT, flag: 'dot-met',
      before: [
        'Shh! Our tower is calling Agentmon to the Spotlight Club\'s big show.',
        'Hey, you\'re the Field Agent who keeps relighting the Beacons! Let\'s spar. Show me what a Field Agent can do!',
      ],
      win: ['Wow. Your friends look so happy with you.'],
      lose: ['I won! Your friends still look happy with you, though.'],
      after: [
        say('Look at the tower. See the gray fog puffing out of the top?'),
        say('Oh no. The fog comes from OUR tower? I just wanted Agentmon to come to the show.', DOT),
        say('I will switch this one off right now. And I will tell Velour!', DOT),
        { set: 'woods-tower-off' },
        say('Dot switches the tower off. The fog in the clearing starts to thin.'),
        say('Your Agent Card beeps. It\'s Chief Nell!'),
        say('{player}, so the Spotlight Club\'s towers make the static fog. Well done for finding out!', NELL),
        say('Every Beacon you relight pushes the fog back. The next one is in Cragtop, past Glimmer Cave.', NELL),
        say('The cave is dark inside. Make friends with a Glow Agentmon to light the way!', NELL),
        { quest: 'main', stage: 8 },
      ],
    }) },
  ],

  'club-rudy': [
    { if: 'rudy-met', then: [say('Velour went north to set up our biggest tower. I might go and ask her about the fog.', RUDY)], else: storySpar({
      trainer: 'club-rudy', who: RUDY, flag: 'rudy-met',
      before: [
        'Oh! A Field Agent in my sparkly cave!',
        'I am Rudy from the Spotlight Club. I am looking for the shiniest crystals for our show.',
        'Dot says our towers make the fog? Pfft. Let\'s spar!',
      ],
      win: ['Okay, okay. You and your friends really are a great team.'],
      lose: ['Ha! A win for the Spotlight Club! Your friends tried their best, though.'],
      after: [say('Velour is setting up our biggest tower far to the north. Maybe I should ask her about the fog.', RUDY)],
    }) },
  ],

  'trainer-agent-sami': trainerScript('agent-sami', 'Sami', 'Mountain air makes my friends strong. Spar?', 'You climbed right over me!', 'Hailbit loves cold mountain air. Frost Mints are its favorite!'),
  'slope-jo': [say('That boulder rolls onto the trail now and then. A Stone friend gives it a big shove! Druzette lives in Glimmer Cave.', 'Climber Jo')],

  'crag-arrive': [
    say('Cragtop, the town on the mountain! The Old Mine is in the north-east.'),
    { set: 'crag-arrive' },
    { quest: 'main', stage: 9 },
  ],
  'not-yet-canyon': [say('The Canyon Trail goes far to the west. Help the Old Mine Beacon first!'), { walk: 'player', path: 'r' }],
  'not-yet-meadow': [say('A quiet trail leads east. It looks special. Maybe later!'), { walk: 'player', path: 'l' }],
  'crag-barlow': [say('When I was young, the Beacons glowed so bright that the night looked like dawn.', 'Old Barlow')],
  'crag-pet': [say('Burrowby digs a tiny hole and naps in it.')],
  'shop-cragtop': shopScript('cragtop'),
  'juno-crag': [
    say('{player}... I tried the Old Mine Trial before you. I got stuck in the very first room.', JUNO),
    say('You make it look easy. Can you show me how you push the blocks?', JUNO),
    say('You show Juno how to push a block from behind. Juno grins.'),
    say('Thanks! Maybe being a team is better than being first.', JUNO),
    { set: 'juno-crag' },
  ],

  'mine-hall': [
    say('Welcome to the Old Mine Trial! I am Gus.', GUS),
    say('Some doors here need power. Push blocks onto the switches to send the power along.', GUS),
    say('Mine carts roll back and forth. Hop on when one stops next to you!', GUS),
    { set: 'mine-hall' },
  ],
  'trainer-mine-helper': trainerScript('mine-helper', GUS, 'A warm-up spar before the mine?', 'You are ready for Vee!', 'Carts move on their own. Wait for one, then hop on!'),
  'keeper-vee': keeperScript({
    trainer: 'keeper-vee', who: VEE, beacon: 'beacon-mine',
    hello: [
      'You made it through my mine! I am Vee, the Old Mine Keeper.',
      'The fog makes the old machines buzz and fizz. Let\'s fix that with a happy spark!',
    ],
    win: [
      'The Old Mine Beacon is glowing again! Hear that? The machines purr like happy Zestles.',
      'Next, follow the Canyon Trail west to Dunehollow, the desert town.',
    ],
    gift: { item: 'spark-fizz', n: 2, line: 'Spark Fizz is a Volt friend\'s favorite snack. Take some!' },
    quest: 10,
    after: 'Dunehollow is west, along the Canyon Trail. Stay cool out there!',
  }),
};
