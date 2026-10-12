// Write the games-site registry entry for the current build: docs/registry-entry.json.
//   npm run build && npx tsx scripts/registry-entry.ts
// (The site's own registry schema isn't in this repo; this has everything it needs to be mapped across.)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.html';
const html = readFileSync(file);
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; description: string };
const entry = {
  slug: 'light-crossing',
  title: 'Light Crossing',
  version: pkg.version,
  description: 'A cozy island life-sim: make friends, fish, catch bugs, decorate, and light the old lighthouse.',
  ages: '6+',
  file: 'index.html',
  bytes: html.length,
  sha256: createHash('sha256').update(html).digest('hex'),
  singleFile: true,
  network: false,
  embed: { sandbox: 'allow-scripts', worksFromFile: true, optional: ['allow-same-origin (saves)', 'allowfullscreen (fullscreen button on tablets and desktops)'] },
  input: ['touch', 'keyboard', 'mouse', 'gamepad'],
  devices: ['phone', 'tablet', 'desktop'],
  orientation: 'any',
  storage: {
    prefix: 'lightcrossing.',
    keys: ['lightcrossing.slot0', 'lightcrossing.slot1', 'lightcrossing.slot2', 'lightcrossing.settings', 'lightcrossing.playtest.slot0', 'lightcrossing.playtest.slot1', 'lightcrossing.playtest.slot2', 'lightcrossing.__probe'],
    budgetPerSlotBytes: 300 * 1024,
    typicalSlotBytes: { newGame: 8_000, storyFinished: 23_000 },
  },
  preview: {
    route: '?preview=cover',
    scenes: ['cover', 'spring', 'summer', 'autumn', 'winter', 'festival', 'home', 'shop', 'villager'],
    ready: 'window.__previewReady === true (then wait ~1 s for the first frames)',
    suggestedSizes: ['1280x720', '1080x1080', '720x1280'],
  },
  playtime: 'about 6 hours of story, then open-ended',
};
writeFileSync('docs/registry-entry.json', JSON.stringify(entry, null, 2) + '\n');
console.log(`docs/registry-entry.json — ${entry.version}, ${entry.bytes} bytes, sha256 ${entry.sha256}`);
