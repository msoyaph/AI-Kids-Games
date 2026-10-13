// npm run indexnow --workspace apps/site [-- --dry-run] [--origin https://…]
// A release step, after the production deployment and its checks: tells IndexNow (Bing and the
// other participating search engines; https://www.indexnow.org) which public pages are new or
// changed. It reads every page in the live sitemap and compares what readers see (the title,
// description and page content, not the hashed script names) with the last submission in
// indexnow-state.json. Only changed pages are sent. Commit the updated state with the release
// record. Run it from your own machine: the site itself never contacts anyone.
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INDEXNOW_KEY,PUBLIC_ORIGIN } from '../src/data/site';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const at = args.indexOf('--origin');
const origin = (at >= 0 && args[at+1] ? args[at+1]! : PUBLIC_ORIGIN).replace(/\/$/,'');
const statePath = resolve(import.meta.dirname,'../indexnow-state.json');
const state: Record<string,string> = existsSync(statePath) ? JSON.parse(readFileSync(statePath,'utf8')) : {};

const keyLocation = `${origin}/${INDEXNOW_KEY}.txt`;
const served = await fetch(keyLocation).then(response => response.ok ? response.text() : '');
if (served.trim() !== INDEXNOW_KEY) throw new Error(`${keyLocation} does not serve the IndexNow key yet. Deploy first.`);

const sitemap = await fetch(`${origin}/sitemap.xml`).then(response => response.text());
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]!);
if (!urls.length) throw new Error(`${origin}/sitemap.xml lists no pages.`);
/** What a reader sees on the page: its title, description and content (the static HTML). */
const fingerprint = (html: string) => createHash('sha256').update([/<title>([\s\S]*?)<\/title>/,/<meta name="description" content="([^"]*)"/,/<div id="root">([\s\S]*)<\/div>\s*<\/body>/].map(pattern => pattern.exec(html)?.[1] ?? '').join('\n')).digest('hex');
const next: Record<string,string> = {};
for (const url of urls) next[url] = fingerprint(await fetch(url).then(response => response.text()));
const changed = urls.filter(url => state[url] !== next[url]);
console.log(`${urls.length} pages in the sitemap; ${changed.length} new or changed since the last submission.`);
for (const url of changed) console.log(`  ${url}`);
if (!changed.length) process.exit(0);

const body = { host: new URL(origin).host,key: INDEXNOW_KEY,keyLocation,urlList: changed };
if (dryRun) { console.log('Dry run: nothing sent.',JSON.stringify(body,null,2)); process.exit(0); }
const response = await fetch('https://api.indexnow.org/indexnow',{ method: 'POST',headers: { 'Content-Type': 'application/json; charset=utf-8' },body: JSON.stringify(body) });
const meaning: Record<number,string> = { 200: 'received',202: 'received; the key check is still pending',400: 'bad request',403: 'key not valid',422: 'URLs do not belong to the host, or the key does not match',429: 'too many requests; try again later' };
console.log(`IndexNow: ${response.status} (${meaning[response.status] ?? 'unexpected'})`);
if (response.status !== 200 && response.status !== 202) process.exit(1);
// Remember only what this site lists now, so removed pages drop out of the record.
writeFileSync(statePath,`${JSON.stringify(next,null,2)}\n`);
console.log(`Recorded in ${statePath}. Commit it with the release record.`);
