// Capture real gameplay for a game and produce its preview loop, poster and gallery stills.
// Usage: npm run capture-previews -- <slug> [--only=<take-id>] [--encode-only] [--headless]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureDir, launch, openSession, recordTake, root, serve, type TakeResult } from './capture/lib';
import { encode } from './capture/encode';
import type { Scenario } from './capture/types';

const args = process.argv.slice(2);
const slug = args.find(arg => !arg.startsWith('--'));
const flag = (name: string) => args.find(arg => arg === `--${name}` || arg.startsWith(`--${name}=`))?.split('=')[1] ?? (args.includes(`--${name}`) ? '' : undefined);
if (!slug || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Usage: npm run capture-previews -- <slug> [--only=<take>] [--encode-only] [--headless]');
if (!existsSync(join(root,'scripts/capture',`${slug}.ts`))) throw new Error(`No capture route for ${slug}. Write scripts/capture/${slug}.ts first (see ADDING_A_GAME.md).`);
if (!existsSync(join(root,'public/games',slug,'index.html'))) throw new Error(`public/games/${slug}/index.html does not exist.`);
const { scenario } = await import(`./capture/${slug}.ts`) as { scenario: Scenario };
const log = (message: string) => console.log(message);

const only = flag('only');
if (flag('encode-only') === undefined) {
  const { server,origin } = await serve();
  const browser = await launch(flag('headless') !== undefined);
  try {
    // Takes that continue a previous take's page form one chain, captured together.
    const chains: (typeof scenario.takes)[] = [];
    for (const take of scenario.takes) if (take.continues && chains.length) chains.at(-1)!.push(take); else chains.push([take]);
    for (const chain of chains) {
      if (only && !chain.some(take => take.id === only)) continue;
      for (let attempt = 1; ; attempt++) {
        const session = await openSession(browser,origin,scenario,chain[0],log);
        // With --only, stop the chain after the requested take (earlier takes still set the stage).
        const run = only ? chain.slice(0,chain.findIndex(take => take.id === only)+1) : chain;
        try { for (const take of run) await recordTake(session,scenario,take,log); break; }
        catch (error) { if (attempt >= 4) throw error; log(`  ${chain.map(take => take.id).join(' → ')} failed (${error instanceof Error ? error.message : error}); retrying.`); }
        finally { await session.context.close(); }
      }
    }
  } finally { await browser.close(); server.close(); }
}
if (only) process.exit(0);
const results: TakeResult[] = scenario.takes.map(take => {
  const file = join(captureDir(slug),`${take.id}.json`);
  if (!existsSync(file)) throw new Error(`Missing capture for ${slug}/${take.id}. Run without --encode-only.`);
  return JSON.parse(readFileSync(file,'utf8'));
});
await encode(scenario,results,log);
