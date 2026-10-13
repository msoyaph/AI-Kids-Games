/**
 * After the story: the Starlit Meadow (the club's open garden), the three hidden guardians, the
 * Challenge Tower in the Academy, and Juno's rematches. Guardians are found through small quests
 * (someone tells you an old story; you go and look) and never by luck.
 */
import type { Cmd, Script } from '../../core/script';
import { say, sideQuest } from './common';

const VELOUR = 'Velour', JUNO = 'Juno';

/** Meeting a guardian: a gentle spar to show your friendship; it waits for you if you walk away. */
const guardian = (species: string, name: string, level: number, lines: string[], quest: string): Script => [
  ...lines.map(t => say(t)),
  { wild: { species, level, guardian: true },
    friend: [{ set: `${species}-friend` }, { quest, stage: -1 } as Cmd, say(`${name} wants to be your friend!`)],
    win: [say(`${name} nods kindly. It will wait right here for you.`)],
    lose: [say(`${name} hums, and your friends feel rested again.`), { heal: true }, say('It will wait right here for you.')] },
];

export const POST: Record<string, Script> = {
  'not-yet-cove': [say('The sea out there is too rough to paddle for now. Maybe after your adventure!'), { walk: 'player', path: 'l' }],
  'garden-velour': [
    { if: 'garden-gift', then: [say('No towers, no fog. Just friends. Isn\'t it the best show of all?', VELOUR)], else: [
      say('Welcome to the Starlit Meadow! Once a showground, now an open garden.', VELOUR),
      say('Here. A thank-you from the whole Spotlight Club.', VELOUR),
      { give: 'swift-ribbon' },
      { set: 'garden-gift' },
    ] },
  ],
  'garden-dot': [say('I come here every day. The Agentmon say hi to me now. All on their own!', 'Dot')],
  'garden-mabel': [say('Did you know? Popcorn pops because a tiny drop of water inside each kernel turns into steam!', 'Mabel')],

  'guardian-tidecrest': guardian('tidecrest', 'Tidecrest', 48, [
    'A huge, gentle moon snail glows on the little island. A tide-pool garden grows on its shell.',
    'It is Tidecrest, a guardian of Sunreach!',
  ], 'guardian-tidecrest'),
  'guardian-archwyn': guardian('archwyn', 'Archwyn', 48, [
    'The great sandstone arch rumbles. It stands up on long, rocky legs!',
    'It is Archwyn, a guardian of Sunreach!',
  ], 'guardian-archwyn'),
  'guardian-frostmantle': guardian('frostmantle', 'Frostmantle', 48, [
    'A snowdrift sits up and twitches its long ears. It is a giant, fluffy snow hare!',
    'It is Frostmantle, a guardian of Sunreach!',
  ], 'guardian-frostmantle'),

  'tower-host': [
    say('Welcome to the Challenge Tower! Spar your way up, floor by floor. Every floor is a little harder.', 'Coach Pim'),
    say('Your friends rest between floors. Your best floor is saved on this computer.', 'Coach Pim'),
    { ask: 'Ready to climb?', who: 'Coach Pim', yesText: 'Let\'s go!', noText: 'Not now', yes: [{ tower: true }] },
  ],
  // ---- 1.1: Banyan Hollow (three small quests, then the guardian wakes)
  'banyan-fen': sideQuest({
    id: 'sq-lantern', who: 'Fen',
    ask: ['The lanterns of Banyan Hollow grow from glowing seeds.', 'The wind blew three seeds away. Could you find them for me?'],
    need: 'item:lantern-seed:3', hint: 'Look in the tall grass corners, and on the little island past the rope bridge.',
    take: ['lantern-seed', 3],
    thanks: ['You found all three! Let\'s plant them by the posts.', 'Look! The lanterns are glowing again.'],
    reward: [{ set: 'lanterns-lit' }, say('Fen gives you a Lantern Cap. A friend can wear it!'), { coins: 400 }],
    done: 'The lanterns glow every evening now. The old tree looks happy.',
  }),
  'banyan-pip': sideQuest({
    id: 'sq-relay', who: 'Pip',
    ask: ['Want to run the Root Relay? There is no clock. Go at your own speed!', 'Visit Sprigling, then Twigstride, then Leafwarden. Each one hands you a twig.', 'Then come back to me!'],
    need: 'relay-3', hint: 'First Sprigling up north. Then Twigstride by the east trees. Then Leafwarden down south.',
    thanks: ['You ran the whole Root Relay! You are a natural.'],
    reward: [say('Pip gives you a Leaf Cape. A friend can wear it!'), { give: 'honey-drop', n: 3 }],
    done: 'Every Agentmon in the hollow loves the Root Relay now.',
  }),
  'relay-sprigling': [
    { if: 'sq-relay & !sq-relay-done & !relay-1', then: [say('Sprigling hands you a little twig. Off you go!'), { set: 'relay-1' }],
      else: [say('Sprigling sways like a happy little sprout.')] },
  ],
  'relay-twigstride': [
    { if: 'sq-relay & !sq-relay-done & relay-1 & !relay-2', then: [say('Twigstride swaps your twig for a longer one!'), { set: 'relay-2' }],
      else: [{ if: 'sq-relay & !sq-relay-done & !relay-1', then: [say('Twigstride points north. Sprigling has the first twig!')],
        else: [say('Twigstride stands so still. It looks just like a stick!')] }] },
  ],
  'relay-leafwarden': [
    { if: 'sq-relay & !sq-relay-done & relay-2 & !relay-3', then: [say('Leafwarden gives you a leafy twig. Take it back to Pip!'), { set: 'relay-3' }],
      else: [{ if: 'sq-relay & !sq-relay-done & !relay-2', then: [say('Leafwarden waves you on. Visit the others first!')],
        else: [say('Leafwarden rustles its leaves like a big green cape.')] }] },
  ],
  'banyan-mo': sideQuest({
    id: 'sq-tea', who: 'Grandma Mo',
    ask: ['I would love a tea party under the old tree.', 'Could you bring me a Honey Drop and a Moon Melon? Shops sell them.'],
    need: 'item:honey-drop:1 & item:moon-melon:1', hint: 'A Honey Drop and a Moon Melon, please. Then we can have tea!',
    take: ['honey-drop', 1],
    thanks: ['Lovely! Sit down, sit down.', 'The Agentmon gather round. Everyone gets a sip of honey tea.'],
    reward: [{ take: 'moon-melon', n: 1 }, say('Grandma Mo gives you a Teacup Bow. A friend can wear it!')],
    done: 'Tea under the banyan tastes the best. Come back any time!',
  }),
  'banyan-rowan': [
    { if: 'verdanyan-friend', then: [say('The old tree and you are friends now. The whole hollow can feel it.', 'Old Rowan')], else: [
      { if: 'sq-lantern-done & sq-relay-done & sq-tea-done', then: [say('Listen! The old banyan is waking up. Go and say hello!', 'Old Rowan')], else: [
        say('This banyan is older than any town in Sunreach.', 'Old Rowan'),
        say('Old stories say a guardian sleeps inside it. It wakes when the hollow is happy.', 'Old Rowan'),
        say('Help Fen, Pip and Grandma Mo. Then we will see!', 'Old Rowan'),
        { quest: 'guardian-verdanyan', stage: 0 },
      ] },
    ] },
  ],
  'guardian-verdanyan': guardian('verdanyan', 'Verdanyan', 48, [
    'The great banyan stirs. Its roots lift like legs, and two kind eyes open in the bark.',
    'It is Verdanyan, a guardian of Sunreach!',
  ], 'guardian-verdanyan'),

  'juno-rematch': [
    say('Hey, partner! Want a rematch? My team trained hard!', JUNO),
    { ask: 'Spar with Juno?', yesText: 'Spar!', noText: 'Not now', yes: [
      { spar: 'rematch-juno', win: [{ set: 'beat:rematch-juno' }, say('You are still the best. Again tomorrow?', JUNO)], lose: [say('I won! Rest up and try again!', JUNO), { heal: true }] },
    ] },
  ],
};
