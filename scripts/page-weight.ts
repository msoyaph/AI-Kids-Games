// Measures bytes transferred for a page's initial load (until network idle), excluding
// preview videos, for a mobile and a desktop viewport. Budget: 500 KB for the home page.
// Usage: npx tsx scripts/page-weight.ts [url=http://127.0.0.1:4300/] [budgetKB=500]
import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:4300/', budget = Number(process.argv[3] ?? 500)*1000;
const browser = await chromium.launch({ channel: 'chromium' });
let failed = false;
for (const [name,options] of [['phone',devices['iPhone 13']],['desktop',{ viewport: { width: 1440,height: 900 } }]] as const) {
  const context = await browser.newContext({ ...options,defaultBrowserType: undefined } as never);
  const page = await context.newPage(); const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{ cacheDisabled: true });
  const urls = new Map<string,string>(); const bytes = new Map<string,number>();
  cdp.on('Network.requestWillBeSent',event => urls.set(event.requestId,event.request.url));
  cdp.on('Network.loadingFinished',event => bytes.set(event.requestId,event.encodedDataLength));
  await page.goto(url,{ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  const rows = [...bytes].map(([id,size]) => ({ url: urls.get(id) ?? id,size })).filter(row => !/\/loop\.(mp4|webm)/.test(row.url));
  const total = rows.reduce((sum,row) => sum+row.size,0);
  const ok = total <= budget; failed ||= !ok;
  console.log(`${name}: ${(total/1000).toFixed(1)} KB transferred in ${rows.length} requests (excluding preview videos) — ${ok ? 'within' : 'OVER'} ${budget/1000} KB`);
  for (const row of rows.sort((a,b) => b.size-a.size).slice(0,8)) console.log(`  ${(row.size/1000).toFixed(1).padStart(7)} KB  ${row.url.replace(/^https?:\/\/[^/]+/,'')}`);
  await context.close();
}
await browser.close();
process.exitCode = failed ? 1 : 0;
