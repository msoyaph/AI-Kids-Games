/** One-time tutorials, shown the first time each thing happens. Short, with the right controls. */
export interface Tutorial { title: string; touch: string; keys: string; pad: string }

export const TUTORIALS: Record<string, Tutorial> = {
  move: { title: 'Walking', touch: 'Drag the stick, or tap where you want to go.', keys: 'Use the arrow keys or WASD. Or click where you want to go.', pad: 'Use the stick or the d-pad.' },
  talk: { title: 'Saying hi', touch: 'Tap someone, or face them and press A.', keys: 'Face someone and press Z, Space or Enter. Or click them.', pad: 'Face someone and press A.' },
  battle: { title: 'Friendly spars', touch: 'Tap a move. Moves cost a little energy. Rest gets some back. A tired friend just naps.', keys: 'Pick a move with the arrow keys and press Enter. Rest gets energy back.', pad: 'Pick a move with the d-pad and press A. Rest gets energy back.' },
  rest: { title: 'Rest Stops', touch: 'Rest Stops have a heart on the roof. Your friends nap and wake up full of energy. It is free!', keys: 'Rest Stops have a heart on the roof. Your friends nap and wake up full of energy. It is free!', pad: 'Rest Stops have a heart on the roof. Your friends nap and wake up full of energy. It is free!' },
  befriend: { title: 'Making friends', touch: 'Spar with a wild Agentmon until it is tired. Then tap Befriend and tap when the spark is in the glow!', keys: 'Spar until it is tired. Then pick Befriend and press Space when the spark is in the glow!', pad: 'Spar until it is tired. Then pick Befriend and press A when the spark is in the glow!' },
  menu: { title: 'Your menu', touch: 'Tap Menu for your team, bag, Field Guide, map, quests and settings.', keys: 'Press M or Tab for your team, bag, Field Guide, map, quests and settings.', pad: 'Press Start for your team, bag, Field Guide, map, quests and settings.' },
  puzzle: { title: 'Trial puzzles', touch: 'Walk into a block to push it. Stuck? Tap Reset to put everything back.', keys: 'Walk into a block to push it. Stuck? Press R or pick Reset.', pad: 'Walk into a block to push it. Stuck? Press Y or pick Reset.' },
  ability: { title: 'Field abilities', touch: 'Your friends can help! Walk up to vines, rocks or water and press A.', keys: 'Your friends can help! Face vines, rocks or water and press Z.', pad: 'Your friends can help! Face vines, rocks or water and press A.' },
};
