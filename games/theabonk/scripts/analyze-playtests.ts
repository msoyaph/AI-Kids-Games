/**
 * Compare real playtest runs (exported from ?playtest=1) with the balance simulator and print
 * tuning suggestions. Read-only: never edits any file.
 *
 * Usage: npm run analyze-playtests -- <folder-or-file> [--seeds 6] [--skill 0.7] [--include-tuned]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { PlaytestRun } from '../src/meta/playtest';
import { analyze, formatReport } from './lib/analyze';

const argv = process.argv.slice(2);
const opt = (name: string, def: number): number => {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const target = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
if (!target) {
  console.error('usage: npm run analyze-playtests -- <folder-or-file> [--seeds 6] [--skill 0.7] [--include-tuned]');
  process.exit(2);
}
const files = statSync(target).isDirectory() ? readdirSync(target).filter((f) => f.endsWith('.json')).map((f) => join(target, f)) : [target];
const runs: PlaytestRun[] = [];
for (const f of files) {
  try {
    const data = JSON.parse(readFileSync(f, 'utf8')) as unknown;
    const list = Array.isArray(data) ? data : (data as { runs?: unknown[] }).runs ?? [data];
    for (const r of list as PlaytestRun[]) if (r && r.v === 1 && r.player !== 'bot') runs.push(r);
  } catch (e) {
    console.warn(`skipped ${f}: ${(e as Error).message}`);
  }
}
const usable = argv.includes('--include-tuned') ? runs : runs.filter((r) => !r.tuned);
console.log(`Read ${runs.length} human run(s) from ${files.length} file(s)${usable.length < runs.length ? `; ignoring ${runs.length - usable.length} tuned run(s) (--include-tuned to keep)` : ''}.`);
if (!usable.length) process.exit(0);
console.log('Simulating the same heroes with the bot…');
const { groups, suggestions } = analyze(usable, { seeds: opt('--seeds', 6), skill: opt('--skill', 0.7) });
console.log(formatReport(groups, suggestions));
