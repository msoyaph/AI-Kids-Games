// Which engine files Breezeport copied from Fieldlark, and how far each has drifted since.
//   node scripts/engine-drift.mjs [ref]      (default ref: origin/main if it has Fieldlark, else origin/fieldlark)
// Every copied or adapted file starts with "Copied from games/fieldlark/…" or "Adapted from games/fieldlark/…".
// "Copied" files should match Fieldlark apart from that header line; "Adapted" ones are listed with
// their diff size so a later Fieldlark fix can be ported on purpose.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const has = ref => { try { git('cat-file', '-e', `${ref}:games/fieldlark/package.json`); return true; } catch { return false; } };
const ref = process.argv[2] ?? (has('origin/main') ? 'origin/main' : 'origin/fieldlark');
const files = [];
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|mts|mjs|css|sh)$/.test(f)) files.push(p); } };
walk('src'); walk('scripts');
let copied = 0, drift = 0;
for (const file of files) {
  const head = readFileSync(file, 'utf8').split('\n').slice(0, 8).join('\n');
  const m = /(Copied|Adapted) from (games\/fieldlark\/[\w./-]+)/.exec(head);
  if (!m) continue;
  const [, kind, source] = m;
  let theirs;
  try { theirs = git('show', `${ref}:${source.replace(/[.)]+$/, '')}`); } catch { console.log(`?  ${relative('.', file)}: ${source} not found at ${ref}`); continue; }
  const ours = readFileSync(file, 'utf8').split('\n').filter(l => !/(Copied|Adapted) from games\/fieldlark/.test(l));
  const t = theirs.split('\n');
  const tset = new Set(t), oset = new Set(ours);
  const changed = ours.filter(l => !tset.has(l)).length + t.filter(l => !oset.has(l)).length;
  copied++;
  if (kind === 'Copied' && changed) drift++;
  console.log(`${kind === 'Copied' ? (changed ? '≠' : '=') : '~'}  ${relative('.', file).padEnd(34)} ${kind.toLowerCase()} from ${source}  (${changed} lines differ)`);
}
console.log(`\n${copied} files from Fieldlark at ${ref}; ${drift} copied file(s) have drifted.`);
