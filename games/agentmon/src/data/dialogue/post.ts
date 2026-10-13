/**
 * After the story: the Starlit Meadow (the club's open garden), the three hidden guardians, the
 * Challenge Tower in the Academy, and Juno's rematches. Guardians are found through small quests
 * (someone tells you an old story; you go and look) and never by luck.
 */
import type { Cmd, Script } from '../../core/script';
import { say } from './common';

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
  'juno-rematch': [
    say('Hey, partner! Want a rematch? My team trained hard!', JUNO),
    { ask: 'Spar with Juno?', yesText: 'Spar!', noText: 'Not now', yes: [
      { spar: 'rematch-juno', win: [{ set: 'beat:rematch-juno' }, say('You are still the best. Again tomorrow?', JUNO)], lose: [say('I won! Rest up and try again!', JUNO), { heal: true }] },
    ] },
  ],
};
