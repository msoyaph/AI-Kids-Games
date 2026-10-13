// npm run reel: music → media and compositions → HyperFrames renders and encodes → review →
// publish the web trailer to the site. Capturing is separate (npm run capture -- <slug> (in marketing/sizzle)).
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { sizzle } from './reel.config';

const steps: [string, string[]][] = [
  ['music', ['music/render.ts']],
  ['compose', ['compose/build.ts']],
  ['render', ['render/run.ts', ...process.argv.slice(2)]],
  ['review', ['review/run.ts']],
  ['publish', ['render/publish.ts']]
];
for (const [name, args] of steps) {
  console.log(`\n== ${name}`);
  execFileSync('npx', ['tsx', ...args], { cwd: sizzle, stdio: 'inherit' });
}
console.log(`\nDone: ${join(sizzle, 'out')}`);
