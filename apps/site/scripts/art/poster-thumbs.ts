// Writes poster-thumb.{avif,webp,jpg} (480×270) next to every captured poster in public/media/<slug>/,
// for small tiles (Play again, the hero's picks, the parents' table). New captures write it
// themselves (scripts/capture/encode.ts); this fills it in for posters captured before.
// Usage: npx tsx scripts/art/poster-thumbs.ts [slug...]
import { existsSync,readdirSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { POSTER,writeImage } from '../capture/encode';

const media = resolve(import.meta.dirname,'../../public/media');
const asked = process.argv.slice(2);
for (const slug of asked.length ? asked : readdirSync(media)) {
  const poster = join(media,slug,'poster.jpg');
  if (!existsSync(poster)) continue;
  await writeImage(poster,join(media,slug,'poster-thumb'),POSTER.thumbWidth,POSTER.thumbHeight);
  console.log(`poster-thumb: ${slug}`);
}
