import type { Game } from '../data/games';
import manifest from '../data/media.json';

interface Captured { loopSeconds: number; mp4Bytes: number; webmBytes: number; shots: string[]; capturedAt: string }
const captured = manifest as Record<string,Captured>;

/** Every asset for a game lives in public/media/<slug>/ (see ADDING_A_GAME.md). */
export function mediaFor(game: Pick<Game,'slug' | 'coverLayers'>) {
  const base = `/media/${game.slug}`;
  const entry = captured[game.slug];
  const image = (name: string) => ({ avif: `${base}/${name}.avif`,webp: `${base}/${name}.webp`,jpg: `${base}/${name}.jpg` });
  return {
    cover: `${base}/cover.svg`,
    layers: game.coverLayers.map(motion => ({ motion,src: `${base}/cover-${motion}.svg` })),
    logo: `${base}/logo.svg`,
    og: `/og/${game.slug}.jpg`,
    /** Captured gameplay, absent for games that have not been captured yet. */
    preview: entry ? { webm: `${base}/loop.webm`,mp4: `${base}/loop.mp4`,poster: image('poster'),seconds: entry.loopSeconds } : undefined,
    shots: entry ? entry.shots.map((alt,index) => ({ alt,full: image(`shot-${index+1}`),thumb: image(`shot-${index+1}-thumb`) })) : []
  };
}
export type GameMedia = ReturnType<typeof mediaFor>;
