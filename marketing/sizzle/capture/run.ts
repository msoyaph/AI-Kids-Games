// Record the reel's gameplay takes from the built games, with the site's capture tooling
// (headed Chromium on the real GPU, 1920×1080 at 60 fps, the games' own sound tapped).
// Usage (in marketing/sizzle): npm run capture -- <slug> [--only=<take-id>]
// Raw takes land in marketing/sizzle/captures/<slug>/ (git-ignored).
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, openSession, recordTake, root as site, serve } from '../../../apps/site/scripts/capture/lib';
import type { Scenario } from '../../../apps/site/scripts/capture/types';
import { idle } from '../guard';

export const sizzle = resolve(import.meta.dirname, '..');
export const takeDir = (slug: string) => join(sizzle, 'captures', slug);

const args = process.argv.slice(2);
const slug = args.find(arg => !arg.startsWith('--'));
const only = args.find(arg => arg.startsWith('--only='))?.split('=')[1];
if (!slug || !existsSync(join(sizzle, 'capture/games', `${slug}.ts`))) throw new Error('Usage (in marketing/sizzle): npm run capture -- <slug> [--only=<take-id>] (a route in marketing/sizzle/capture/games/)');
if (!existsSync(join(site, 'public/games', slug, 'index.html'))) throw new Error(`apps/site/public/games/${slug}/index.html does not exist.`);

// Never capture while browser or unit tests run: both need the whole GPU and CPU.
idle();

const { scenario } = await import(`./games/${slug}.ts`) as { scenario: Scenario };
const log = (message: string) => console.log(message);
const { server, origin } = await serve();
const browser = await launch();
try {
  const chains: (typeof scenario.takes)[] = [];
  for (const take of scenario.takes) if (take.continues && chains.length) chains.at(-1)!.push(take); else chains.push([take]);
  for (const chain of chains) {
    if (only && !chain.some(take => take.id === only)) continue;
    idle(); // checked again before every take: tests may have started meanwhile
    for (let attempt = 1; ; attempt++) {
      const session = await openSession(browser, origin, scenario, chain[0], log);
      const run = only ? chain.slice(0, chain.findIndex(take => take.id === only) + 1) : chain;
      try {
        for (const take of run) {
          const result = await recordTake(session, scenario, take, log, takeDir(slug));
          // Only clean takes: a covered capture window stops frames (macOS stops drawing it).
          if ((result.played ?? result.duration) - result.duration > 0.25) throw new Error(`frames stalled in ${take.id}; keep the capture window uncovered`);
        }
        break;
      }
      catch (error) { if (attempt >= 5) throw error; log(`  ${chain.map(take => take.id).join(' → ')} failed (${error instanceof Error ? error.message : error}); retrying.`); }
      finally { await session.context.close(); }
    }
  }
} finally { await browser.close(); server.close(); }
