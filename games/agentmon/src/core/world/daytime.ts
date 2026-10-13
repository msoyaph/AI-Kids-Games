/**
 * Time of day (1.1): a gentle cycle driven by play time, so it moves along while you play and a
 * saved game picks up where it was (no clock, no new save data). Most of the cycle is daytime; the
 * evening and the night are short, bright and friendly. Indoors and in caves there is no sky.
 */
export type DayTime = 'morning' | 'day' | 'evening' | 'night';
export const DAY_TIMES: readonly DayTime[] = ['morning', 'day', 'evening', 'night'];

/** One full day, in minutes of play. */
export const DAY_MINUTES = 20;
/** Where each part of the day starts, as a share of the cycle. */
const STARTS: [DayTime, number][] = [['morning', 0], ['day', 0.15], ['evening', 0.65], ['night', 0.82]];

/** Share of the way through the day (0–1) after `playMs` of play. A new game starts mid-morning. */
export function dayShare(playMs: number): number {
  const t = (Math.max(0, playMs) / 60000 / DAY_MINUTES + 0.08) % 1;
  return t;
}

export function dayTime(playMs: number): DayTime {
  const t = dayShare(playMs);
  let out: DayTime = 'morning';
  for (const [name, at] of STARTS) if (t >= at) out = name;
  return out;
}

/** Play time that lands in the middle of a part of the day (capture routes and tests). */
export function playMsFor(time: DayTime): number {
  const share = { morning: 0.05, day: 0.4, evening: 0.73, night: 0.9 }[time];
  return (((share - 0.08 + 1) % 1) * DAY_MINUTES * 60000);
}

/**
 * How much night there is (0–1): none by day, rising through the late evening, full in the heart of
 * the night, fading toward dawn. Continuous all the way round, like `duskAmount`.
 */
export function nightAmount(playMs: number): number {
  const t = dayShare(playMs);
  if (t < 0.78) return 0;
  if (t < 0.86) return (t - 0.78) / 0.08;
  if (t < 0.94) return 1;
  return 1 - (t - 0.94) / 0.06;
}

/**
 * How much evening light there is (0 in full day, 1 at the heart of the evening and the night),
 * easing in and out over a minute or so, for the overworld's gentle tint.
 */
export function duskAmount(playMs: number): number {
  const t = dayShare(playMs);
  if (t < 0.12) return 0.5 * (1 - t / 0.12); // the night's last blue fades through the morning
  if (t < 0.59) return 0;
  if (t < 0.65) return (t - 0.59) / 0.06; // into the evening
  if (t < 0.94) return 1;
  return 1 - (0.5 * (t - 0.94)) / 0.06; // toward dawn (continues at the top of the cycle)
}
