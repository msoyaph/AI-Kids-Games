/**
 * Write tuning exported from the in-game panel (?tune=1 → Export) back into
 * src/config/tuning.ts. Validates every name and range; prints the changes.
 *
 * Usage: npm run apply-tuning -- exported.json [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { diffTuning, mergeTuning, TUNING_DEFAULTS, TUNING_EXPORT_FORMAT, type TuningIssue } from '../src/config/tuning';
import { replaceBlock, TUNING_FILE } from './lib/tuningFile';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry-run');
if (!file) {
  console.error('usage: npm run apply-tuning -- <exported.json> [--dry-run]');
  process.exit(2);
}
let data: unknown;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`could not read ${file}: ${(e as Error).message}`);
  process.exit(2);
}
const obj = data as { format?: string; values?: unknown };
const values = obj && obj.format === TUNING_EXPORT_FORMAT ? obj.values : data;
const issues: TuningIssue[] = [];
const merged = mergeTuning(TUNING_DEFAULTS, values, issues);
if (issues.length) {
  console.error('✗ not applied — fix these first:');
  for (const i of issues) console.error(`  ${i.path}: ${i.problem}`);
  process.exit(1);
}
const diff = diffTuning(TUNING_DEFAULTS, merged) as Record<string, Record<string, unknown>>;
const changes: string[] = [];
for (const [g, vals] of Object.entries(diff)) {
  for (const [k, v] of Object.entries(vals)) {
    if (v && typeof v === 'object') {
      const old = (TUNING_DEFAULTS as unknown as Record<string, Record<string, Record<string, number>>>)[g][k];
      for (const [id, m] of Object.entries(v as Record<string, number>)) changes.push(`${g}.${k}.${id}: ${old[id]} → ${m}`);
    } else changes.push(`${g}.${k}: ${(TUNING_DEFAULTS as unknown as Record<string, Record<string, unknown>>)[g][k]} → ${v}`);
  }
}
if (changes.length === 0) {
  console.log('Nothing to change — the file already matches these values.');
  process.exit(0);
}
console.log(`${dry ? 'Would change' : 'Changing'} ${changes.length} value(s) in ${TUNING_FILE}:`);
for (const c of changes) console.log(`  ${c}`);
if (!dry) {
  const src = readFileSync(TUNING_FILE, 'utf8');
  writeFileSync(TUNING_FILE, replaceBlock(src, merged));
  console.log('✓ written. Re-run `npm test` (the golden fingerprints will flag sim changes) and `npm run simulate`.');
}
