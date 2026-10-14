/**
 * Every effect that changes brightness over and over, in one place, so a test can prove the rule:
 * nothing flashes more than 3 times a second (tests/unit/flash.test.ts; Agentmon's pattern). Rates
 * are full cycles a second. Movement (swaying, bobbing, flapping) isn't flashing and is listed
 * separately. One-off pulses (a poof of leaves) happen once per event.
 */
export const FLASH_LIMIT_HZ = 3;

export const FX = {
  /** A compost pile's soft shimmer, saying "tap me". */
  compostShimmerHz: 0.5,
  /** The selected plant card's glow breathing. */
  cardGlowHz: 0.6,
  /** A berry's glint in flight. */
  berryGlintHz: 0.8,
  /** High's bloom on the sunny meadow: a slow warm breathing of the glow strength. */
  bloomBreatheHz: 0.12,
};

/** Gentle repeating movement (not brightness). Off with reduced motion. */
export const MOTION = {
  /** Plants swaying in the breeze. */
  swayHz: 0.35,
  /** A critter's walk bob. */
  walkBobHz: 1.6,
  /** The magpie's wing flap. */
  flapHz: 2.4,
  /** Grass rippling. */
  grassHz: 0.25,
};

/** A smooth wave from -1 to 1 at `hz` cycles a second, at time `t` in seconds. */
export const wave = (hz: number, t: number, phase = 0) => Math.sin(2 * Math.PI * hz * t + phase);
