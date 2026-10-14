// The self-hosted trailers (public/trailer/, made by marketing/sizzle): the 60-second reel on
// About (trailer.json, npm run reel) and each game's own 15-second trailer (game-trailers.json,
// npm run trailers).
import gameTrailers from './game-trailers.json';

export interface TrailerData { seconds: number; poster: string; posterWebp: string; captions: string; description: string[]; sources: { src: string; type: string }[]; published?: string }

/** Each game's own trailer, if it has one. */
export const gameTrailer = (slug: string): TrailerData | undefined => (gameTrailers as Record<string,TrailerData>)[slug];
