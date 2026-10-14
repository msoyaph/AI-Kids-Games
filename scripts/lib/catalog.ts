// The AI Kids Games app's catalog (apps/mcp/src/data/catalog.generated.json, written by npm run manifests).
import type { Manifest } from './manifest';
import type { BuildImport } from './repo';
import type { Game } from '../../apps/site/src/data/games';
import type { Catalog,CatalogGame } from '../../apps/mcp/src/data/types';
import { mediaFor } from '../../apps/site/src/lib/media';

/**
 * Only released games ("Ready to play"; never "Coming soon" or "In development"), plus community games
 * that are approved, listed and unchanged since approval (communityEntries in production mode; anything
 * marked preview is left out). Games that play in assistants carry their verified build's hash and size.
 */
export function buildCatalog(manifests: Manifest[],community: Game[],builds: BuildImport[]): Catalog {
  const first = manifests.filter(m => m.site.status === 'Ready to play').map((m): CatalogGame => {
    const media = mediaFor({ slug: m.slug,coverLayers: m.site.coverLayers }), built = builds.find(entry => entry.slug === m.slug);
    if (m.embed !== 'site' && !built) throw new Error(`${m.slug} plays in assistants (embed "${m.embed}") but has no imported build. Run npm run import-game -- ${m.slug}.`);
    return {
      slug: m.slug,title: m.title,tagline: m.tagline,pitch: m.shortDescription,minAge: m.minAge,ageRange: m.ageRange,genres: m.genres,tags: m.tags,
      devices: m.devices,controls: m.controls.types,orientation: m.orientation,requirements: m.requirements ?? [],playTime: m.playTime,
      sessionMinutes: m.sessionMinutes,moods: m.moods,embed: m.embed,contentNotes: m.contentNotes,quickStart: m.controls.quickStart,version: m.version,
      accentColor: m.site.accentColor,page: `/game/${m.slug}`,cover: media.cover,logo: media.logo,
      ...(m.embed !== 'site' && built ? { build: { path: `/games/${m.slug}/index.html`,bytes: built.bytes,sha256: built.sha256 } } : {})
    };
  });
  const approved = community.filter(game => game.community && !game.community.preview).map((game): CatalogGame => ({
    slug: game.slug,title: game.title,tagline: game.tagline,pitch: game.description,minAge: game.minAge,ageRange: game.ageGuidance.replace(/^Ages /,''),
    genres: game.categories,tags: game.tags,devices: game.supportedDevices,controls: game.controls.types,orientation: game.orientation,requirements: game.requirements,
    playTime: game.estimatedPlayTime,moods: [],embed: 'site',contentNotes: game.contentNotes,quickStart: game.quickStart,version: game.version,
    accentColor: game.accentColor,page: `/game/${game.slug}`,cover: game.community!.cover,community: { handle: game.community!.handle }
  }));
  return { games: [...first,...approved] };
}
