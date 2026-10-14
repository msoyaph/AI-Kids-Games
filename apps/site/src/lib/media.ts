import type { Game } from '../data/games';
import manifest from '../data/media.json';
import { temporaryArt } from '../data/temporary-art';

interface Captured { loopSeconds: number; mp4Bytes: number; webmBytes: number; shots: string[]; capturedAt: string }
const captured = manifest as Record<string,Captured>;

/** Every asset for a game lives in public/media/<slug>/ (see ADDING_A_GAME.md). */
export function mediaFor(game: Pick<Game,'slug' | 'coverLayers'> & { community?: Game['community'] }) {
  const base = `/media/${game.slug}`;
  // Community games: a cover and screenshots made from the owner's review (or a placeholder before
  // approval), no idle layers, no gameplay loop and no logo (the title is text).
  if (game.community) {
    const c = game.community, one = (src: string) => ({ avif: src,webp: src,jpg: src });
    return { cover: c.cover,layers: [] as { motion: string; src: string }[],logo: '',og: c.og,preview: undefined,shots: c.shots.map((src,index) => ({ alt: `Screenshot ${index+1}`,full: one(src),thumb: one(src) })),temporary: false };
  }
  const entry = captured[game.slug];
  const image = (name: string) => ({ avif: `${base}/${name}.avif`,webp: `${base}/${name}.webp`,jpg: `${base}/${name}.jpg` });
  /** Captured gameplay, absent for games that have not been captured yet. */
  const loopOf = (e: Captured | undefined) => e ? { webm: `${base}/loop.webm`,mp4: `${base}/loop.mp4`,poster: image('poster'),seconds: e.loopSeconds } as { webm: string; mp4: string; poster: ReturnType<typeof image>; seconds: number } | undefined : undefined;
  // TEMPORARY ART (see src/data/temporary-art.ts): the game's own screenshots stand in for a drawn
  // cover that no longer matches the game. No layers; a loop only once one is recorded from the
  // current build (`loop`).
  const temporary = temporaryArt[game.slug];
  if (temporary) return {
    cover: `${base}/temp/cover.webp`,
    layers: [] as { motion: string; src: string }[],
    logo: `${base}/logo.svg`,
    og: `/og/${game.slug}.jpg`,
    preview: temporary.loop ? loopOf(entry) : undefined,
    shots: temporary.shots.map((alt,index) => ({ alt,full: image(`temp/shot-${index+1}`),thumb: image(`temp/shot-${index+1}-thumb`) })),
    temporary: true
  };
  return {
    cover: `${base}/cover.svg`,
    layers: game.coverLayers.map(motion => ({ motion,src: `${base}/cover-${motion}.svg` })) as { motion: string; src: string }[],
    logo: `${base}/logo.svg`,
    og: `/og/${game.slug}.jpg`,
    preview: loopOf(entry),
    shots: entry ? entry.shots.map((alt,index) => ({ alt,full: image(`shot-${index+1}`),thumb: image(`shot-${index+1}-thumb`) })) : [],
    temporary: false
  };
}
export type GameMedia = ReturnType<typeof mediaFor>;
