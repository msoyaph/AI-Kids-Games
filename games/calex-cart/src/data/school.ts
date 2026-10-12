import type { UnlockRef } from './types';

export type LessonId = 'steering' | 'drifting' | 'rocket' | 'items' | 'shortcuts' | 'gliders';
export type LessonMedal = 'gold' | 'silver' | 'bronze';

export interface LessonData {
  id: LessonId;
  name: string;
  icon: string;
  track: 'school-ring' | 'school-park';
  /** Short, skippable instructions shown before the lesson. */
  steps: string[];
  /** 'time': lower is better (seconds); 'points': higher is better. */
  scoring: 'time' | 'points';
  /** Medal thresholds: time = at most, points = at least. */
  medals: Record<LessonMedal, number>;
  /** Seconds before the lesson ends on its own (points lessons) or the safety cut-off (time lessons). */
  timeLimit: number;
}

/**
 * Driving School: six short lessons on two practice courses. Gold in every lesson unlocks the Learner kart body.
 * Medal thresholds are set from simulated runs (see tests/sim/school.test.ts and scripts/calibrateSchool.ts).
 */
export const LESSONS: LessonData[] = [
  {
    id: 'steering',
    name: 'Steering Gates',
    icon: '🚩',
    track: 'school-ring',
    steps: ['Drive one lap of the Practice Ring.', 'Steer through every flag gate — a missed gate adds 2 seconds.', 'Smooth beats fast: let the kart roll through the corners.'],
    scoring: 'time',
    medals: { gold: 27, silver: 31, bronze: 40 },
    timeLimit: 120,
  },
  {
    id: 'drifting',
    name: 'Drift & Sparks',
    icon: '✨',
    track: 'school-ring',
    steps: ['Hold DRIFT while you turn to slide around a corner.', 'Keep holding: sparks go blue → orange → pink.', 'Let go for a mini-turbo! Blue = 1 point, orange = 2, pink = 3. You have 45 seconds.'],
    scoring: 'points',
    medals: { gold: 11, silver: 6, bronze: 2 },
    timeLimit: 45,
  },
  {
    id: 'rocket',
    name: 'Rocket Start',
    icon: '🚀',
    track: 'school-ring',
    steps: ['Watch the countdown: 3 … 2 … 1 …', 'Press ACCELERATE when the 1 appears for a rocket start (3 points, or 2 if a bit late).', 'Too early and your engine sputters! You get three tries.'],
    scoring: 'points',
    medals: { gold: 8, silver: 5, bronze: 2 },
    timeLimit: 40,
  },
  {
    id: 'items',
    name: 'Items & Dodging',
    icon: '🎯',
    track: 'school-ring',
    steps: ['You get Bumper Balls. Press ITEM to roll one forward.', 'Pop the balloon targets on the track (1 point each).', 'Steer around the purple goo puddles: each one you dodge is 1 more point.'],
    scoring: 'points',
    medals: { gold: 6, silver: 4, bronze: 2 },
    timeLimit: 90,
  },
  {
    id: 'shortcuts',
    name: 'Shortcut Secrets',
    icon: '🌿',
    track: 'school-park',
    steps: ['Every track hides a risky shortcut.', 'Here it is a grassy cut across the third corner — grass is slow…', '…so fire your three Turbo Cans one after another while you cross it! (Silver and gold need the shortcut.)'],
    scoring: 'time',
    medals: { gold: 25.3, silver: 26.5, bronze: 32 },
    timeLimit: 90,
  },
  {
    id: 'gliders',
    name: 'Glider Rings',
    icon: '🪂',
    track: 'school-park',
    steps: ['Drive up the blue glider ramp at full speed — your glider opens by itself.', 'Steer in the air to fly through the rings (1 point each).', 'Press BRAKE in the air to dive down a little.'],
    scoring: 'points',
    medals: { gold: 5, silver: 3, bronze: 1 },
    timeLimit: 60,
  },
];

/** Gold in every lesson unlocks this. */
export const SCHOOL_REWARD: UnlockRef = { kind: 'body', id: 'learner' };

export function findLesson(id: string): LessonData {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0];
}

export function medalFor(lesson: LessonData, score: number): LessonMedal | null {
  const m = lesson.medals;
  if (lesson.scoring === 'time') return score <= m.gold ? 'gold' : score <= m.silver ? 'silver' : score <= m.bronze ? 'bronze' : null;
  return score >= m.gold ? 'gold' : score >= m.silver ? 'silver' : score >= m.bronze ? 'bronze' : null;
}
