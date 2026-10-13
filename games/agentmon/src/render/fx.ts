/**
 * Every effect that changes brightness over and over, in one place, so a test can prove the rule:
 * nothing flashes more than 3 times a second (tests/unit/flash.test.ts). Rates are full cycles a
 * second. Movement (bobbing, hopping) isn't flashing and isn't listed. One-off pulses (a hit's
 * sparkles, the glow when a friend rests or befriends) happen once per event, and each event is
 * followed by its message, so they can't repeat quickly.
 */
export const FLASH_LIMIT_HZ = 3;

export const FX = {
  /** The quest arrow's glow pulse (overworld). */
  questPulseHz: 0.64,
  /** A shimmer Agentmon's twinkle on the map. */
  shimmerTwinkleHz: 0.95,
  /** A napping Agentmon's "z z z" fading in and out (battle). */
  napFadeHz: 0.32,
  /** The soft glow behind a growing Agentmon (evolution). */
  evolveGlowHz: 0.53,
};

/** A smooth wave from -1 to 1 at `hz` cycles a second, at time `t` in seconds. */
export const wave = (hz: number, t: number, phase = 0) => Math.sin(2 * Math.PI * hz * t + phase);
