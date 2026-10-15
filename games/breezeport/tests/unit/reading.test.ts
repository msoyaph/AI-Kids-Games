/**
 * Every line a player reads suits ages 8–14 (Fieldlark's test): no line of more than five words above
 * grade 7 (Flesch–Kincaid), and each kind of text averaging grade 4.5 or below.
 */
import { describe, expect, it } from 'vitest';
import { READING_TARGET, readability } from '../../src/core/readability';
import { CHAPTERS, PROJECTS } from '../../src/data/chapters';
import { CAST } from '../../src/data/cast';
import { THINGS } from '../../src/data/things';
import { census, type HomeNeeds } from '../../src/sim/census';
import { eco } from '../../src/sim/eco';
import { AREAS } from '../../src/sim/map';
import { newTown } from '../../src/sim/newtown';
import { WHY_TEXT } from '../../src/sim/world';
import { wishFor } from '../../src/ui/thought';

function lines(): { group: string; where: string; text: string }[] {
  const out: { group: string; where: string; text: string }[] = [];
  CHAPTERS.forEach((c, i) => {
    for (const l of [...c.intro, ...c.outro]) out.push({ group: 'dialogue', where: `ch${i + 1} ${l.who}`, text: l.text });
    for (const g of c.goals) {
      out.push({ group: 'goals', where: g.id, text: g.text });
      if (g.hint) out.push({ group: 'hints', where: g.id, text: g.hint });
    }
  });
  for (const [id, p] of Object.entries(PROJECTS)) out.push({ group: 'projects', where: id, text: `${p.name}. ${p.text}` });
  for (const d of THINGS) out.push({ group: 'blurbs', where: d.id, text: d.blurb });
  for (const a of AREAS) out.push({ group: 'blurbs', where: a.id, text: a.blurb });
  for (const [k, v] of Object.entries(WHY_TEXT)) out.push({ group: 'messages', where: k, text: v });
  for (const p of CAST) out.push({ group: 'messages', where: p.id, text: `${p.name}, ${p.role}.` });
  const town = newTown(1);
  for (const part of eco(town, census(town), null).parts) out.push({ group: 'eco', where: part.id, text: part.why });
  const needs: Partial<HomeNeeds>[] = [{ work: 0 }, { work: 1, calm: 0 }, { work: 1, calm: 1, fun: 0 }, { work: 1, calm: 1, fun: 1, nature: 0 }, { work: 1, calm: 1, fun: 1, nature: 1, services: { school: false } }];
  town.story.chapter = 9;
  for (const n of needs) out.push({ group: 'wishes', where: JSON.stringify(n), text: wishFor({ work: 1, fun: 1, nature: 1, calm: 1, services: {}, happy: 60, ...n }, town) });
  return out;
}

describe('reading level', () => {
  const all = lines();
  it('reads every kind of text', () => {
    expect(new Set(all.map(l => l.group)).size).toBe(8);
    expect(all.every(l => l.text.trim().length > 0)).toBe(true);
  });
  // the formula means little on a handful of words, so a line of five words or fewer only counts towards its group's average
  it(`no line longer than five words is harder than grade ${READING_TARGET.max}`, () => {
    const hard = all.map(l => ({ ...l, r: readability(l.text) })).filter(l => l.r.words > 5 && l.r.grade > READING_TARGET.max);
    expect(hard.map(l => `${l.r.grade} ${l.group} ${l.where}: ${l.text}`)).toEqual([]);
  });
  it(`each kind of text averages grade ${READING_TARGET.average} or below`, () => {
    const groups = new Map<string, number[]>();
    for (const l of all) groups.set(l.group, [...(groups.get(l.group) ?? []), readability(l.text).grade]);
    const over = [...groups].map(([group, gs]) => ({ group, avg: Math.round((gs.reduce((a, b) => a + b, 0) / gs.length) * 10) / 10 })).filter(x => x.avg > READING_TARGET.average);
    expect(over).toEqual([]);
  });
});
