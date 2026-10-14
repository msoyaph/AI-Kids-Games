// Reads a game's build from the website and returns it only if its SHA-256 matches the verified import
// (apps/site/BUILD_IMPORTS.json via the catalog). Kept in memory per instance; nothing is written anywhere.
import { createHash } from 'node:crypto';
import { siteUrl,type Site } from './config';
import type { CatalogGame } from './data/types';

export function buildReader(site: Site,fetcher: typeof fetch = fetch) {
  const cache = new Map<string,Promise<string>>();
  const load = async (game: CatalogGame) => {
    if (!game.build) throw new Error(`${game.slug} does not play here.`);
    const response = await fetcher(siteUrl(site,game.build.path),{ redirect: 'error',headers: { accept: 'text/html' } });
    if (!response.ok) throw new Error(`The website answered ${response.status} for ${game.slug}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== game.build.bytes || createHash('sha256').update(bytes).digest('hex') !== game.build.sha256) throw new Error(`${game.slug}'s build on the website is not the verified one.`);
    return bytes.toString('utf8');
  };
  return (game: CatalogGame) => {
    let pending = cache.get(game.slug);
    if (!pending) { pending = load(game); cache.set(game.slug,pending); pending.catch(() => cache.delete(game.slug)); }
    return pending;
  };
}
