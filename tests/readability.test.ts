// Every line a player reads should suit early readers (Flesch–Kincaid grade ≤ 6 for any one line,
// ≤ 3.5 on average), and the rewritten dialogue must keep its structure and tokens.
import { describe, expect, it } from 'vitest';
import { collectTexts } from '../scripts/readability';
import { READING_TARGET, readability } from '../src/core/readability';
import { DIALOGUE, type DialogueTopic } from '../src/data/dialogue';

const ALWAYS = ['player', 'catch', 'villager', 'island'];
const EXTRA: Partial<Record<DialogueTopic, string[]>> = {
  giftLove: ['item'],
  giftLike: ['item'],
  giftNeutral: ['item'],
  giftDislike: ['item'],
  requestDeliver: ['item', 'qty', 'place'],
  requestLost: ['item', 'qty', 'place'],
  requestCatch: ['item', 'qty', 'place'],
  requestThanks: ['item'],
  requestRemind: ['item'],
};

describe('reading level', () => {
  const lines = collectTexts();

  it(`no line is harder than grade ${READING_TARGET.max}`, () => {
    const hard = lines.map((l) => ({ ...l, g: readability(l.text).grade })).filter((l) => l.g > READING_TARGET.max);
    expect(hard.map((l) => `${l.g} ${l.group} ${l.where}: ${l.text}`)).toEqual([]);
  });

  it(`each kind of text averages grade ${READING_TARGET.average} or below`, () => {
    const groups = new Map<string, number[]>();
    for (const l of lines) groups.set(l.group, [...(groups.get(l.group) ?? []), readability(l.text).grade]);
    const over = [...groups].map(([group, gs]) => ({ group, avg: gs.reduce((a, b) => a + b, 0) / gs.length })).filter((x) => x.avg > READING_TARGET.average);
    expect(over).toEqual([]);
    const all = lines.reduce((a, l) => a + readability(l.text).grade, 0) / lines.length;
    expect(all).toBeLessThanOrEqual(READING_TARGET.average);
  });

  it('dialogue keeps every topic, its expression tags and only the tokens each topic gets', () => {
    for (const [p, topics] of Object.entries(DIALOGUE)) {
      for (const [topic, pool] of Object.entries(topics) as [DialogueTopic, string[]][]) {
        expect(pool.length, `${p}.${topic}`).toBeGreaterThan(0);
        const allowed = new Set([...ALWAYS, ...(EXTRA[topic] ?? [])]);
        for (const line of pool) {
          expect(line, `${p}.${topic}`).toMatch(/^\[(neutral|happy|sad|surprised|angry|love|sleepy|smug)\]/);
          for (const m of line.matchAll(/\{([a-z]+)\}/g)) expect(allowed.has(m[1]!), `${p}.${topic}: {${m[1]}} in "${line}"`).toBe(true);
          expect(line, `${p}.${topic}`).not.toMatch(/somewhere \{place\}/);
        }
      }
    }
  });
});
