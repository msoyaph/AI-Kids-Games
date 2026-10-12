import type { Line } from './dialogueTypes';
import { STORY_DIALOGUE } from './dialogueStory';

/**
 * All conversations. Short sentences for early readers. `{name}` is the player's name.
 * Mission briefings and story scenes live here too so they can be read aloud.
 */
export const DIALOGUE: Record<string, Line[]> = {
  // ---------------------------------------------------------------- Story start
  intro: [
    { who: 'stella', text: 'Hello, {name}! Welcome to the Space Sky Academy!' },
    { who: 'stella', text: 'I am Commander Stella. This is where young cadets learn to explore space.' },
    { who: 'stella', text: 'You will fly a rocket, visit planets, and make new friends.', mood: 'wow' },
    { who: 'stella', text: 'Are you ready? Let\'s have a look around!' },
  ],

  // ---------------------------------------------------------------- Chapter 1
  c1_welcome_brief: [
    { who: 'stella', text: 'First, let\'s look around the Academy.' },
    { who: 'stella', text: 'Visit the Hangar. That is where your rocket lives!' },
  ],
  c1_welcome_done: [
    { who: 'stella', text: 'Great job, {name}! Now you know your way around.' },
    { who: 'stella', text: 'Captain Rio is ready to teach you how to fly.' },
  ],
  hangar_hello: [
    { who: 'boltzy', text: 'Beep! I am Boltzy, the Hangar robot!' },
    { who: 'boltzy', text: 'Here you can change your rocket. Tap a part to try it on.' },
    { who: 'boltzy', text: 'Better parts help on hard trips. Any rocket can fly!' },
  ],
  lounge_hello: [
    { who: 'rio', text: 'Hi there! I am Captain Rio. I teach flying.' },
    { who: 'pip', text: 'And I am Professor Pip! I love space science.', mood: 'wow' },
    { who: 'pip', text: 'Come and say hi to me. Tap me!' },
  ],
  c1_first_flight_brief: [
    { who: 'rio', text: 'Time for your first flight, {name}!' },
    { who: 'rio', text: 'Push the stick the way you want to go. Your rocket follows.' },
    { who: 'rio', text: 'Fly through the training rings. Then grab some star-coins!' },
  ],
  c1_first_flight_rings: [
    { who: 'rio', text: 'See the yellow ring? Fly right through the middle!' },
  ],
  c1_first_flight_done: [
    { who: 'rio', text: 'Wow! You are a natural pilot!', mood: 'wow' },
    { who: 'rio', text: 'Here is a sticker for your first flight.' },
  ],
  c1_fuel_brief: [
    { who: 'rio', text: 'Rockets need fuel, just like cars need gas.' },
    { who: 'rio', text: 'Grab green fuel cells to fill your tank.' },
    { who: 'rio', text: 'Press Boost to go super fast. But boosting uses more fuel!' },
    { who: 'tuggy', text: 'Beep boop! If you run out, call me. I am Tuggy the tow-bot!' },
  ],
  c1_fuel_done: [
    { who: 'rio', text: 'Nice flying! Boltzy made you a gift.' },
    { who: 'boltzy', text: 'A Bubble Dome nose! Try it on in the Hangar.' },
  ],
  c1_moon_brief: [
    { who: 'stella', text: 'Cadet, you are ready for a real trip.' },
    { who: 'stella', text: 'Fly to the Moon and land at Moon Base!' },
    { who: 'pip', text: 'The Moon goes around Earth. It is our closest neighbor in space.' },
  ],
  c1_moon_land_tip: [
    { who: 'rio', text: 'Fly close to the Moon and press Land.' },
    { who: 'rio', text: 'Then hold Thrust to slow down. Land softly on the pad!' },
  ],
  c1_moon_done: [
    { who: 'sol', text: 'You landed on the Moon! Well done, {name}!', mood: 'wow' },
  ],
  c1_moon_rocks_brief: [
    { who: 'pip', text: 'I need Moon rocks for my lab!' },
    { who: 'pip', text: 'Find three glowing rocks at Moon Base. Then bring them home to me.' },
  ],
  c1_moon_rocks_done: [
    { who: 'pip', text: 'Three Moon rocks! Thank you, {name}!', mood: 'wow' },
    { who: 'pip', text: 'Moon rocks help scientists learn how the Moon was made.' },
    { who: 'stella', text: 'You finished Cadet Training! I am so proud of you.' },
    { who: 'boltzy', text: 'Beep! I built you a Twin Engine. Two flames, twice the fun!' },
  ],
  c1s_satellites_brief: [
    { who: 'boltzy', text: 'Some satellites need a check-up.' },
    { who: 'boltzy', text: 'Fly close to each one and hold Action to scan it!' },
  ],
  c1s_satellites_done: [
    { who: 'boltzy', text: 'All satellites are happy! Thank you!' },
    { who: 'pip', text: 'Satellites help us with weather maps and phone calls.' },
  ],
  c1s_coins_brief: [
    { who: 'rio', text: 'Can you collect 40 star-coins near Earth?' },
  ],
  c1s_coins_done: [
    { who: 'rio', text: 'What a coin collector! Here is some new paint.' },
  ],

  // ---------------------------------------------------------------- NPCs in exploration areas
  mars_kit: [
    { who: 'kit', text: 'Howdy, {name}! I am Ranger Kit. I look after the Mars Outpost.' },
    { who: 'kit', text: 'Mars is red because its dust has rust in it!', mood: 'wow' },
  ],
  ceres_pots: [
    { who: 'pots', text: 'Beep! Welcome to Ceres Station. I am Pots, the cook!' },
    { who: 'pots', text: 'Ceres is the biggest thing in the asteroid belt. It is a dwarf planet!' },
  ],
  callisto_zibbo: [
    { who: 'zibbo', text: 'Zib-zib! You fixed my pod! Thank you!', mood: 'wow' },
    { who: 'zibbo', text: 'My name is Zibbo. I am an explorer from far away.' },
  ],
  ganymede_ada: [
    { who: 'ada', text: 'Hi! I am Doctor Ada. I study the moons of Jupiter.' },
    { who: 'ada', text: 'Ganymede is the biggest moon in the whole solar system!' },
  ],
  titan_fin: [
    { who: 'fin', text: 'Ahoy, cadet! I am Captain Fin of Titan Station.' },
    { who: 'fin', text: 'Titan has lakes. But they are not water. They are full of liquid methane!' },
  ],
  triton_ivy: [
    { who: 'ivy', text: 'Brrr! Hi, I am Ivy. Triton is one of the coldest places we know!' },
    { who: 'ivy', text: 'Those geysers shoot gas way up high. Ride them!' },
  ],
  village_ollo: [
    { who: 'ollo', text: 'Welcome, friend from far away. I am Glowkeeper Ollo.' },
    { who: 'ollo', text: 'I take care of our Star Beacon. It guides explorers home.' },
  ],
  village_wobb: [
    { who: 'wobb', text: 'Hello! I am Wobb. I grow glow-berries!' },
    { who: 'wobb', text: 'They taste like sunshine and bubbles.' },
  ],
  bubble_pibble: [
    { who: 'pibble', text: 'Hee hee! Bounce on the bubbles! It is the best!', mood: 'wow' },
  ],

  moon_intro: [
    { who: 'sol', text: 'Welcome to Moon Base, {name}!' },
    { who: 'sol', text: 'Look up! That blue ball is Earth, your home.', mood: 'wow' },
  ],
  moon_sol: [
    { who: 'sol', text: 'Hello there! I keep Moon Base tidy.' },
    { who: 'sol', text: 'There is no air on the Moon. That is why we wear space suits!' },
  ],
};

Object.assign(DIALOGUE, STORY_DIALOGUE);

export function dialogue(id: string): Line[] {
  return DIALOGUE[id] ?? [];
}
