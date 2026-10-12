// Lighthouse (mobile profile) for the pages in the quality bar; prints the four category
// scores and writes full JSON reports. Performance 90+ applies to home and details; the play
// page is exempt from Performance (it boots a 1 MB game; owner decision) but not the others.
// Usage: npx tsx scripts/lighthouse.ts <base-url> [out-dir=lighthouse]
import { execFileSync } from 'node:child_process';
import { mkdirSync,readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.argv[2] ?? 'http://127.0.0.1:4300').replace(/\/$/,''), out = process.argv[3] ?? 'lighthouse';
mkdirSync(out,{ recursive: true });
const pages: [string,string,boolean][] = [['home','/',true],['details','/game/light-crossing',true],['play','/play/light-crossing',false]];
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let failed = false;
for (const [name,path,performanceTarget] of pages) {
  const file = join(out,`${name}.json`);
  execFileSync('npx',['--yes','lighthouse@13.5.0',base+path,'--quiet','--output=json',`--output-path=${file}`,'--chrome-flags=--headless=new --use-angle=metal --enable-gpu --ignore-gpu-blocklist','--only-categories=performance,accessibility,best-practices,seo'],{ stdio: 'inherit',env: { ...process.env,CHROME_PATH: chrome } });
  const report = JSON.parse(readFileSync(file,'utf8'));
  const scores = Object.fromEntries(Object.entries(report.categories as Record<string,{ score: number }>).map(([key,value]) => [key,Math.round(value.score*100)]));
  const misses = Object.entries(scores).filter(([key,score]) => score < 90 && (key !== 'performance' || performanceTarget));
  failed ||= misses.length > 0;
  console.log(`${name.padEnd(8)} ${Object.entries(scores).map(([key,score]) => `${key} ${score}`).join('  ')}${misses.length ? `  ← below 90: ${misses.map(([key]) => key).join(', ')}` : ''}`);
  for (const [id,audit] of Object.entries(report.audits as Record<string,{ score: number | null; title: string; scoreDisplayMode: string }>)) if (audit.score !== null && audit.score < 0.9 && ['binary','numeric','metricSavings'].includes(audit.scoreDisplayMode)) console.log(`   · ${id}: ${audit.title} (${audit.score})`);
}
process.exitCode = failed ? 1 : 0;
