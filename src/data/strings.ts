import type { BuildFail } from '../sim/Game';

/** Short, clear messages (middle-school reading level). */
export const BUILD_FAIL_MSG: Record<BuildFail, string> = {
  path: 'Blocked: that would seal the only route.',
  coins: 'Not enough gold.',
  terrain: 'Nothing can be built there.',
  occupied: 'That plate is already taken.',
  locked: 'Unlock that element first.',
  outside: 'Nothing can be built there.',
};

export const WIN_LINES = [
  'Grid holding at full strength. Nicely done, Commander.',
  'The breach is sealed. For now.',
  'Shardbound signal lost. That one was textbook.',
  'Citadel secure. I logged that as a "flawless-ish" defense.',
];

export const LOSE_LINES = [
  'The Citadel core is drained. Regroup and try a new layout.',
  'They found a gap. Longer routes buy your towers more time.',
  'Defense collapsed. Check which wave broke through and plan for it.',
];

export const TIPS = [
  'Tip: Longer routes mean more time under fire. Shape the maze.',
  'Tip: Water beats Fire, Fire beats Nature, Nature beats Water.',
  'Tip: Light beats Shadow, Shadow beats Earth, Earth beats Light.',
  'Tip: Flyers ignore the maze. Keep some towers that can hit air.',
  'Tip: Unspent gold earns interest at the end of each wave.',
  'Tip: Upgrades usually beat new towers once your maze is built.',
  'Tip: Two elements unlock a combo tower.',
  'Tip: Press and hold any tower or enemy for its full stats.',
];
