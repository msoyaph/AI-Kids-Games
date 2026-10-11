import type { Line } from './dialogueTypes';

/** Chapters 2-5 mission dialogue. Short sentences for early readers; facts are checked in facts.ts. */
export const STORY_DIALOGUE: Record<string, Line[]> = {
  // ---------------------------------------------------------------- Chapter 2
  c2_mercury_brief: [
    { who: 'pip', text: "Let's visit Mercury, the planet closest to the Sun!" },
    { who: 'pip', text: 'It is very hot in the day and very cold at night.' },
    { who: 'pip', text: 'Bring me two Mercury rocks, please!' },
  ],
  c2_mercury_rover: [
    { who: 'boltzy', text: 'Beep! Mercury is too hot for people in the daytime.' },
    { who: 'boltzy', text: 'So Toastie the robot rover will drive for you. Vroom!' },
  ],
  c2_mercury_done: [
    { who: 'pip', text: 'Two Mercury rocks! Wonderful!', mood: 'wow' },
    { who: 'pip', text: 'Next, let\'s go and see cloudy Venus.' },
  ],
  c2_venus_brief: [
    { who: 'pip', text: 'Venus is covered in thick, yellow clouds.' },
    { who: 'pip', text: 'It is the hottest planet of all. Even hotter than Mercury!' },
    { who: 'pip', text: 'Scan the clouds. Then help Toastie fix our weather station.' },
  ],
  c2_venus_done: [
    { who: 'pip', text: 'The weather station works! Now we can learn about Venus.' },
    { who: 'stella', text: 'Great work! Ranger Kit on Mars needs help too.' },
  ],
  c2_rover_brief: [
    { who: 'kit', text: 'Hello, Academy! This is Ranger Kit on Mars.' },
    { who: 'kit', text: 'My rover Dusty got stuck in a dust storm.' },
    { who: 'kit', text: 'Can you come and help me fix it?' },
  ],
  c2_rover_done: [
    { who: 'kit', text: 'Dusty is rolling again! Thank you, {name}!', mood: 'wow' },
    { who: 'kit', text: 'Now the Big Canyon and Olympus Mons are open to explore.' },
  ],
  c2_canyon_brief: [
    { who: 'kit', text: 'Mars has a canyon that is much bigger than any on Earth!' },
    { who: 'kit', text: 'Explore it and bring back two red rocks.' },
  ],
  c2_canyon_done: [
    { who: 'kit', text: 'You crossed the whole canyon! What a hike!' },
    { who: 'pip', text: 'And I see something icy on our pictures. Let\'s check the ice cap!' },
  ],
  c2_ice_brief: [
    { who: 'pip', text: 'Mars has ice at its north and south poles.' },
    { who: 'pip', text: 'Some ice is hidden in a cave. Can you find it?' },
  ],
  c2_ice_done: [
    { who: 'pip', text: 'Real Mars ice! This is a big discovery!', mood: 'wow' },
    { who: 'pip', text: 'Please bring it home to the Academy.' },
  ],
  c2_report_brief: [
    { who: 'stella', text: 'Welcome home, {name}! Come to the Lounge and tell us everything.' },
  ],
  c2_report_pip: [
    { who: 'pip', text: 'Thank you for the ice! I will study it in my lab.' },
  ],
  c2_report_done: [
    { who: 'stella', text: 'Mercury, Venus and Mars! You are a true explorer.' },
    { who: 'stella', text: 'Our big telescope heard a strange beep from the asteroid belt.' },
    { who: 'boltzy', text: 'Beep! I made you a Big Belly fuel tank for the long trip!' },
  ],
  c2s_moons_brief: [
    { who: 'pip', text: 'Mars has two tiny moons named Phobos and Deimos.' },
    { who: 'pip', text: 'They are shaped like lumpy potatoes! Can you scan them?' },
  ],
  c2s_moons_done: [{ who: 'pip', text: 'Both moons scanned. Look in your Codex!' }],
  c2s_olympus_brief: [
    { who: 'kit', text: 'Olympus Mons is the tallest volcano we know of.' },
    { who: 'kit', text: 'It is about two and a half times taller than Mount Everest!' },
    { who: 'kit', text: 'Can you climb to the top?' },
  ],
  c2s_olympus_done: [
    { who: 'kit', text: 'You made it to the top! Here are some Big Wings for your rocket.' },
  ],
  c2s_sling_brief: [
    { who: 'rio', text: 'Real spacecraft swoop past planets to speed up. It is called a slingshot!' },
    { who: 'rio', text: 'Fly fast and close past a big planet. Curve around it!' },
  ],
  c2s_sling_done: [{ who: 'rio', text: 'Wheee! You are a slingshot star! Here is some Sunset paint.' }],

  // ---------------------------------------------------------------- Chapter 3
  c3_belt_brief: [
    { who: 'rio', text: 'The beep came from the asteroid belt, between Mars and Jupiter.' },
    { who: 'rio', text: 'In our game the rocks are close together. Fly carefully!' },
    { who: 'pip', text: 'In real space, asteroids are very far apart.' },
    { who: 'rio', text: 'Fly to Ceres Station. Pots the robot cook will meet you.' },
  ],
  c3_belt_done: [
    { who: 'pots', text: 'Beep! You made it through the belt!' },
    { who: 'boltzy', text: 'Here is a Magnet Bay. It pulls in star-coins!' },
  ],
  c3_signal_brief: [
    { who: 'pots', text: 'Our big antenna is broken. The signal chips flew everywhere!' },
    { who: 'pots', text: 'Find three chips and power up the antenna.' },
  ],
  c3_signal_done: [
    { who: 'pots', text: 'The antenna is working! Listen!' },
    { who: 'zibbo', text: 'Zib... help... lost... big striped planet... zib!', mood: 'wow' },
    { who: 'pots', text: 'A big striped planet? That sounds like Jupiter!' },
  ],
  c3_jupiter_brief: [
    { who: 'pip', text: 'Jupiter is the biggest planet. More than 1,000 Earths could fit inside!' },
    { who: 'pip', text: 'It has a giant storm called the Great Red Spot. Please scan it.' },
    { who: 'pip', text: 'Then land at Ganymede Station and meet Doctor Ada.' },
  ],
  c3_jupiter_done: [
    { who: 'ada', text: 'Welcome to Ganymede! I heard the signal too.' },
    { who: 'ada', text: 'I saw something strange on Europa. Let\'s look!' },
  ],
  c3_europa_brief: [
    { who: 'ada', text: 'Europa is covered in ice. Scientists think there is a salty ocean under it!' },
    { who: 'ada', text: 'Collect two ice samples. And look for footprints!' },
  ],
  c3_europa_done: [
    { who: 'ada', text: 'Those footprints have three toes! They are not ours.', mood: 'wow' },
    { who: 'ada', text: 'They lead toward Callisto. Someone might need help!' },
  ],
  c3_rescue_brief: [
    { who: 'ada', text: 'There is a crashed pod on Callisto.' },
    { who: 'ada', text: 'Find the pod parts and power it up. Hurry!' },
  ],
  c3_rescue_pod: [
    { who: 'zibbo', text: 'Zib? Zib-zib! Is someone there?', mood: 'wow' },
  ],
  c3_rescue_done: [
    { who: 'zibbo', text: 'I am Zibbo, an explorer from a planet called Zephyra.' },
    { who: 'zibbo', text: 'My compass broke and I got lost. I miss my home.' },
    { who: 'stella', text: 'Zibbo, you can stay with us at the Academy. We will help you find home!' },
    { who: 'zibbo', text: 'Zib-zib! Thank you, {name}! You are my best friend!', mood: 'wow' },
  ],
  c3s_io_brief: [
    { who: 'pip', text: 'Io has more volcanoes than anywhere else we know.' },
    { who: 'pip', text: 'It is too hot to land. Scan it from space!' },
  ],
  c3s_io_done: [{ who: 'pip', text: 'Look at those volcanoes! Here is a sticker.' }],
  c3s_ganymede_brief: [
    { who: 'ada', text: 'Ganymede is bigger than the planet Mercury!' },
    { who: 'ada', text: 'Can you find three Ganymede rocks in the caves?' },
  ],
  c3s_ganymede_done: [{ who: 'ada', text: 'Thank you! Here is some Galaxy paint for your rocket.' }],
  c3s_belt_coins_brief: [{ who: 'rio', text: 'The belt is full of star-coins. Can you grab 50?' }],
  c3s_belt_coins_done: [{ who: 'rio', text: 'Coin champion! Boltzy made you a Comet Cap.' }],
  c3s_vesta_brief: [{ who: 'pip', text: 'Vesta is one of the biggest asteroids. Please scan it!' }],
  c3s_vesta_done: [{ who: 'pip', text: 'Vesta is in your Codex now. Nice!' }],

  // ---------------------------------------------------------------- Chapter 4
  c4_saturn_brief: [
    { who: 'zibbo', text: 'Zib! I remember seeing big rings on my way here.' },
    { who: 'zibbo', text: 'Maybe there are clues at Saturn!' },
    { who: 'pip', text: 'Saturn\'s rings are made of ice and rock. Scoop some for Titan Station!' },
  ],
  c4_saturn_done: [
    { who: 'fin', text: 'Ahoy! Thanks for the ring ice, cadets!' },
    { who: 'fin', text: 'Races around Saturn are open now. Try them on the Mission Board!' },
  ],
  c4_titan_brief: [
    { who: 'fin', text: 'Titan is Saturn\'s biggest moon. The sky is orange and hazy.' },
    { who: 'zibbo', text: 'I feel a clue crystal nearby. It sparkles purple!' },
  ],
  c4_titan_done: [
    { who: 'zibbo', text: 'The first clue crystal! It shows part of a star map!', mood: 'wow' },
  ],
  c4_uranus_brief: [
    { who: 'pip', text: 'Uranus spins on its side, like a ball rolling around the Sun.' },
    { who: 'zibbo', text: 'The next clue is on Miranda, at the bottom of a giant cliff!' },
  ],
  c4_uranus_done: [{ who: 'zibbo', text: 'Two clue crystals! Only one more to go!' }],
  c4_neptune_brief: [
    { who: 'pip', text: 'Neptune has the fastest winds of any planet. Hold on tight!' },
    { who: 'zibbo', text: 'The last clue is on Triton, Neptune\'s big moon.' },
  ],
  c4_neptune_done: [
    { who: 'ivy', text: 'My heater works! Thank you. Toasty toes!' },
    { who: 'zibbo', text: 'Three clue crystals! Let\'s take them home and put them together!' },
  ],
  c4_starpath_brief: [{ who: 'zibbo', text: 'Let\'s go home. Then I can read the star map!' }],
  c4_starpath_zibbo: [
    { who: 'zibbo', text: 'Click, click, click... The crystals fit together!' },
    { who: 'zibbo', text: 'Look! A swirly hole past Neptune. A wormhole! That is the way home!', mood: 'wow' },
  ],
  c4_starpath_stella: [
    { who: 'stella', text: 'A wormhole! Nobody has flown through one before.' },
    { who: 'stella', text: 'But I believe in you two. Boltzy, can you help?' },
  ],
  c4_starpath_done: [
    { who: 'boltzy', text: 'Beep! I built a Wormhole Shield and a Crystal Body for your rocket!' },
    { who: 'pip', text: 'In real life, wormholes are just an idea. No one has ever found one!' },
    { who: 'zibbo', text: 'But in our story... let\'s go! Zib-zib!', mood: 'wow' },
  ],
  c4s_race1_brief: [{ who: 'rio', text: 'Ready for a race? Fly through every ring as fast as you can!' }],
  c4s_race2_brief: [{ who: 'rio', text: 'The Cassini Curve is longer. Use Boost on the straight parts!' }],
  c4s_race3_brief: [{ who: 'fin', text: 'The Titan Twister twists around my moon. Good luck!' }],
  c4s_race_done: [{ who: 'rio', text: 'You finished the race! Want to try for a gold medal?' }],
  c4s_enceladus_brief: [
    { who: 'pip', text: 'Enceladus is a little icy moon of Saturn.' },
    { who: 'pip', text: 'It shoots fountains of ice into space! Scan it!' },
  ],
  c4s_enceladus_done: [{ who: 'pip', text: 'Ice fountains in space! How amazing!' }],
  c4s_pluto_brief: [
    { who: 'ivy', text: 'Pluto is a dwarf planet far past Neptune.' },
    { who: 'ivy', text: 'It has a big icy plain shaped like a heart. Go and see!' },
  ],
  c4s_pluto_done: [{ who: 'ivy', text: 'You found Pluto\'s heart! That is so sweet.' }],

  // ---------------------------------------------------------------- Chapter 5
  c5_wormhole_brief: [
    { who: 'stella', text: 'This is your biggest trip ever, {name}.' },
    { who: 'stella', text: 'Fly past Neptune and into the wormhole. Zibbo will guide you.' },
    { who: 'zibbo', text: 'Zib-zib! I am so excited!', mood: 'wow' },
  ],
  c5_wormhole_done: [{ who: 'zibbo', text: 'We made it! That is my home, Zephyra!', mood: 'wow' }],
  c5_zephyra_brief: [
    { who: 'zibbo', text: 'Land on Zephyra. I want you to meet Glowkeeper Ollo!' },
  ],
  c5_zephyra_done: [
    { who: 'ollo', text: 'Our Star Beacon has gone dim. It needs three beacon sparks.' },
    { who: 'ollo', text: 'Without it, explorers like Zibbo can\'t find their way home.' },
    { who: 'zibbo', text: 'We will find the sparks! One in the caves, one in the sea, one on the peaks!' },
  ],
  c5_crystal_brief: [{ who: 'ollo', text: 'One spark is deep in the Crystal Caves. Match the colors to find it.' }],
  c5_bubble_brief: [{ who: 'pibble', text: 'Hee hee! A spark fell in the Bubble Sea! Come bounce with me!' }],
  c5_sky_brief: [{ who: 'wobb', text: 'The wind blew a spark up to the Windy Peaks. Can you reach it?' }],
  c5_spark_done: [{ who: 'zibbo', text: 'A beacon spark! It is warm and glowy!', mood: 'wow' }],
  c5_beacon_brief: [
    { who: 'zibbo', text: 'We have all three sparks! Let\'s bring them to Ollo!' },
  ],
  c5_beacon_ollo: [
    { who: 'ollo', text: 'Three sparks! You are true friends of Zephyra.' },
    { who: 'ollo', text: 'Climb to the top of the Star Beacon and light it up!' },
  ],
  c5_beacon_done: [
    { who: 'ollo', text: 'The Star Beacon shines again! Thank you, {name}!', mood: 'wow' },
    { who: 'zibbo', text: 'Now every explorer can find the way home. Even me!' },
  ],
  c5s_glimmers_brief: [{ who: 'ollo', text: 'Little glimmers got lost in the dark. Please gather them up!' }],
  c5s_glimmers_done: [{ who: 'ollo', text: 'The glimmers are home. They twinkle to say thank you!' }],
  c5s_berries_brief: [{ who: 'wobb', text: 'Let\'s have a picnic! Pick five glow-berries for me.' }],
  c5s_berries_done: [{ who: 'wobb', text: 'Yum! Here is a Zephyra Sash, just for you!' }],

  // ---------------------------------------------------------------- Cutscenes
  cs_zibbo: [
    { who: 'zibbo', text: 'Wow! So this is the Space Sky Academy!', mood: 'wow' },
    { who: 'stella', text: 'Welcome, Zibbo! You are part of our crew now.' },
    { who: 'zibbo', text: 'Zib-zib! I will help {name} on every mission!' },
  ],
  cs_starpath: [
    { who: 'stella', text: 'The wormhole is on the Star Map now, past Neptune.' },
    { who: 'stella', text: 'Chapter 5 begins. Good luck, explorers!' },
  ],
  cs_wormhole: [
    { who: 'zibbo', text: 'Hold on tight! Wheeee!', mood: 'wow' },
    { who: 'zibbo', text: 'Look at all the colors!' },
  ],
  cs_finale: [
    { who: 'ollo', text: 'Tonight, all of Zephyra will celebrate!' },
    { who: 'zibbo', text: 'Thank you for being my friend, {name}. Come visit me anytime!', mood: 'wow' },
    { who: 'stella', text: 'You did it, {name}! You are a Space Sky Star Hero!' },
    { who: 'pip', text: 'And remember: keep looking up and asking questions!' },
  ],
};
