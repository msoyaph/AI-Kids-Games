import { describe, expect, it } from 'vitest';
import {
  angleGap, arcSize, blindHitChance, moodFill, moodMatchFill, moodRounds, sparkAngle, sparkFill, sparkSetup, tapFill, type BefriendContext,
} from '../../src/core/befriend';
import { makeCreature, maxEnergy } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { TUNING } from '../../src/tuning';
import { dex } from './fixtures';

const foe = (share = 0.3) => {
  const c = makeCreature(dex, { species: 'fx-flare', level: 12, personality: 'shy' }, new Rng(9));
  c.energy = Math.round(maxEnergy(dex, c) * share);
  return c;
};
const ctx = (o: Partial<BefriendContext> = {}): BefriendContext => ({ foe: foe(), mood: 'calm', difficulty: 'normal', seed: 5, ...o });

describe('befriending odds (Spark Ring)', () => {
  it('a more tired Agentmon gives a bigger arc', () => {
    expect(arcSize(dex, ctx({ foe: foe(0.05) }))).toBeGreaterThan(arcSize(dex, ctx({ foe: foe(0.35) })));
  });

  it('its favorite snack helps most, any snack helps a little', () => {
    const none = arcSize(dex, ctx()), other = arcSize(dex, ctx({ snack: 'sea-crisp' })), fav = arcSize(dex, ctx({ snack: 'berry-bun' }));
    expect(other).toBeGreaterThan(none);
    expect(fav).toBeGreaterThan(other);
    expect(sparkSetup(dex, ctx({ snack: 'berry-bun' })).speed).toBeLessThan(sparkSetup(dex, ctx()).speed);
  });

  it('a happy mood helps and a grumpy one makes it harder', () => {
    expect(arcSize(dex, ctx({ mood: 'happy' }))).toBeGreaterThan(arcSize(dex, ctx()));
    expect(arcSize(dex, ctx({ mood: 'grumpy' }))).toBeLessThan(arcSize(dex, ctx()));
  });

  it('Easy is friendlier than Normal, and Normal than Hard', () => {
    const e = sparkSetup(dex, ctx({ difficulty: 'easy' })), n = sparkSetup(dex, ctx()), h = sparkSetup(dex, ctx({ difficulty: 'hard' }));
    expect(e.arc).toBeGreaterThan(n.arc);
    expect(n.arc).toBeGreaterThan(h.arc);
    expect(e.speed).toBeLessThan(h.speed);
  });

  it('stays inside sensible limits', () => {
    const tiny = arcSize(dex, ctx({ foe: foe(0.4), mood: 'grumpy', difficulty: 'hard' }));
    const huge = arcSize(dex, ctx({ foe: foe(0), mood: 'happy', difficulty: 'easy', snack: 'berry-bun' }));
    expect(tiny).toBeGreaterThanOrEqual(TUNING.befriend.arcMin);
    expect(huge).toBeLessThanOrEqual(TUNING.befriend.arcMax);
    // Even the hardest case gives a fair, visible target.
    expect(blindHitChance(sparkSetup(dex, ctx({ foe: foe(0.4), mood: 'grumpy', difficulty: 'hard' })))).toBeGreaterThan(0.06);
  });

  it('a tap inside the arc fills a whole part, a near miss half, a miss nothing', () => {
    const s = sparkSetup(dex, ctx());
    const centre = s.arcAt[0]!;
    expect(tapFill(s, 0, centre)).toBe(1);
    expect(tapFill(s, 0, centre + s.arc / 2 - 0.5)).toBe(1);
    expect(tapFill(s, 0, centre + s.arc / 2 + 1)).toBe(0.5);
    expect(tapFill(s, 0, centre + 180)).toBe(0);
    expect(sparkFill(s, [s.arcAt[0]!, s.arcAt[1]!, null])).toBe(2);
    expect(sparkFill(s, [s.arcAt[0]! + 180, null, null])).toBe(0);
  });

  it('places arcs from the seed (no hidden roll at tap time)', () => {
    expect(sparkSetup(dex, ctx()).arcAt).toEqual(sparkSetup(dex, ctx()).arcAt);
    expect(sparkSetup(dex, ctx({ seed: 6 })).arcAt).not.toEqual(sparkSetup(dex, ctx()).arcAt);
  });

  it('measures angles around the ring correctly', () => {
    expect(angleGap(350, 10)).toBe(20);
    expect(angleGap(10, 350)).toBe(20);
    expect(angleGap(0, 180)).toBe(180);
    const s = sparkSetup(dex, ctx());
    expect(sparkAngle(s, 1 / s.speed)).toBeCloseTo(0, 5);
  });
});

describe('Mood Match (no timing)', () => {
  it('the kind thing that fits the mood fills a whole part; a near fit half', () => {
    expect(moodFill('sleepy', 'hum', false)).toBe(1);
    expect(moodFill('sleepy', 'pet', false)).toBe(0.5);
    expect(moodFill('sleepy', 'play', false)).toBe(0);
    expect(moodFill('hungry', 'snack', true)).toBe(1);
    expect(moodFill('hungry', 'snack', false)).toBe(0.5);
  });

  it('three right picks always make a friend; moods follow the personality and the seed', () => {
    const c = foe();
    const rounds = moodRounds(c, 11);
    expect(rounds).toEqual(moodRounds(c, 11));
    expect(rounds[0]).toBe('shy'); // shy personalities start shy
    const best = rounds.map(r => ({ playful: 'play', sleepy: 'hum', hungry: 'snack', shy: 'pet' } as const)[r]);
    expect(moodMatchFill(rounds, [...best], true)).toBeGreaterThanOrEqual(TUNING.befriend.need);
  });
});
