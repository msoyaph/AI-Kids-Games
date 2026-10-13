/**
 * Chapters 0–1: Brightmoor, the Academy, your partner, and the Meadow Path.
 * Lines are short and friendly (ages 7–12). {player}, {rival}, {partner} are filled in.
 */
import type { Script } from '../../core/script';
import { restStop, say, shopScript, trainerScript } from './common';

const NELL = 'Chief Nell', JUNO = 'Juno', GRAN = 'Gran';

const partner = (id: string, name: string, line: string): Script => [
  { if: 'got-partner', then: [], else: [
    say(line),
    { ask: `Make friends with ${name}?`, yesText: 'Yes!', noText: 'Not yet', yes: [{ partner: id }, { goto: 'after-partner' }], no: [say(`${name} waves. Take your time!`)] },
  ] },
];

export const CH0: Record<string, Script> = {
  intro: [
    say('Good morning, {player}! Today is your very first day at the Field Agent Academy.', GRAN),
    say('Field Agents make friends with Agentmon and help them. Your mom and dad are Field Agents too, exploring far away!', GRAN),
    say('Chief Nell is waiting for you. The Academy is the big blue building in town.', GRAN),
    { set: 'woke-up' },
    { tutorial: 'move' },
  ],
  gran: [
    { if: 'mission-1', then: [say('Off to the sea, are you? Be kind, and come home safe.', GRAN), { heal: true }, say('There. A good snack for your friends!', GRAN)],
      else: [say('The Academy is the big blue building. You can do it!', GRAN)] },
  ],
  'bm-tess': [say('Rest Stops have a heart on the roof. They are free, and the nests are so cozy!', 'Tess')],
  'bm-hollis': [say('Our pond is full of shiny pebbles. Look closely around it!', 'Mrs. Hollis')],
  'juno-town': [say('I am going to fill my Field Guide first! Race you, {player}!', JUNO)],
  'not-yet-north': [say("You should visit the Academy first. That's where your adventure starts!"), { walk: 'player', path: 'd' }],
  'not-yet-garden': [say('The Academy Garden. Maybe you should meet Chief Nell first.'), { walk: 'player', path: 'l' }],

  'nell-intro': [
    say('Welcome, {player}! I am Chief Nell. Welcome to the Field Agent Academy.', NELL),
    say('We have a problem. A strange static fog is drifting across Sunreach.', NELL),
    say('It makes wild Agentmon grumpy. And it is making the six Beacons go dim.', NELL),
    say('The Beacons keep Sunreach bright and calm. Field Agents keep the Beacons shining.', NELL),
    say('Oh! And this is Juno. Juno started today too.', NELL),
    say("Hi! I'm Juno. I'm going to be the best Field Agent ever. You can be second best!", JUNO),
    say('Ha! We are all a team here, Juno.', NELL),
    say('Every Field Agent needs a partner. Come to the Academy Garden, east of town. Some young Agentmon are waiting!', NELL),
    { set: 'met-nell' },
    { quest: 'main', stage: 1 },
  ],
  nell: [
    { if: 'mission-1', then: [say('The Lighthouse is in Saltwhistle, north past the Meadow Path. You can do it!', NELL)],
      else: [{ if: 'met-nell', then: [say('Meet me in the Academy Garden, east of town!', NELL)], else: [say('Welcome!', NELL)] }] },
  ],
  'juno-academy': [say('Hi! Are you new too?', JUNO)],
  'academy-kip': [say('I am in my second year. My tip: Rest when your friend is tired!', 'Kip')],

  'garden-arrive': [
    say('Here they are! Three young Agentmon who would love a friend.', NELL),
    say('Walk up to one and say hi. Pick the one that feels right!', NELL),
    { tutorial: 'talk' },
  ],
  'partner-spinnet': partner('spinnet', 'Spinnet', 'Spinnet spins in a little circle. Whee! It looks so happy to see you.'),
  'partner-druzling': partner('druzling', 'Druzling', 'Druzling peeks at you. Purple crystals sparkle in its tummy.'),
  'partner-buzzbill': partner('buzzbill', 'Buzzbill', "Buzzbill's bill buzzes softly. It wiggles its tail at you."),
  'nell-garden': [say('Take your time. Every one of them is a good friend.', NELL)],
  'juno-garden': [say('I already know which one I want. The one you don\'t pick!', JUNO)],

  'after-partner': [
    say('You two look like a great team!', NELL),
    say('My turn! I pick this one!', JUNO),
    say('{player}, let\'s have a friendly spar! Nobody gets hurt. Tired friends just take a nap.', JUNO),
    { tutorial: 'battle' },
    { spar: 'juno-1', win: [say('Wow, you are good! Next time I will win!', JUNO)], lose: [say('I won this time! But it was close. Good spar!', JUNO)] },
    { set: 'juno-1' },
    say('Well sparred, both of you! Your friends are tired. Let them rest in the Academy nest.', NELL),
    { fade: 'out' }, { rest: true }, { wait: 0.6 }, { fade: 'in' },
    { tutorial: 'rest' },
    say('All rested! Rest Stops have nests like this. They are always free.', NELL),
    say('Here are your Field Agent things.', NELL),
    { give: 'agent-card' }, { give: 'field-guide' }, { give: 'snack-pouch' }, { give: 'berry-bun', n: 5 }, { give: 'pep-berry', n: 3 },
    say('Your Field Guide fills in as you meet and befriend Agentmon. Each page has a real nature fact!', NELL),
    { tutorial: 'menu' },
    say('Now, your first mission. The Beacon at the Saltwhistle Lighthouse is dimming.', NELL),
    say('Go north through the Meadow Path to Saltwhistle, by the sea. Find the Lighthouse Keeper, Marisol.', NELL),
    say('On the way, you can make more friends. When a wild Agentmon is tired, try Befriend!', NELL),
    { tutorial: 'befriend' },
    say("See you on the road, {player}! I'm going to be first!", JUNO),
    { set: 'mission-1' },
    { quest: 'main', stage: 2 },
  ],

  'rest-stop': restStop,
  'shop-brightmoor': shopScript('brightmoor'),

  'trainer-agent-pia': trainerScript('agent-pia', 'Pia', "Hi! I'm Pia. I just made my first friend. Want to spar?", 'Good spar! You and your friend work well together.', 'Tip: tap a move to see what it does!'),
  'trainer-agent-tomo': trainerScript('agent-tomo', 'Tomo', 'A new Field Agent! Spar with me?', 'You win! I need more practice.', 'Tired friends can Rest in battle. It uses your turn, though!'),
  'meadow-june': [say('I love this path. The tall grass is full of wild Agentmon. Some are a little grumpy from the fog.', 'Ms. June'), say('Grumpy ones are harder to befriend. Try their favorite snack!', 'Ms. June')],
};
