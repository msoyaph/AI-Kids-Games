// How often each game is loaded on the live site, from our host's own request totals (Vercel
// Observability; the team has Observability Plus, so 30 days of history). This is not analytics: no
// script, no cookies, nothing new collected or sent. Only totals per path are read, filtered by
// environment and bot category: never IP addresses, browsers or unique visitors. tests/plays.test.ts
// keeps it that way.
import { resolve } from 'node:path';

/** The Vercel CLI that runs the query: pinned, and at least two weeks old when chosen. */
export const CLI = 'vercel@61.1.0';
export const PROJECT = 'ai-kids-games',SCOPE = 'real-tours';
/** The only request dimensions this ever reads. */
export const DIMENSIONS = ['requestPath','environment','botCategory'] as const;
/** What Vercel keeps with Observability Plus. Older days can't be read any more. */
export const RETENTION_DAYS = 30;
export const HISTORY_FILE = resolve(import.meta.dirname,'../plays-history.csv');

/** Arguments for `npx`: request totals per game file, production only, without the traffic Vercel marks as bots. */
export function metricsArgs(range: { since: string; until?: string }) {
  return ['--yes',CLI,'metrics','vercel.request.count','--project',PROJECT,'--scope',SCOPE,'--since',range.since,...(range.until ? ['--until',range.until] : []),
    '--group-by','requestPath','--filter','requestPath:/games/*','--filter','environment:production','--filter','botCategory:""','--format','json'];
}

/** Totals per game slug from the CLI's JSON output (it may print notes before the JSON). */
export function parseTotals(output: string): Map<string,number> {
  const start = output.indexOf('{');
  if (start < 0) throw new Error(`The Vercel CLI gave no data:\n${output.slice(0,400)}`);
  const json = JSON.parse(output.slice(start)) as { summary?: { requestPath?: string; vercel_request_count_count?: number }[]; status?: string; hint?: string };
  if (json.status === 'action_required') throw new Error(`The Vercel CLI needs an answer: ${json.hint ?? ''}`);
  const totals = new Map<string,number>();
  for (const row of json.summary ?? []) {
    const slug = /^\/games\/([a-z0-9-]+)\/(?:index\.html)?$/.exec(row.requestPath ?? '')?.[1];
    if (slug) totals.set(slug,(totals.get(slug) ?? 0)+(row.vercel_request_count_count ?? 0));
  }
  return totals;
}

export interface Row { slug: string; title: string; requests: number; plays: number }
/** One row per listed game, most played first. A play on the site loads the game file about twice (its progress download, then the frame), so plays ≈ requests / 2. */
export function rows(totals: Map<string,number>,games: { slug: string; title: string }[]): Row[] {
  return games.map(game => { const requests = totals.get(game.slug) ?? 0; return { slug: game.slug,title: game.title,requests,plays: Math.round(requests/2) }; })
    .sort((a,b) => b.requests-a.requests || a.title.localeCompare(b.title));
}

/** A calendar month in UTC, as the ISO times the CLI takes, clipped to what Vercel still keeps. */
export function monthRange(month: string,now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`--month must look like 2026-10, not ${month}.`);
  const [year,index] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year,index-1,1)),end = new Date(Date.UTC(year,index,1));
  if (start >= now) throw new Error(`${month} hasn't started yet.`);
  const oldest = new Date(now.getTime()-RETENTION_DAYS*86_400_000);
  const since = start < oldest ? oldest : start,until = end > now ? now : end;
  if (until <= oldest) throw new Error(`Vercel no longer keeps any of ${month} (it keeps ${RETENTION_DAYS} days).`);
  return { since: since.toISOString(),until: until.toISOString(),complete: since.getTime() === start.getTime() && until.getTime() === end.getTime() };
}
/** The last full calendar month (UTC). */
export const previousMonth = (now = new Date()) => { const d = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)); return d.toISOString().slice(0,7); };

export interface ProductionTest { release: string; kind: string; from: string; to: string; url?: string }
/** The days in a range when our own tests ran against production (DEPLOYMENT.json productionTests): their requests are in the totals. */
export function testDays(tests: ProductionTest[],since: string,until: string) {
  const days = new Set<string>();
  for (const test of tests) if (test.to >= since && test.from <= until) days.add(test.from.slice(0,10));
  return [...days].sort();
}

/** CSV lines for one saved month (header first when the file is new). */
export function csvLines(month: string,range: { since: string; until: string; complete: boolean },table: Row[],days: string[],withHeader: boolean) {
  const lines = withHeader ? ['month,from,to,complete,game,requests,approx_plays,production_test_days'] : [];
  for (const row of table) lines.push([month,range.since,range.until,range.complete ? 'yes' : 'no',row.slug,row.requests,row.plays,days.join(' ')].join(','));
  return lines;
}
/** Months already saved in the history file. */
export const savedMonths = (csv: string) => new Set(csv.split('\n').slice(1).map(line => line.split(',')[0]).filter(Boolean));
