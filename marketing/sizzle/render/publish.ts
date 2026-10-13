// Copy the web trailer into the site (apps/site/public/trailer/), write the player's data
// (apps/site/src/data/trailer.json) and put the README thumbnail in docs/media/.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { at, CUTS, game, ORDER, REEL, root, sizzle } from '../reel.config';

const out = join(sizzle, 'out'), site = join(root, 'apps/site'), dest = join(site, 'public/trailer');
mkdirSync(dest, { recursive: true }); mkdirSync(join(root, 'docs/media'), { recursive: true });
const files = ['trailer-1080.webm', 'trailer-1080.mp4', 'trailer-720.webm', 'trailer-720.mp4', 'trailer-poster.jpg', 'trailer-poster.webp'];
for (const file of files) {
  const from = join(out, file);
  if (!existsSync(from)) throw new Error(`Missing ${from}: run npm run render`);
  if (file.match(/\.(mp4|webm)$/) && statSync(from).size >= 8_000_000) throw new Error(`${file} is over 8 MB`);
  copyFileSync(from, join(dest, file));
}
copyFileSync(join(out, 'ai-kids-games-reel.en.vtt'), join(dest, 'trailer.en.vtt'));
copyFileSync(join(out, 'trailer-thumbnail.jpg'), join(root, 'docs/media/trailer-thumbnail.jpg'));

const reel = CUTS.find(cut => cut.id === 'reel')!;
const description = [
  'A kart drifts through a snowy village at night, sparks flying. The Ai Kids Games logo appears.',
  'Words on screen: “The games kids love. None of the stuff parents don’t.”',
  ...ORDER.map(slug => { const g = game(slug); return `${g.title} (${g.ages.toLowerCase()}): ${REEL[slug].describe} On screen: “${g.tagline}”`; }),
  'On screen: “No ads. No subscriptions. No sign-ups. No tracking.”',
  'A phone and a tablet show the games played by touch. On screen: “Phones, tablets and computers.”',
  'On screen: “Free and open source. Build your own.”',
  'The end card: “The games kids love. aikids.games. Play free.”'
];
writeFileSync(join(site, 'src/data/trailer.json'), JSON.stringify({
  seconds: +at(reel.beats).toFixed(2),
  poster: '/trailer/trailer-poster.jpg',
  posterWebp: '/trailer/trailer-poster.webp',
  captions: '/trailer/trailer.en.vtt',
  description
}, null, 2) + '\n');
console.log(`published ${files.length + 1} files to apps/site/public/trailer/ and the thumbnail to docs/media/`);
