/**
 * Ring courses. Points are relative to the system's main body. Gates must be flown in order.
 * Medal times are for Normal; Easy multiplies them (see systems/difficulty.ts).
 * 3D: medal times are unchanged from 2D. Flight bots (tests/unit/flightBots.test.ts) show they are
 * generous in 3D (careful flying already earns gold); tightening them is a balance choice.
 */
export interface CourseDef {
  id: string;
  name: string;
  system: string;
  /** Where the start line is (relative to the main body). */
  start: [number, number];
  gates: Array<[number, number]>;
  gateRadius: number;
  /** Seconds for gold, silver, bronze on Normal. */
  medals: { gold: number; silver: number; bronze: number };
  coins: { gold: number; silver: number; bronze: number };
  /** Practice courses have no medals. */
  practice?: boolean;
  /** 3D: height of each gate above the orbital plane (weaves over, under and through the rings). */
  heights?: number[];
  /** 3D: height of the start line. */
  startH?: number;
}

export const COURSES: CourseDef[] = [
  {
    id: 'training', name: 'Training Rings', system: 'earth', start: [420, 0], gateRadius: 120, practice: true,
    gates: [[700, -100], [1050, -150], [1400, -80], [1500, 250], [1100, 420], [700, 280]],
    heights: [0, 70, 130, 80, -40, -90], startH: 0,
    medals: { gold: 0, silver: 0, bronze: 0 }, coins: { gold: 0, silver: 0, bronze: 0 },
  },
  {
    id: 'race_ripple', name: 'Ring Ripple', system: 'saturn', start: [-700, 520], gateRadius: 115,
    gates: [[-400, 640], [-50, 700], [300, 660], [620, 520], [820, 250], [760, -80], [480, -300], [100, -420], [-300, -360], [-640, -160], [-760, 160]],
    heights: [150, 230, 120, -100, -210, -110, 110, 220, 120, -110, -180], startH: 60,
    medals: { gold: 18, silver: 24, bronze: 34 }, coins: { gold: 60, silver: 40, bronze: 25 },
  },
  {
    id: 'race_cassini', name: 'Cassini Curve', system: 'saturn', start: [-900, -100], gateRadius: 105,
    gates: [[-700, -450], [-300, -620], [150, -650], [550, -520], [880, -250], [950, 150], [700, 480], [300, 640], [-150, 620], [-550, 500], [-850, 250], [-600, 0], [-250, 150]],
    heights: [-160, -60, 80, 200, 120, -40, -200, -120, 40, 180, 90, 0, 260], startH: -100,
    medals: { gold: 24, silver: 31, bronze: 42 }, coins: { gold: 80, silver: 55, bronze: 35 },
  },
  {
    id: 'race_titan', name: 'Titan Twister', system: 'saturn', start: [760, -620], gateRadius: 100,
    gates: [[1000, -800], [1300, -920], [1620, -760], [1660, -440], [1460, -220], [1140, -230], [980, -440], [1120, -660], [1300, -860], [1500, -640], [1480, -380]],
    heights: [0, 45, 90, 135, 180, 135, 90, 45, 0, -45, -90], startH: 0,
    medals: { gold: 21, silver: 28, bronze: 38 }, coins: { gold: 90, silver: 60, bronze: 40 },
  },
];

export const COURSE_BY_ID: Record<string, CourseDef> = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

export function medalFor(course: CourseDef, seconds: number, timeMult: number): Medal {
  if (course.practice) return 'none';
  if (seconds <= course.medals.gold * timeMult) return 'gold';
  if (seconds <= course.medals.silver * timeMult) return 'silver';
  if (seconds <= course.medals.bronze * timeMult) return 'bronze';
  return 'none';
}
