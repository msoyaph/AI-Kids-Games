import type { Game } from '../data/games';
import manifest from '../data/media.json';
import { temporaryArt } from '../data/temporary-art';

interface Captured { loopSeconds: number; mp4Bytes: number; webmBytes: number; shots: string[]; capturedAt: string }
const captured = manifest as Record<string,Captured>;

/** Every asset for a game lives in public/media/<slug>/ (see ADDING_A_GAME.md). */
export function mediaFor(game: Pick<Game,'slug' | 'coverLayers'> & { community?: Game['community'] }) {
  const base = `/media/${game.slug}`;
  type Picture = { avif: string; webp: string; jpg: string };
  type Layer = { motion: string; src: string };
  // Community games: a cover and screenshots made from the owner's review (or a placeholder before
  // approval), no idle layers, no gameplay loop and no logo (the title is text).
  if (game.community) {
    const c = game.community, one = (src: string) => ({ avif: src,webp: src,jpg: src });
    return { cover: c.cover,coverImage: one(c.cover) as Picture,thumb: c.cover,layers: [] as Layer[],logo: '',og: c.og,preview: undefined,shots: c.shots.map((src,index) => ({ alt: `Screenshot ${index+1}`,full: one(src),thumb: one(src) })),temporary: false };
  }
  const entry = captured[game.slug];
  const image = (name: string): Picture => ({ avif: `${base}/${name}.avif`,webp: `${base}/${name}.webp`,jpg: `${base}/${name}.jpg` });
  /** Captured gameplay, absent for games that have not been captured yet. */
  const loopOf = (e: Captured | undefined) => e ? { webm: `${base}/loop.webm`,mp4: `${base}/loop.mp4`,poster: image('poster'),seconds: e.loopSeconds } as { webm: string; mp4: string; poster: Picture; seconds: number } | undefined : undefined;
  // THE COVER IS REAL GAMEPLAY (owner, 2026-10-14: "change the preview image cover to really depicts
  // the game graphics not just SVG"): once a game has a captured loop, its cover everywhere (cards,
  // tiles, the loading screen, OG images, the assistants app) is the loop's first frame, the poster,
  // and tiles use its 480×270 copy (poster-thumb). The drawn covers (cover.svg and its idle layers)
  // stay in the folder for marketing but are not shown; they remain the fallback before a capture.
  const temporary = temporaryArt[game.slug];
  const preview = temporary && !temporary.loop ? undefined : loopOf(entry);
  const shown = preview ? { cover: preview.poster.jpg,coverImage: preview.poster,thumb: `${base}/poster-thumb.jpg`,layers: [] as Layer[] } : undefined;
  // TEMPORARY ART (see src/data/temporary-art.ts): the game's own screenshots are the gallery (and the
  // cover until a loop is recorded from the current build).
  if (temporary) return {
    ...(shown ?? { cover: `${base}/temp/cover.webp`,coverImage: { avif: `${base}/temp/cover.webp`,webp: `${base}/temp/cover.webp`,jpg: `${base}/temp/cover.webp` } as Picture,thumb: `${base}/temp/shot-1-thumb.jpg`,layers: [] as Layer[] }),
    logo: `${base}/logo.svg`,
    og: `/og/${game.slug}.jpg`,
    preview,
    shots: temporary.shots.map((alt,index) => ({ alt,full: image(`temp/shot-${index+1}`),thumb: image(`temp/shot-${index+1}-thumb`) })),
    temporary: true
  };
  return {
    ...(shown ?? { cover: `${base}/cover.svg`,coverImage: { avif: `${base}/cover.svg`,webp: `${base}/cover.svg`,jpg: `${base}/cover.svg` } as Picture,thumb: `${base}/cover.svg`,layers: game.coverLayers.map(motion => ({ motion,src: `${base}/cover-${motion}.svg` })) as Layer[] }),
    logo: `${base}/logo.svg`,
    og: `/og/${game.slug}.jpg`,
    preview,
    shots: entry ? entry.shots.map((alt,index) => ({ alt,full: image(`shot-${index+1}`),thumb: image(`shot-${index+1}-thumb`) })) : [],
    temporary: false
  };
}
export type GameMedia = ReturnType<typeof mediaFor>;
