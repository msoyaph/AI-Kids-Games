// Reading-level report for every line a player reads in the data files.
//
//   npx tsx scripts/readability.ts [group-prefix]     e.g.  npx tsx scripts/readability.ts dialogue:sunny
//
// Prints each group's average Flesch–Kincaid grade and its hardest lines.
import { DIALOGUE } from '../src/data/dialogue';
import { MISSIONS } from '../src/data/missions';
import { TIPS } from '../src/data/tips';
import { FESTIVALS } from '../src/data/festivals';
import { VILLAGERS } from '../src/data/villagers';
import { ITEMS } from '../src/data/registry';
import { READING_TARGET, readability } from '../src/core/readability';

export interface TextLine {
  group: string;
  where: string;
  text: string;
}

export function collectTexts(): TextLine[] {
  const out: TextLine[] = [];
  for (const [p, topics] of Object.entries(DIALOGUE))
    for (const [topic, lines] of Object.entries(topics)) lines.forEach((text, k) => out.push({ group: `dialogue:${p}`, where: `${topic}[${k}]`, text }));
  for (const m of MISSIONS) {
    const add = (where: string, text: string | undefined) => text && out.push({ group: 'missions', where: `${m.id}.${where}`, text });
    add('summary', m.summary);
    add('hint', m.hint);
    m.intro.forEach((t, k) => add(`intro[${k}]`, t));
    m.outro.forEach((t, k) => add(`outro[${k}]`, t));
    m.objectives.forEach((o, i) => {
      add(`obj${i}.label`, o.label);
      if (o.kind === 'talk') {
        o.lines.forEach((t, k) => add(`obj${i}.lines[${k}]`, t));
        o.tooEarly?.forEach((t, k) => add(`obj${i}.tooEarly[${k}]`, t));
      }
      if (o.kind === 'deliver') o.thanks?.forEach((t, k) => add(`obj${i}.thanks[${k}]`, t));
    });
  }
  for (const t of Object.values(TIPS)) out.push({ group: 'tips', where: t.id, text: t.text });
  for (const f of FESTIVALS) {
    out.push({ group: 'festivals', where: `${f.id}.goal`, text: f.goal });
    f.intro.forEach((t, k) => out.push({ group: 'festivals', where: `${f.id}.intro[${k}]`, text: t }));
    f.thanks.forEach((t, k) => out.push({ group: 'festivals', where: `${f.id}.thanks[${k}]`, text: t }));
  }
  for (const v of VILLAGERS) {
    out.push({ group: 'villagers', where: `${v.id}.bio`, text: v.bio });
    v.unique.forEach((t, k) => out.push({ group: 'villagers', where: `${v.id}.unique[${k}]`, text: t }));
  }
  for (const d of Object.values(ITEMS)) if (d.desc) out.push({ group: `items:${d.cat}`, where: d.id, text: d.desc });
  return out;
}

export function report(prefix = ''): { group: string; avg: number; max: number; n: number }[] {
  const lines = collectTexts().filter((l) => l.group.startsWith(prefix));
  const groups = new Map<string, TextLine[]>();
  for (const l of lines) groups.set(l.group, [...(groups.get(l.group) ?? []), l]);
  const rows: { group: string; avg: number; max: number; n: number }[] = [];
  for (const [group, ls] of groups) {
    const graded = ls.map((l) => ({ ...l, g: readability(l.text).grade })).sort((a, b) => b.g - a.g);
    const avg = graded.reduce((a, l) => a + l.g, 0) / graded.length;
    rows.push({ group, avg: Math.round(avg * 10) / 10, max: graded[0]!.g, n: graded.length });
    if (process.argv[1]?.endsWith('readability.ts')) {
      console.log(`\n${group}: ${graded.length} lines, average grade ${avg.toFixed(1)} (target ≤ ${READING_TARGET.average}), hardest ${graded[0]!.g} (limit ${READING_TARGET.max})`);
      for (const l of graded.filter((x) => x.g > READING_TARGET.max).slice(0, 40)) console.log(`  ${l.g.toFixed(1)}  ${l.where}: ${l.text}`);
    }
  }
  return rows;
}

if (process.argv[1]?.endsWith('readability.ts')) {
  const rows = report(process.argv[2] ?? '');
  const all = collectTexts().filter((l) => l.group.startsWith(process.argv[2] ?? ''));
  const avg = all.reduce((a, l) => a + readability(l.text).grade, 0) / Math.max(1, all.length);
  console.log(`\nOverall: ${all.length} lines, average grade ${avg.toFixed(2)}; ${rows.filter((r) => r.max > READING_TARGET.max).length} groups have lines above ${READING_TARGET.max}.`);
}
