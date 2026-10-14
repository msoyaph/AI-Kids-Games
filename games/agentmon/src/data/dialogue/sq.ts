/**
 * Side quests: 22 small favours for the people of Sunreach (find a lost thing, bring a snack, show
 * them a friend), plus the three guardian quests that open after the story. Every reward is fixed.
 * These scripts are the talk scripts of the people who give the quests.
 */
import type { Script } from '../../core/script';
import { say, sideQuest, trainerScript } from './common';

export const SQ: Record<string, Script> = {
  // ---- Brightmoor
  'bm-dale': sideQuest({
    id: 'sq-dale', who: 'Mr. Dale',
    ask: ['The Beacons have looked dim lately. I hope the new Field Agents can help.', 'If you relight three Beacons, come and tell me. I will have a reward ready!'],
    need: 'beacons:3', hint: 'Three Beacons shining again. Wouldn\'t that be something?',
    thanks: ['Three Beacons! I can see their glow from my window. Thank you!'], reward: [{ coins: 300 }],
    done: 'The sky looks brighter every day. Thank you, Field Agent!',
  }),
  'bm-bo': sideQuest({
    id: 'sq-bo', who: 'Bo',
    ask: ['Wild Agentmon play in tall grass. You can walk around them if you want.', 'I bet you can\'t make friends with ten different kinds of Agentmon!'],
    need: 'guide:10', hint: 'Ten different kinds! Your Field Guide shows how many friends you have.',
    thanks: ['Ten kinds! You win the bet. Here is my prize.'], reward: [{ give: 'wake-berry', n: 2 }],
    done: 'When I grow up, I want to be a Field Agent just like you!',
  }),

  // ---- Saltwhistle and Sandy Shore
  'salt-wren': sideQuest({
    id: 'sq-shell', who: 'Wren',
    ask: ['I lost my shiny pink shell on Sandy Shore. A Dewpud carried it away!', 'Could you look for it on the beach?'],
    need: 'found-shell', hint: 'My shell is pink and shiny. It is somewhere on Sandy Shore!',
    thanks: ['My shell! Thank you, thank you!'], reward: [{ give: 'honey-drop', n: 2 }],
    done: 'Listen! You can hear the sea inside my shell.',
  }),
  'find-shell': [say('You found a shiny pink shell. This must be Wren\'s!'), { set: 'found-shell' }],
  'salt-tov': sideQuest({
    id: 'sq-tov', who: 'Grandpa Tov',
    ask: ['My Lullakin sings to me every night. Little bubble songs!', 'I wish it had a friend to sing with. Could you befriend a Lullakin and bring it by?'],
    need: 'family:lullakin', hint: 'Lullakin play on Sandy Shore. They love Sea Crisps!',
    thanks: ['Listen to them sing together. What a happy sound!'], reward: [{ give: 'sea-crisp', n: 3 }],
    done: 'Our Lullakins sing a duet every evening now.',
  }),
  'salt-ada': sideQuest({
    id: 'sq-nets', who: 'Ms. Ada',
    ask: ['I fix fishing nets all day. Did you know? Real manatees munch sea grass for hours every day.', 'Could you tell Coral on Sandy Shore that her nets are ready?'],
    need: 'told-coral', hint: 'Coral is on Sandy Shore, near the path. Please tell her the nets are ready!',
    thanks: ['Coral was happy? Wonderful! Here, for your help.'], reward: [{ give: 'pep-berry', n: 3 }],
    done: 'Another net, all fixed. Lullakin does munch sea grass for hours, you know.',
  }),
  'trainer-agent-coral': [
    { if: 'sq-nets & !told-coral', then: [say('My nets are ready? Hooray! Please tell Ms. Ada thank you!', 'Coral'), { set: 'told-coral' }],
      else: trainerScript('agent-coral', 'Coral', 'Sun, sand and spars! Want to try one?', 'Nice! Your friends are full of energy.', 'Tide friends can paddle you across water. Try it!') },
  ],
  'salt-bram': [
    { if: 'credits & !item:tide-pearl:1 & !tidecrest-friend', then: [
      say('The fish are back, thanks to you. And look what came up in my net: a pearl that hums!', 'Mr. Bram'),
      say('On moonlit nights, something huge glows far out past the Lighthouse. Paddle east and see!', 'Mr. Bram'),
      { give: 'tide-pearl' },
      { quest: 'guardian-tidecrest', stage: 0 },
    ], else: [
      { if: 'beacon-lighthouse', then: [say('The Beacon is bright again, and the fish are back. Thank you!', 'Mr. Bram')],
        else: [say('The fish swim far away when the Beacon is dim. They like a bright, calm sea.', 'Mr. Bram')] },
    ] },
  ],

  // ---- Cliff Road, Mossgrove and its woods
  'cliff-pell': sideQuest({
    id: 'sq-pell', who: 'Mr. Pell',
    ask: ['I climb this road every morning. The view of the sea is the best in Sunreach!', 'I forgot my snack today. Could you spare two Crunch Seeds?'],
    need: 'item:crunch-seed:2', hint: 'Two Crunch Seeds, please. Shops sell them!',
    take: ['crunch-seed', 2], thanks: ['Crunch, crunch! Delicious. Here, take this for the road.'], reward: [{ coins: 120 }],
    done: 'The view is even better with a snack!',
  }),
  'moss-bun': sideQuest({
    id: 'sq-bun', who: 'Mrs. Bun',
    ask: ['I want to bake honey buns, but I am out of honey!', 'Could you bring me one Honey Drop?'],
    need: 'item:honey-drop:1', hint: 'Just one Honey Drop, dear. Then the oven can do its magic.',
    take: ['honey-drop', 1], thanks: ['Perfect! Fresh buns for you and your friends.'], reward: [{ give: 'berry-bun', n: 5 }],
    done: 'Come back any time. The oven is always warm!',
  }),
  'moss-pippa': sideQuest({
    id: 'sq-pippa', who: 'Pippa',
    ask: ['My Kernip grew into a fluffy Poplet yesterday. It went POP!', 'I have never seen a Snipsy up close. Could you befriend one and show me?'],
    need: 'family:snipsy', hint: 'Snipsy carries a leaf like an umbrella. They live in tall grass!',
    thanks: ['It is so tiny! And so strong! Thank you!'], reward: [{ give: 'calm-leaf', n: 2 }],
    done: 'Snipsy can carry a leaf bigger than itself!',
  }),
  'woods-ranger': sideQuest({
    id: 'sq-ranger', who: 'Ranger Moss',
    ask: ['I look after Mossgrove Woods. The fog drifts down from Whisper Woods, in the north.', 'I am counting the forest\'s Agentmon. Could you befriend a Fiddlit for my count?'],
    need: 'family:fiddlit', hint: 'Fiddlit have curly heads like fern sprouts. They live right here in the woods!',
    thanks: ['A Fiddlit! That makes my count complete. Take this charm.'], reward: [{ give: 'leaf-charm' }],
    done: 'The woods feel calmer every day.',
  }),
  'whisper-hush': sideQuest({
    id: 'sq-hush', who: 'Mr. Hush',
    ask: ['Shh. Listen. The trees whisper when the wind blows.', 'I love the glow of Gleamgrub at night. Could you befriend one and show me its light?'],
    need: 'family:gleamgrub', hint: 'Gleamgrub live in Mossgrove Woods and near the mouth of Glimmer Cave.',
    thanks: ['What a soft, lovely glow. Thank you.'], reward: [{ give: 'moon-melon', n: 2 }],
    done: 'Shh. Listen. The trees are whispering thank you.',
  }),
  'cave-mo': sideQuest({
    id: 'sq-mo', who: 'Agent Mo',
    ask: ['Gleamgrub and Glintle play here where it is still light. A Glow friend lights up the dark part.', 'I dropped a Glow Charm somewhere in the dark. Could you find it? You can keep it!'],
    need: 'got:glimmer-cave:dark-gift', hint: 'It is somewhere in the dark part of the cave, near the top.',
    thanks: ['You found it! Keep it, and take these too.'], reward: [{ give: 'wake-berry', n: 2 }],
    done: 'Glow friends make the dark feel cozy.',
  }),

  // ---- Cragtop
  'crag-gil': sideQuest({
    id: 'sq-gil', who: 'Miner Gil',
    ask: ['The Old Mine door needs power to open. A Volt friend can wake up the old machine!', 'If you get it humming again, I will pay you for the help.'],
    need: 'powered:cragtop:mine-machine', hint: 'The machine is right next to the mine door. Face it and press A with a Volt friend!',
    thanks: ['Listen to it hum! Here is your pay, Field Agent.'], reward: [{ coins: 150 }],
    done: 'The old machine hums like a happy Zestle.',
  }),
  'crag-tam': sideQuest({
    id: 'sq-tam', who: 'Tam',
    ask: ['I want to be a Field Agent too! I practice sparring with my pillow.', 'Agent Sami on the slopes is SO strong. Can you win a spar against Sami?'],
    need: 'beat:agent-sami', hint: 'Sami is on the Cragtop Slopes, just below town!',
    thanks: ['You beat Sami?! You are my hero. Here, take my lucky band!'], reward: [{ give: 'sturdy-band' }],
    done: 'One day I will spar with you. Just wait!',
  }),
  'crag-rue': sideQuest({
    id: 'sq-rue', who: 'Granny Rue',
    ask: ['Did you know? Real wombats dig long burrows with lots of rooms. Burrowbat does that too!', 'Could you befriend a Burrowby and bring it to say hello?'],
    need: 'family:burrowby', hint: 'Burrowby is a round little digger. It loves Crunch Seeds.',
    thanks: ['Oh, it is digging a little bed in my garden! Take these seeds.'], reward: [{ give: 'crunch-seed', n: 3 }],
    done: 'Burrowbat even makes a room just for snacks!',
  }),

  // ---- Canyon Trail and Dunehollow
  'canyon-ochre': [
    { if: 'credits & !item:canyon-bell:1 & !archwyn-friend', then: [
      say('I found this old bell in the canyon. Its ring echoes for a very long time.', 'Dr. Ochre'),
      say('Old stories tell of a sandstone giant. It wakes when someone rings a bell by the great arch on the Dune Flats.', 'Dr. Ochre'),
      { give: 'canyon-bell' },
      { quest: 'guardian-archwyn', stage: 0 },
    ], else: sideQuest({
      id: 'sq-ochre', who: 'Dr. Ochre',
      ask: ['These red rocks are made of sand pressed together over a very long time. That is called sandstone!', 'I study crystals too. Could you befriend a Glintle so I can see its crystal body?'],
      need: 'family:glintle', hint: 'Glintle play near the mouth of Glimmer Cave and on this trail.',
      thanks: ['Look how it sparkles! Here, a charm for your Stone friends.'], reward: [{ give: 'stone-charm' }],
      done: 'Wind and rain carve sandstone into arches and towers!',
    }) },
  ],
  'dune-saffi': sideQuest({
    id: 'sq-saffi', who: 'Mx. Saffi',
    ask: ['Sun Peppers are spicy! Flare friends love them.', 'I am making pepper jam. Trade me two Sun Peppers for three Fizz Candies?'],
    need: 'item:sun-pepper:2', hint: 'Two Sun Peppers, please. The shop here sells them!',
    take: ['sun-pepper', 2], thanks: ['A fair trade! Enjoy the fizz.'], reward: [{ give: 'spark-fizz', n: 3 }],
    done: 'Pepper jam on toast. You should try it!',
  }),
  'dune-ollie': sideQuest({
    id: 'sq-ollie', who: 'Ollie',
    ask: ['I saw a Whirrbird fly backwards! Real hummingbirds can do that too!', 'Can you befriend a Hummet? I want to see one hover!'],
    need: 'family:hummet', hint: 'Hummet wears a flower like a hat. They hover in sunny places!',
    thanks: ['It hovers in one spot! So cool. Have some Honey Drops.'], reward: [{ give: 'honey-drop', n: 3 }],
    done: 'Hummingbirds flap their wings super fast. That is why they hum!',
  }),
  'dune-zara': sideQuest({
    id: 'sq-zara', who: 'Auntie Zara',
    ask: ['Too hot to bake today! I make cool melon juice instead.', 'But I am out of melon. Could you bring me a Moon Melon?'],
    need: 'item:moon-melon:1', hint: 'One Moon Melon, please. The shops in Mossgrove and Cragtop sell them.',
    take: ['moon-melon', 1], thanks: ['Ahh, cool juice for everyone! Take this special berry.'], reward: [{ give: 'rainbow-berry' }],
    done: 'Have a sip! Cool melon juice is the best on a hot day.',
  }),

  // ---- Frost Pass, Frostfall and the slopes
  'ff-nia': sideQuest({
    id: 'sq-nia', who: 'Nia',
    ask: ['Wheee! Sledding is the best! My Scarfcub rides with me.', 'But I lost my red mitten in Frost Pass. Could you find it?'],
    need: 'found-mitten', hint: 'It is red and fuzzy. Somewhere in Frost Pass, near the south!',
    thanks: ['My mitten! My paw was so cold. Thank you!'], reward: [{ give: 'frost-mint', n: 3 }],
    done: 'Race you down the hill!',
  }),
  'find-mitten': [say('You found a fuzzy red mitten. This must be Nia\'s!'), { set: 'found-mitten' }],
  'ff-purl': sideQuest({
    id: 'sq-purl', who: 'Mr. Purl',
    ask: ['I knit scarves for everyone in town. Even the Agentmon!', 'Minty yarn smells lovely. Could you bring me two Frost Mints?'],
    need: 'item:frost-mint:2', hint: 'Two Frost Mints, please. The shop here has them.',
    take: ['frost-mint', 2], thanks: ['Here, a cozy scarf for one of your friends!'], reward: [{ give: 'comfy-scarf' }],
    done: 'Knit one, purl two. Scarves for everyone!',
  }),
  'ff-ilse': [
    { if: 'credits & !item:frost-feather:1 & !frostmantle-friend', then: [
      say('You found my old feather? No, this one found me. It is a feather of frost that never melts.', 'Grandma Ilse'),
      say('My grandma said a giant snow hare lives at the very top of the Frostfall Slopes. Take the feather there!', 'Grandma Ilse'),
      { give: 'frost-feather' },
      { quest: 'guardian-frostmantle', stage: 0 },
    ], else: [
      say('Did you know? Snow leopards wrap their long, fluffy tails around themselves to stay warm.', 'Grandma Ilse'),
      say('Scarfcub does it too. That is how it got its name!', 'Grandma Ilse'),
    ] },
  ],
  'slopes-floe': sideQuest({
    id: 'sq-floe', who: 'Mr. Floe',
    ask: ['Fact: hailstones grow in layers, like an onion. They bounce up and down inside storm clouds.', 'Could you befriend a Hailbit and show me its layers?'],
    need: 'family:hailbit', hint: 'Hailbit wears little mittens. Look for it in Frost Pass and Cragtop.',
    thanks: ['Look at those layers! Just like real hail. Take these berries.'], reward: [{ give: 'big-pep-berry', n: 2 }],
    done: 'This stream is too fast to cross. Freeze it with a Frost friend!',
  }),

  // ---- Updraft Ridge and the Sky Island
  'ridge-ana': sideQuest({
    id: 'sq-ana', who: 'Kite flyer Ana',
    ask: ['The wind here never stops! My kite flew for three days straight.', 'Then the string snapped and it blew up to the Sky Island! Could you bring it back?'],
    need: 'found-kite', hint: 'It is a blue kite. It must be on the Sky Island, on the east side.',
    thanks: ['My kite! Thank you! Here, a charm for your Gust friends.'], reward: [{ give: 'gust-charm' }],
    done: 'Up, up, and away!',
  }),
  'find-kite': [say('A blue kite is tangled on a cloud. This must be Ana\'s!'), { set: 'found-kite' }],

  // ---- Guardians (after the story)
  'archwyn-arch': [
    { if: 'item:canyon-bell:1', then: [
      say('You ring the Canyon Bell. The sound echoes on and on between the rocks.'),
      { goto: 'guardian-archwyn' },
    ], else: [say('A great sandstone arch. The wind sings softly through it.')] },
  ],
  'frostmantle-peak': [
    { if: 'item:frost-feather:1', then: [
      say('The Frost Feather sparkles. A snowdrift nearby begins to move!'),
      { goto: 'guardian-frostmantle' },
    ], else: [say('Deep, soft snow. Is that a pair of long ears poking out?')] },
  ],
};
