// Dev helper: open a game the way captures do and run JS against it. Not used by the site.
// Usage: npx tsx scripts/capture/probe.ts <slug> <query> <script.js> [screenshot.png]
import { readFileSync } from 'node:fs';
import { launch, serve, WIDTH, HEIGHT } from './lib';
const [slug,query,script,shot] = process.argv.slice(2);
const { server,origin } = await serve(); const browser = await launch(true);
const context = await browser.newContext({ viewport: { width: WIDTH,height: HEIGHT } }); await context.addInitScript({ content: 'globalThis.__name = (f) => f;' }); const page = await context.newPage();
page.on('pageerror',e => console.log('pageerror',e.message)); page.on('console',m => { if (m.type() === 'error') console.log('console',m.text()); });
await page.goto(`${origin}/games/${slug}/index.html${query === '-' ? '' : query}`);
const body = readFileSync(script,'utf8');
const fn = new Function('page',`return (async () => { ${body} })()`);
try { console.log(JSON.stringify(await fn(page),null,1)?.slice(0,6000)); } catch (e) { console.log('ERR',e); }
if (shot) await page.screenshot({ path: shot });
await browser.close(); server.close();
