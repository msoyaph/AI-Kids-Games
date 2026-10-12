// npm run audit-storage [-- <slug>...]
// A first-pass storage audit of the committed builds the website ships. For each game it lists
// the browser storage APIs the compiled file touches and every string that looks like one of its
// storage keys, and flags anything that could reach another game's saves: localStorage.clear(),
// key enumeration, sessionStorage, IndexedDB, cookies or Cache Storage. Enumeration is allowed
// only when the game's source filters it to its own prefix: read the flagged code to confirm.
// The full audit (sizes, ownership, review notes) is apps/site/STORAGE_AUDIT.md.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readManifest } from './lib/manifest';
import { gameSlugs,site } from './lib/repo';

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : gameSlugs();
let flagged = 0;
for (const slug of slugs) {
  const m = readManifest(slug);
  const html = readFileSync(resolve(site,'public/games',slug,'index.html'),'utf8');
  const count = (pattern: RegExp) => (html.match(pattern) ?? []).length;
  const stem = m.storage.prefix.replace(/[.\-:]+$/,'');
  const literals = [...new Set(html.match(new RegExp(`["'\`](?:__)?${stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[\\w.:$\\{\\}-]*["'\`]`,'g')) ?? [])].sort();
  const risks = {
    'localStorage.clear()': count(/localStorage\s*\.\s*clear\s*\(/g),
    'key(i) enumeration': count(/\.key\(\s*\w+\s*\)/g),
    sessionStorage: count(/\bsessionStorage\b/g),
    indexedDB: count(/\bindexedDB\b/g),
    'document.cookie': count(/document\.cookie/g),
    'Cache Storage': count(/\bcaches\.open\b/g)
  };
  const risky = Object.entries(risks).filter(([,n]) => n > 0);
  flagged += risky.filter(([name]) => name !== 'key(i) enumeration').length;
  console.log(`\n${m.title} ${m.version} (${slug}), prefix "${m.storage.prefix}"`);
  console.log(`  localStorage references: ${count(/\blocalStorage\b/g)}`);
  console.log(`  key-like strings: ${literals.join(' ') || '(built at run time from the prefix)'}`);
  console.log(`  manifest keys: ${m.storage.keys.join(' ')}${m.storage.probe ? ` · probe ${m.storage.probe}` : ''}`);
  console.log(`  needs review: ${risky.length ? risky.map(([name,n]) => `${name} ×${n}`).join(', ') : 'nothing'}`);
}
if (flagged) { console.error(`\n${flagged} finding(s) that can touch other games' data. Review them before importing.`); process.exit(1); }
