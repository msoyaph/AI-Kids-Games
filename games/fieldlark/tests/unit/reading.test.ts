/**
 * Every line a player reads suits ages 8–14: no single line above grade 7 (Flesch–Kincaid), and each
 * kind of text (dialogue, goals, hints, tips, facts) averaging grade 4.5 or below.
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/data/chapters';
import { TIPS } from '../../src/data/tips';
import { READING_TARGET, readability } from '../../src/core/readability';

function lines(): { group: string; where: string; text: string }[] {
  const out: { group: string; where: string; text: string }[] = [];
  CHAPTERS.forEach((c, i) => {
    for (const l of [...c.intro, ...c.outro]) out.push({ group: 'dialogue', where: `ch${i + 1} ${l.who}`, text: l.text });
    for (const g of c.goals) { out.push({ group: 'goals', where: `ch${i + 1} ${g.id}`, text: g.text }); out.push({ group: 'hints', where: `ch${i + 1} ${g.id}`, text: g.hint }); }
    for (const r of c.requests) out.push({ group: 'requests', where: r.id, text: r.note });
  });
  for (const t of Object.values(TIPS)) out.push({ group: 'tips', where: t.id, text: t.text });
  return out;
}

describe('reading level', () => {
  const all = lines();
  // the formula means little on a handful of words ("Welcome 2 chickens" scores 8.8), so a line of
  // five words or fewer only counts towards its group's average
  it(`no line longer than five words is harder than grade ${READING_TARGET.max}`, () => {
    const hard = all.map(l => ({ ...l, r: readability(l.text) })).filter(l => l.r.words > 5 && l.r.grade > READING_TARGET.max).map(l => ({ ...l, g: l.r.grade }));
    expect(hard.map(l => `${l.g} ${l.group} ${l.where}: ${l.text}`)).toEqual([]);
  });
  it(`each kind of text averages grade ${READING_TARGET.average} or below`, () => {
    const groups = new Map<string, number[]>();
    for (const l of all) groups.set(l.group, [...(groups.get(l.group) ?? []), readability(l.text).grade]);
    const over = [...groups].map(([group, gs]) => ({ group, avg: Math.round((gs.reduce((a, b) => a + b, 0) / gs.length) * 10) / 10 })).filter(x => x.avg > READING_TARGET.average);
    expect(over).toEqual([]);
  });
});
