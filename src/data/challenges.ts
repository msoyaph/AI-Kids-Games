import type { ChallengeData } from './types';

/**
 * 40 mission challenges (34 + 6 for the Frost Cup). Every locked racer, kart part, paint, decal and arena is earned here
 * (cups and speed classes unlock through Grand Prix trophies).
 */
export const CHALLENGES: ChallengeData[] = [
  { id: 'first-finish', name: 'First Finish', description: 'Finish any race.', goal: { type: 'finishPosition', maxPosition: 8 }, cumulative: false, reward: { kind: 'paint', id: 'bubblegum' } },
  { id: 'drift-rookie', name: 'Drift Rookie', description: 'Drift for 5 seconds without letting go.', goal: { type: 'driftSeconds', seconds: 5 }, cumulative: false, reward: { kind: 'decal', id: 'bolt' } },
  { id: 'drift-master', name: 'Drift Master', description: 'Drift for 10 seconds without letting go.', goal: { type: 'driftSeconds', seconds: 10 }, cumulative: false, reward: { kind: 'body', id: 'rocket' } },
  { id: 'spark-collector', name: 'Spark Collector', description: 'Earn 25 orange (or better) mini-turbos.', goal: { type: 'miniTurbos', count: 25, tier: 2 }, cumulative: true, reward: { kind: 'wheels', id: 'roller' } },
  { id: 'super-sparks', name: 'Super Sparks', description: 'Earn a pink super mini-turbo.', goal: { type: 'miniTurbos', count: 1, tier: 3 }, cumulative: true, reward: { kind: 'decal', id: 'flame' } },
  { id: 'trickster', name: 'Trickster', description: 'Do 25 tricks off ramps.', goal: { type: 'tricks', count: 25 }, cumulative: true, reward: { kind: 'glider', id: 'parasol' } },
  { id: 'rocket-start', name: 'Rocket Start', description: 'Get a perfect rocket start.', goal: { type: 'perfectStart', count: 1 }, cumulative: true, reward: { kind: 'paint', id: 'lava' } },
  { id: 'no-items', name: 'Pure Driving', description: 'Win a race without using a single item.', goal: { type: 'winRace', noItemsUsed: true }, cumulative: false, reward: { kind: 'body', id: 'pickup' } },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Hit rivals with items 30 times.', goal: { type: 'hitWithItem', count: 30 }, cumulative: true, reward: { kind: 'decal', id: 'checker' } },
  { id: 'bullseye', name: 'Bullseye Ball', description: 'Hit a rival with a Bumper Ball.', goal: { type: 'hitWithItem', count: 1, item: 'bumperBall' }, cumulative: true, reward: { kind: 'paint', id: 'mint' } },
  { id: 'plane-spotter', name: 'Plane Spotter', description: 'Make a Paper Plane miss with a hop, trick or boost.', goal: { type: 'dodge', count: 1 }, cumulative: true, reward: { kind: 'decal', id: 'waves' } },
  { id: 'shortcut-seeker', name: 'Shortcut Seeker', description: 'Take 10 shortcuts.', goal: { type: 'shortcut', count: 10 }, cumulative: true, reward: { kind: 'wheels', id: 'donut' } },
  { id: 'boost-buddy', name: 'Boost Buddy', description: 'Drive over 50 boost pads.', goal: { type: 'boostPads', count: 50 }, cumulative: true, reward: { kind: 'paint', id: 'midnight' } },
  { id: 'comeback', name: 'Comeback Kid', description: 'Win a race after being 6th or worse.', goal: { type: 'comeback', fromPosition: 6 }, cumulative: false, reward: { kind: 'body', id: 'scooter' } },
  { id: 'untouchable', name: 'Untouchable', description: 'Finish a race with items on without getting hit.', goal: { type: 'noHitRace' }, cumulative: false, reward: { kind: 'glider', id: 'butterfly' } },
  { id: 'front-runner', name: 'Front Runner', description: 'Lead a whole race from start to finish.', goal: { type: 'leadWholeRace' }, cumulative: false, reward: { kind: 'decal', id: 'number' } },
  { id: 'sunrise-gold', name: 'Sunrise Champion', description: 'Win gold in the Sunrise Cup (any speed).', goal: { type: 'trophy', cup: 'sunrise', medal: 'gold' }, cumulative: false, reward: { kind: 'racer', id: 'fennel' } },
  { id: 'thunder-gold', name: 'Thunder Champion', description: 'Win gold in the Thunder Cup (any speed).', goal: { type: 'trophy', cup: 'thunder', medal: 'gold' }, cumulative: false, reward: { kind: 'racer', id: 'sprocket' } },
  { id: 'galaxy-gold', name: 'Galaxy Champion', description: 'Win gold in the Galaxy Cup (any speed).', goal: { type: 'trophy', cup: 'galaxy', medal: 'gold' }, cumulative: false, reward: { kind: 'racer', id: 'luma' } },
  { id: 'legend-gold', name: 'Legend Champion', description: 'Win gold in the Legend Cup (any speed).', goal: { type: 'trophy', cup: 'legend', medal: 'gold' }, cumulative: false, reward: { kind: 'racer', id: 'waddles' } },
  { id: 'trophy-hunter', name: 'Trophy Hunter', description: 'Collect 8 trophies of any colour.', goal: { type: 'trophies', count: 8 }, cumulative: false, reward: { kind: 'body', id: 'royal' } },
  { id: 'ghost-chaser', name: 'Ghost Chaser', description: 'Beat 4 staff ghosts in Time Trial.', goal: { type: 'staffGhosts', count: 4 }, cumulative: false, reward: { kind: 'racer', id: 'zing' } },
  { id: 'staff-star', name: 'Staff Star', description: 'Beat 12 staff ghosts in Time Trial.', goal: { type: 'staffGhosts', count: 12 }, cumulative: false, reward: { kind: 'glider', id: 'cloudpuff' } },
  { id: 'champion-win', name: 'Champion Speed', description: 'Win a race on Champion speed.', goal: { type: 'winRace', speedClass: 'champion' }, cumulative: false, reward: { kind: 'paint', id: 'gold' } },
  { id: 'mirror-win', name: 'Mirror Master', description: 'Win a race in Mirror mode.', goal: { type: 'winRace', mirror: true }, cumulative: false, reward: { kind: 'decal', id: 'swirl' } },
  { id: 'balloon-popper', name: 'Balloon Popper', description: 'Pop 25 balloons in Battle.', goal: { type: 'battlePops', count: 25 }, cumulative: true, reward: { kind: 'arena', id: 'neon-crossroads' } },
  { id: 'battle-champ', name: 'Battle Champ', description: 'Win 3 battles.', goal: { type: 'battleWins', count: 3 }, cumulative: true, reward: { kind: 'racer', id: 'trixie' } },
  { id: 'crater-ace', name: 'Crater Ace', description: 'Win a battle in Crater Bowl.', goal: { type: 'battleWins', count: 1, arena: 'crater-bowl' }, cumulative: true, reward: { kind: 'arena', id: 'coral-ring' } },
  { id: 'ten-races', name: 'Road Trip', description: 'Finish 10 races.', goal: { type: 'totalRaces', count: 10 }, cumulative: false, reward: { kind: 'wheels', id: 'gear' } },
  { id: 'thirty-races', name: 'Marathon Racer', description: 'Finish 30 races.', goal: { type: 'totalRaces', count: 30 }, cumulative: false, reward: { kind: 'decal', id: 'hearts' } },
  { id: 'pro-podium', name: 'Pro Podium', description: 'Finish in the top 3 on Pro speed.', goal: { type: 'finishPosition', maxPosition: 3, speedClass: 'pro' }, cumulative: false, reward: { kind: 'decal', id: 'zigzag' } },
  { id: 'beach-win', name: 'Beach Day', description: 'Win a race on Seashell Boardwalk.', goal: { type: 'winRace', track: 'seashell-boardwalk' }, cumulative: false, reward: { kind: 'body', id: 'bathtub' } },
  { id: 'time-traveller', name: 'Clock Watcher', description: 'Complete 10 Time Trials.', goal: { type: 'timeTrials', count: 10 }, cumulative: false, reward: { kind: 'paint', id: 'prism' } },
  { id: 'trick-star', name: 'Trick Star', description: 'Do 100 tricks off ramps.', goal: { type: 'tricks', count: 100 }, cumulative: true, reward: { kind: 'paint', id: 'tangerine' } },
  // Frost Cup (v0.2)
  { id: 'frost-gold', name: 'Frost Champion', description: 'Win gold in the Frost Cup (any speed).', goal: { type: 'trophy', cup: 'frost', medal: 'gold' }, cumulative: false, reward: { kind: 'racer', id: 'yuki' } },
  { id: 'ice-dancer', name: 'Ice Dancer', description: 'Drift on ice for 30 seconds in total.', goal: { type: 'iceDriftSeconds', seconds: 30 }, cumulative: true, reward: { kind: 'body', id: 'snowcat' } },
  { id: 'frost-ghosts', name: 'Frosty Ghosts', description: 'Beat 2 staff ghosts on Frost Cup tracks.', goal: { type: 'staffGhosts', count: 2, cup: 'frost' }, cumulative: false, reward: { kind: 'wheels', id: 'spikes' } },
  { id: 'frost-shortcuts', name: 'Thin Ice', description: 'Take 8 shortcuts on Frost Cup tracks.', goal: { type: 'shortcut', count: 8, cup: 'frost' }, cumulative: true, reward: { kind: 'glider', id: 'snowflake' } },
  { id: 'peak-winner', name: 'King of the Mountain', description: 'Win a race on Avalanche Peak.', goal: { type: 'winRace', track: 'avalanche-peak' }, cumulative: false, reward: { kind: 'paint', id: 'aurora' } },
  { id: 'lantern-winner', name: 'Festival Star', description: 'Win a race in Lantern Village.', goal: { type: 'winRace', track: 'lantern-village' }, cumulative: false, reward: { kind: 'decal', id: 'snowflakes' } },
];
