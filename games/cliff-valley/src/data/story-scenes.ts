/** Story cutscenes: the welcome, each repair celebration, the Heartstone, and the grand reopening. */
import type { CutsceneDef } from './story-types';

const S = (id: string, at: string, spot: string, actors: CutsceneDef['actors'], steps: CutsceneDef['steps']): CutsceneDef => ({ id, npc: actors.find((a) => a.id !== 'player')?.id ?? 'bram', hearts: 0, at, spot, actors, steps });

export const INTRO = S('intro', 'farm', 'door', [
  { id: 'player', pos: [0, 0], dir: 0 },
  { id: 'bram', pos: [-1, 2], dir: 3 },
  { id: 'nana', pos: [1, 2], dir: 3 },
], [
  { say: 'Well hello there! You must be {name}! Welcome to Cliffside Farm — and welcome to Cliff Valley!', who: 'bram', emote: 'happy' },
  { say: "I'm Mayor Bram. And this is Nana Clementine. She was your Great-Aunt Rosemary's very best friend.", who: 'bram' },
  { say: 'Oh, sweet pea, you have her smile! Rosemary helped found this whole valley, you know. She loved this farm.', who: 'nana', emote: 'heart' },
  { say: "I'm afraid the farm is a bit... overgrown. And a big storm last month made a mess of the whole valley.", who: 'bram', emote: 'sweat' },
  { say: 'The Valley Hall, the old bridge, the greenhouse, the mine lift, the pier, even the valley train — all broken!', who: 'bram', emote: 'sad' },
  { say: 'But here is our plan! The Valley Hall has six restoration boards. Each one needs things from around the valley.', who: 'bram', emote: 'idea' },
  { say: 'Crops, forage, fish, animal goods, minerals and crafted things. Fill a board, and we can fix part of the valley!', who: 'bram' },
  { say: 'Rosemary always said, "A valley is fixed one kind thing at a time." I think she would be so happy you are here.', who: 'nana', emote: 'happy' },
  { say: "There's a letter in your mailbox with some seeds to start. Till the soil with your hoe, plant, and water every day!", who: 'bram' },
  { say: 'Come visit us in town anytime. Welcome home, {name}!', who: 'bram', emote: 'music' },
]);

export const REPAIRS: Record<string, CutsceneDef> = {
  forage: S('repair.forage', 'mountain', 'bridgeEnd', [
    { id: 'player', pos: [1, 1], dir: 1 },
    { id: 'basil', pos: [0, 1], dir: 2 },
    { id: 'bram', pos: [2, 0], dir: 1 },
  ], [
    { say: 'Look at that! The old bridge is as good as new!', who: 'bram', emote: 'happy' },
    { say: 'Thank you, {name}. Every leaf and berry you brought helped. The quarry is open again.', who: 'basil', emote: 'heart' },
    { say: 'Rocks and shiny stones pop up in the quarry every day. Bring your pickaxe!', who: 'basil' },
  ]),
  crops: S('repair.crops', 'farm', 'fromGreenhouse', [
    { id: 'player', pos: [0, 2], dir: 3 },
    { id: 'pippa', pos: [-1, 1], dir: 3 },
    { id: 'hollis', pos: [1, 1], dir: 3 },
  ], [
    { say: 'Ta-da! Your greenhouse is fixed! Every single pane of glass!', who: 'pippa', emote: 'happy' },
    { say: 'Rosemary grew tomatoes in there all winter long. It\'s good to see it shine again.', who: 'hollis', emote: 'heart' },
    { say: 'Anything grows in there, any season! And my store will sell every kind of seed for you now!', who: 'pippa', emote: 'idea' },
  ]),
  fish: S('repair.fish', 'beach', 'dock', [
    { id: 'player', pos: [0, -1], dir: 0 },
    { id: 'wren', pos: [1, 0], dir: 1 },
  ], [
    { say: 'Arrr, would ye look at that! The pier is back, longer and stronger than ever!', who: 'wren', emote: 'happy' },
    { say: 'Big fish swim out past the end of the pier. Tuna, octopus, swordfish — the real whoppers!', who: 'wren', emote: 'idea' },
    { say: 'Pickles says thank ye too. Squawk! ...That means thank ye.', who: 'wren', emote: 'laugh' },
  ]),
  animal: S('repair.animal', 'town', 'station', [
    { id: 'player', pos: [0, 2], dir: 3 },
    { id: 'toby', pos: [-1, 1], dir: 2 },
    { id: 'kai', pos: [1, 1], dir: 1 },
  ], [
    { say: 'Choo choo! Do you hear that? The Valley Train is running again!', who: 'toby', emote: 'music' },
    { say: 'Visitors are coming! Real visitors! I\'m going to show them my bug collection!', who: 'kai', emote: 'surprised' },
    { say: 'And on Fruitdays and Restdays, my traveling cart will be right here with treasures from far away. All aboard!', who: 'toby', emote: 'happy' },
  ]),
  minerals: S('repair.minerals', 'minelobby', 'lumi', [
    { id: 'player', pos: [0, 1], dir: 3 },
    { id: 'lumi', pos: [1, 0], dir: 1 },
    { id: 'grit', pos: [-1, 0], dir: 2 },
  ], [
    { say: 'It WORKS! The Mine Lift works! Bzzzt-whirr-DING!', who: 'lumi', emote: 'surprised' },
    { say: 'Took the right minerals and a lot of elbow grease. Good work, kid.', who: 'grit', emote: 'happy' },
    { say: 'The elevator can go below floor 20 now — the Glow Caves and the Crystal Core! Rosemary\'s old maps say something special is at the very bottom...', who: 'lumi', emote: 'idea' },
  ]),
  crafted: S('repair.crafted', 'hall', 'center', [
    { id: 'player', pos: [0, 2], dir: 3 },
    { id: 'bram', pos: [-1, 0], dir: 0 },
    { id: 'juno', pos: [1, 0], dir: 0 },
  ], [
    { say: 'Look at our Valley Hall! New paint, a new clock, and...', who: 'bram', emote: 'happy' },
    { say: '...and my mural! I painted the whole valley. See? That little farmer is you.', who: 'juno', emote: 'heart' },
    { say: 'There is just one thing left: the crystal lamp. Rosemary built it to light up the Hall.', who: 'bram' },
    { say: 'She said the light came from a "heartstone" hidden deep, deep in the mine.', who: 'bram', emote: 'question' },
  ]),
};

export const HEARTSTONE = S('lamp', 'hall', 'center', [
  { id: 'player', pos: [0, -1], dir: 3 },
  { id: 'nana', pos: [-2, 0], dir: 3 },
], [
  { say: 'You place the Heartstone in the crystal lamp. It glows warm and pink, like a sunrise.', who: 'player', emote: 'heart' },
  { say: 'Oh my... that\'s the glow I remember. Rosemary would light it every Starlight Night.', who: 'nana', emote: 'heart' },
  { say: 'Thank you, dear. You found her heart for the valley.', who: 'nana', emote: 'happy' },
]);

export const FINALE = S('finale', 'hall', 'center', [
  { id: 'player', pos: [0, 2], dir: 3 },
  { id: 'bram', pos: [0, -3], dir: 0 },
  { id: 'nana', pos: [-2, -2], dir: 0 },
  { id: 'juno', pos: [2, -2], dir: 0 },
  { id: 'pippa', pos: [-6, 1], dir: 2 },
  { id: 'grit', pos: [-6, 3], dir: 2 },
  { id: 'hollis', pos: [-4, 3], dir: 3 },
  { id: 'goldie', pos: [-3, 1], dir: 2 },
  { id: 'kai', pos: [-2, 2], dir: 2 },
  { id: 'sunny', pos: [4, 1], dir: 1 },
  { id: 'ottilie', pos: [6, 1], dir: 1 },
  { id: 'toby', pos: [6, 3], dir: 1 },
  { id: 'lumi', pos: [3, 2], dir: 1 },
  { id: 'basil', pos: [4, 3], dir: 3 },
  { id: 'wren', pos: [-4, 1], dir: 2 },
], [
  { say: 'Friends! Neighbors! Welcome to the grand reopening of the Cliff Valley Hall!', who: 'bram', emote: 'music' },
  { say: 'A year ago, the storm left our valley broken. The bridge, the pier, the greenhouse, the mine lift, the train...', who: 'bram' },
  { say: 'And then {name} arrived. One seed, one fish, one friendly hello at a time, it all came back.', who: 'bram', emote: 'heart' },
  { say: 'The quarry bridge was my favorite. Every leaf you brought made the woods a little happier.', who: 'basil', emote: 'happy' },
  { say: 'And the Mine Lift! Bzzzt-DING! Best project ever. Thanks, partner!', who: 'lumi', emote: 'laugh' },
  { say: 'The train whistle sounds sweeter than ever. Thank you, {name}. All aboard for many more years!', who: 'toby', emote: 'music' },
  { say: 'Our museum is full of wonders again. You discovered so much history!', who: 'ottilie', emote: 'happy' },
  { say: 'I wrote a poem. "The farmer came, the valley grew. We\'re all better, thanks to you." ...Don\'t tell anyone I said that.', who: 'grit', emote: 'sweat' },
  { say: 'You know what this calls for? FOOD! Cake for everyone, on the house!', who: 'sunny', emote: 'music' },
  { say: 'Can I say something? You\'re the coolest farmer ever. Even cooler than a rainbow beetle!', who: 'kai', emote: 'heart' },
  { say: 'Rosemary planted the first seed in this valley. And you helped it bloom again.', who: 'nana', emote: 'heart' },
  { say: 'Look up, everyone! The crystal lamp...', who: 'juno', emote: 'surprised' },
  { emote: 'happy', who: 'player' },
  { wait: 1 },
  { say: 'To Cliff Valley — and to {name} of {farm} Farm! Hip hip, HOORAY!', who: 'bram', emote: 'music' },
  { emote: 'heart', who: 'nana' },
  { emote: 'music', who: 'kai' },
  { emote: 'laugh', who: 'wren' },
  { wait: 1.2 },
]);
