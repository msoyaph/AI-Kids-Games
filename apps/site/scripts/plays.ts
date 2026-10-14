// npm run plays [-- --days 30]                       which games families play, from our host's request totals
// npm run plays [-- --save [--month 2026-10]]        also keep one month's totals in plays-history.csv (git-ignored)
// Totals only (scripts/plays-lib.ts): never IP addresses, browsers or unique visitors. Needs the Vercel
// CLI logged in to the real-tours team. Vercel keeps 30 days, so run --save early each month for the
// month before (it saves what's left of it, marked incomplete, if run later).
import { spawnSync } from 'node:child_process';
import { appendFileSync,existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatedGames } from '../src/data/games.generated';
import { csvLines,HISTORY_FILE,metricsArgs,monthRange,parseTotals,previousMonth,RETENTION_DAYS,rows,savedMonths,testDays,type ProductionTest } from './plays-lib';

const flag = (name: string) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at+1] : undefined; };
const save = process.argv.includes('--save');
const deployment = JSON.parse(readFileSync(resolve(import.meta.dirname,'../DEPLOYMENT.json'),'utf8')) as { productionTests?: ProductionTest[] };

function query(range: { since: string; until?: string }) {
  const run = spawnSync('npx',metricsArgs(range),{ encoding: 'utf8',maxBuffer: 16*1024*1024 });
  if (run.status !== 0) throw new Error(`The Vercel CLI failed (is it logged in to real-tours?):\n${run.stderr || run.stdout}`);
  return parseTotals(run.stdout);
}
function print(title: string,table: ReturnType<typeof rows>,days: string[]) {
  console.log(`\n${title}\n`);
  const width = Math.max(...table.map(row => row.title.length));
  console.log(`${'Game'.padEnd(width)}  Game-file requests  ≈ Plays`);
  for (const row of table) console.log(`${row.title.padEnd(width)}  ${String(row.requests).padStart(18)}  ${String(row.plays).padStart(7)}`);
  console.log('\nProduction only, without traffic Vercel marks as bots. A play on the site loads the game file about twice.');
  if (days.length) console.log(`Our own production tests ran on ${days.join(', ')}: those days include test plays.`);
}

if (save) {
  const month = flag('--month') ?? previousMonth();
  const range = monthRange(month);
  const existing = existsSync(HISTORY_FILE) ? readFileSync(HISTORY_FILE,'utf8') : '';
  if (savedMonths(existing).has(month)) { console.log(`${month} is already in ${HISTORY_FILE}.`); process.exit(0); }
  const table = rows(query(range),generatedGames),days = testDays(deployment.productionTests ?? [],range.since,range.until);
  print(`${month}${range.complete ? '' : ` (incomplete: Vercel keeps ${RETENTION_DAYS} days, so only ${range.since.slice(0,10)} to ${range.until.slice(0,10)})`}`,table,days);
  appendFileSync(HISTORY_FILE,`${csvLines(month,range,table,days,!existing).join('\n')}\n`);
  console.log(`\nSaved ${month} to ${HISTORY_FILE}.`);
} else {
  const daysBack = Number(flag('--days') ?? RETENTION_DAYS);
  if (!Number.isInteger(daysBack) || daysBack < 1 || daysBack > RETENTION_DAYS) throw new Error(`--days must be 1 to ${RETENTION_DAYS}.`);
  const until = new Date().toISOString(),since = new Date(Date.now()-daysBack*86_400_000).toISOString();
  print(`Last ${daysBack} days`,rows(query({ since }),generatedGames),testDays(deployment.productionTests ?? [],since,until));
}
