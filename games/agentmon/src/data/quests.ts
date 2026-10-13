/**
 * Quests: the main story and the side quests. Each stage is one short line for the quest log; a
 * finished quest has stage -1. `goal` (main story) is where the quest arrow points for each stage,
 * and where the headless playthrough bot heads next.
 */
export interface QuestGoal { map: string; x: number; y: number }
export interface QuestDef { id: string; title: string; side: boolean; stages: string[]; goals?: (QuestGoal | null)[] }

export const MAIN_STAGES: [string, QuestGoal | null][] = [
  ['Go to the Field Agent Academy, the big blue building in town.', { map: 'brightmoor', x: 19, y: 6 }],
  ['Choose a partner in the Academy Garden, east of town.', { map: 'academy-garden', x: 6, y: 4 }],
  ['Go north on the Meadow Path to Saltwhistle.', { map: 'meadow-path', x: 10, y: 0 }],
  ['Find Keeper Marisol at the Lighthouse on Sandy Shore.', { map: 'saltwhistle', x: 29, y: 10 }],
  ['Make a Tide friend, paddle to the Lighthouse and solve its Trial.', { map: 'sandy-shore', x: 31, y: 7 }],
  ['Take the Cliff Road, west of Saltwhistle, to Mossgrove.', { map: 'cliff-road', x: 12, y: 0 }],
  ['Solve the Canopy Trial in Mossgrove Woods.', { map: 'mossgrove-woods', x: 14, y: 3 }],
  ['Find where the fog comes from, in Whisper Woods.', { map: 'whisper-woods', x: 13, y: 20 }],
  ['Light the way through Glimmer Cave to Cragtop.', { map: 'cragtop-slopes', x: 12, y: 0 }],
  ['Solve the Old Mine Trial in Cragtop.', { map: 'cragtop', x: 22, y: 2 }],
  ['Follow the Canyon Trail west to Dunehollow.', { map: 'canyon-trail', x: 0, y: 10 }],
  ['Solve the Redrock Trial on the Dune Flats.', { map: 'dune-flats', x: 21, y: 17 }],
  ['Cross Frost Pass to Frostfall.', { map: 'frost-pass', x: 14, y: 0 }],
  ['Solve the Summit Trial above Frostfall.', { map: 'frostfall-slopes', x: 12, y: 2 }],
  ['Ride the updraft from Updraft Ridge up to the Sky Island.', { map: 'updraft-ridge', x: 3, y: 5 }],
  ['Solve the Beacon Spire Trial and relight the last Beacon.', { map: 'sky-island', x: 15, y: 6 }],
  ['Meet the guardian of Sunreach.', { map: 'spire-top', x: 5, y: 6 }],
  ['Sunreach shines! Explore, fill your Field Guide, and try the Challenge Tower.', null],
];

const side = (id: string, title: string, stage: string): QuestDef => ({ id, title, side: true, stages: [stage] });

export const QUESTS: QuestDef[] = [
  { id: 'main', title: 'Relight the Beacons', side: false, stages: MAIN_STAGES.map(s => s[0]), goals: MAIN_STAGES.map(s => s[1]) },
  side('sq-dale', 'Brighter skies', 'Relight three Beacons, then visit Mr. Dale in Brightmoor.'),
  side('sq-bo', 'Bo\'s big bet', 'Befriend ten different kinds of Agentmon, then visit Bo in Brightmoor.'),
  side('sq-shell', 'The lost shell', 'Find Wren\'s pink shell on Sandy Shore.'),
  side('sq-tov', 'A bubble duet', 'Befriend a Lullakin and visit Grandpa Tov in Saltwhistle.'),
  side('sq-nets', 'Nets for Coral', 'Tell Coral on Sandy Shore that her nets are ready.'),
  side('sq-pell', 'A climber\'s snack', 'Bring two Crunch Seeds to Mr. Pell on the Cliff Road.'),
  side('sq-bun', 'Honey buns', 'Bring a Honey Drop to Mrs. Bun in Mossgrove.'),
  side('sq-pippa', 'A tiny umbrella', 'Befriend a Snipsy and show it to Pippa in Mossgrove.'),
  side('sq-ranger', 'The forest count', 'Befriend a Fiddlit for Ranger Moss in Mossgrove Woods.'),
  side('sq-hush', 'A soft glow', 'Befriend a Gleamgrub and show Mr. Hush in Whisper Woods.'),
  side('sq-mo', 'Lost in the dark', 'Find the charm in the dark part of Glimmer Cave.'),
  side('sq-gil', 'Wake the machine', 'Power up the machine by the Old Mine with a Volt friend.'),
  side('sq-tam', 'Tam\'s hero', 'Win a spar against Agent Sami on the Cragtop Slopes.'),
  side('sq-rue', 'A garden digger', 'Befriend a Burrowby and visit Granny Rue in Cragtop.'),
  side('sq-ochre', 'Crystal study', 'Befriend a Glintle and visit Dr. Ochre on the Canyon Trail.'),
  side('sq-saffi', 'Pepper jam', 'Bring two Sun Peppers to Mx. Saffi in Dunehollow.'),
  side('sq-ollie', 'Hover show', 'Befriend a Hummet and show it to Ollie in Dunehollow.'),
  side('sq-zara', 'Melon juice', 'Bring a Moon Melon to Auntie Zara in Dunehollow.'),
  side('sq-nia', 'The red mitten', 'Find Nia\'s red mitten in Frost Pass.'),
  side('sq-purl', 'Minty yarn', 'Bring two Frost Mints to Mr. Purl in Frostfall.'),
  side('sq-floe', 'Layers of ice', 'Befriend a Hailbit and show Mr. Floe on the Frostfall Slopes.'),
  side('sq-ana', 'The runaway kite', 'Find Ana\'s blue kite on the Sky Island.'),
  side('guardian-tidecrest', 'The humming pearl', 'Paddle east past the Lighthouse to Deep Blue Cove.'),
  side('guardian-archwyn', 'The canyon bell', 'Ring the Canyon Bell by the great arch on the Dune Flats.'),
  side('guardian-frostmantle', 'The frost feather', 'Take the Frost Feather to the top of the Frostfall Slopes.'),
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));
