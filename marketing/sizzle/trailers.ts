// npm run trailers: every game's quick trailer, end to end: music → compositions → HyperFrames
// renders (16:9 and 9:16) and web encodes → review → publish to the site. The 60-second reel
// and its cutdown are left as they are. Capture first: npm run capture -- <slug>.
import { execFileSync } from 'node:child_process';
import { sizzle } from './reel.config';

const steps: [string, string[]][] = [
  ['music', ['music/render.ts']],
  ['compose', ['compose/build.ts', 'game-']],
  ['render', ['render/run.ts', 'game-', ...process.argv.slice(2)]],
  ['review', ['review/run.ts', 'game-']],
  ['publish', ['publish-trailers.ts']]
];
for (const [name, args] of steps) {
  console.log(`\n== ${name}`);
  execFileSync('npx', ['tsx', ...args], { cwd: sizzle, stdio: 'inherit' });
}
