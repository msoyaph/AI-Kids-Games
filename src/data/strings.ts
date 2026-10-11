import type { BuildFail } from '../sim/Game';

/** Short, simple messages for young players. */
export const BUILD_FAIL_MSG: Record<BuildFail, string> = {
  path: 'That would block the path!',
  coins: 'Not enough coins yet!',
  terrain: "You can't build there.",
  occupied: 'A tower is already there.',
  locked: 'Unlock that element first!',
  outside: "You can't build there.",
};

export const WIN_LINES = [
  'You saved the crystals!',
  'Hooray! The castle is safe!',
  'Super job, hero!',
  'The Grumblewumps went home!',
];

export const LOSE_LINES = [
  'Oh no! The Grumblewumps borrowed the crystals.',
  'So close! Let’s try again.',
  'Those cheeky creatures! Try a longer maze.',
];

export const TIPS = [
  'Tip: Make the path long and wiggly!',
  'Tip: Water beats Fire. Fire beats Nature. Nature beats Water.',
  'Tip: Light beats Shadow. Shadow beats Earth. Earth beats Light.',
  'Tip: Flyers ignore your maze. Make sure towers can hit them!',
  'Tip: Saved coins earn a little extra each wave.',
  'Tip: Upgrade towers to make them super strong.',
  'Tip: Two elements make a COMBO tower!',
  'Tip: Press and hold a tower to learn about it.',
];
