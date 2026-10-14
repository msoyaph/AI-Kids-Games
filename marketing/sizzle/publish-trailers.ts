// npm run publish:trailers [-- <slug> …]: copy each game's trailer (out/trailers/<slug>/, from npm run
// render) into the site (apps/site/public/trailer/<slug>/) and write the player's data,
// apps/site/src/data/game-trailers.json: the files, the length and a description of what is on
// screen, for people who can't see the video. Naming games publishes only those, and keeps the
// others' published files and data as they are (their renders need not be on this computer).
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { at, CUTS, game, root, sizzle, TRAILER_ORDER, TRAILERS, trailerId } from './reel.config';

const out = join(sizzle, 'out/trailers'), site = join(root, 'apps/site');
const FILES = ['trailer-720.webm', 'trailer-720.mp4', 'poster.jpg', 'poster.webp', 'trailer.en.vtt'];
const dataFile = join(site, 'src/data/game-trailers.json');
/** The day each trailer was first published is kept (the VideoObject's uploadDate). */
const before = (existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : {}) as Record<string, { published?: string }>;
const named = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
for (const slug of named) if (!TRAILER_ORDER.includes(slug as never)) throw new Error(`Unknown game: ${slug}`);
const today = new Date().toISOString().slice(0, 10);
const data: Record<string, unknown> = {};
for (const slug of TRAILER_ORDER) {
  if (named.length && !named.includes(slug)) {
    if (!before[slug]) throw new Error(`${slug} has no published trailer yet: publish it too`);
    data[slug] = before[slug];
    continue;
  }
  const from = join(out, slug), dest = join(site, 'public/trailer', slug);
  for (const file of FILES) if (!existsSync(join(from, file))) throw new Error(`Missing ${join(from, file)}: run npm run render -- game-${slug}`);
  mkdirSync(dest, { recursive: true });
  for (const file of FILES) {
    if (/\.(mp4|webm)$/.test(file) && statSync(join(from, file)).size > 3_000_000) throw new Error(`${slug}/${file} is over 3 MB`);
    copyFileSync(join(from, file), join(dest, file));
  }
  const g = game(slug), t = TRAILERS[slug], cut = CUTS.find(c => c.id === trailerId(slug))!;
  data[slug] = {
    seconds: +at(cut.beats).toFixed(2),
    published: before[slug]?.published ?? today,
    poster: `/trailer/${slug}/poster.jpg`,
    posterWebp: `/trailer/${slug}/poster.webp`,
    sources: [{ src: `/trailer/${slug}/trailer-720.webm`, type: 'video/webm; codecs="av01.0.05M.08, opus"' }, { src: `/trailer/${slug}/trailer-720.mp4`, type: 'video/mp4' }],
    captions: `/trailer/${slug}/trailer.en.vtt`,
    description: [
      `${g.title} gameplay: ${t.describe}`,
      `The ${g.title} logo and its pitch: “${g.tagline}” ${g.ages}.`,
      `On screen: “${t.line}”`,
      'The end card: the AI Kids Games logo, “Play free” and “No ads. No sign-ups. No tracking.”'
    ]
  };
  console.log(`published ${slug}`);
}
writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n');
console.log(`wrote apps/site/src/data/game-trailers.json (${TRAILER_ORDER.length} trailers)`);
