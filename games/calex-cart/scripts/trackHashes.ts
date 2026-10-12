/**
 * Fingerprints of every track's baked geometry and hand-placed props (normal + mirrored).
 *   npx tsx scripts/trackHashes.ts --write   → tests/fixtures/track-hashes.json
 * tests/unit/trackHashes.test.ts compares against that file, proving that builder changes behind the
 * `legacyMarkHeadings` flag leave existing tracks exactly as they were.
 */
import { writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index';
import { trackFingerprint } from '../src/data/tracks/fingerprint';

const out: Record<string, string> = {};
for (const t of TRACKS) {
  out[t.id] = trackFingerprint(t, false);
  out[`${t.id}:mirror`] = trackFingerprint(t, true);
}
if (process.argv.includes('--write')) {
  writeFileSync('tests/fixtures/track-hashes.json', JSON.stringify(out, null, 1));
  console.log(`wrote ${Object.keys(out).length} fingerprints`);
} else console.log(JSON.stringify(out, null, 1));
