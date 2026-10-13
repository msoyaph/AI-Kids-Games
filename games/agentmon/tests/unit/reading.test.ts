import { describe, expect, it } from 'vitest';
import type { Cmd, Script } from '../../src/core/script';
import { SCRIPTS } from '../../src/data/dialogue/index';
import { MAPS } from '../../src/data/maps/index';
import { QUESTS } from '../../src/data/quests';
import { TUTORIALS } from '../../src/data/tutorials';

/** Every line a player reads: dialogue, choices, signs, tutorials and the quest log. */
function allText(): string[] {
  const lines: string[] = [];
  const walk = (l: Script) => {
    for (const c of l as Cmd[]) {
      if ('say' in c) lines.push(c.say);
      if ('ask' in c) lines.push(c.ask);
      for (const k of ['then', 'else', 'yes', 'no', 'win', 'lose', 'friend'] as const) {
        const sub = (c as Record<string, unknown>)[k];
        if (Array.isArray(sub)) walk(sub as Script);
      }
    }
  };
  Object.values(SCRIPTS).forEach(walk);
  for (const m of Object.values(MAPS)) for (const o of m.objects) if (o.text) lines.push(o.text);
  for (const t of Object.values(TUTORIALS)) lines.push(t.touch, t.keys, t.pad);
  for (const q of QUESTS) lines.push(...q.stages);
  return lines.map(l => l.replace(/\{\w+\}/g, 'Sam'));
}

const sentences = (l: string) => l.split(/(?<=[.!?…])\s+/).filter(s => /[a-z]/i.test(s));
const words = (s: string) => s.split(/\s+/).filter(w => /[a-z]/i.test(w));
const syllables = (w: string) => {
  let x = w.toLowerCase().replace(/[^a-z]/g, '');
  if (x.length <= 3) return 1;
  x = x.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return Math.max(1, (x.match(/[aeiouy]{1,2}/g) ?? []).length);
};

describe('reading level (ages 7–12)', () => {
  const lines = allText();
  it('keeps every sentence short', () => {
    const long = lines.flatMap(sentences).filter(s => words(s).length > 18);
    expect(long).toEqual([]);
  });

  it('reads easily overall (Flesch reading ease 80 or more, short sentences on average)', () => {
    const ss = lines.flatMap(sentences);
    const ws = ss.flatMap(words);
    const perSentence = ws.length / ss.length;
    const fre = 206.835 - 1.015 * perSentence - 84.6 * (ws.reduce((n, w) => n + syllables(w), 0) / ws.length);
    expect(perSentence).toBeLessThan(10);
    expect(fre).toBeGreaterThan(80);
  });

  it('keeps each line short enough for the dialogue box (about three lines)', () => {
    expect(lines.filter(l => l.length > 130)).toEqual([]);
  });
});
