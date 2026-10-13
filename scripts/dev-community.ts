// npm run dev:community -- <slug>
// Plays a community game while you build it: the shared kit's Vite dev server for community/<slug>/
// (the same config check-submission builds with), with live reload.
import { createServer } from 'vite';
import { communityDir,SLUG } from './lib/repo';
import { communityViteConfig } from './submission/vite-config';

const slug = process.argv[2];
if (!slug || !SLUG.test(slug)) { console.error('Usage: npm run dev:community -- <slug>'); process.exit(2); }
const dir = communityDir(slug);
const server = await createServer(communityViteConfig(dir,`${dir}/.check/dist`,'dev'));
await server.listen();
server.printUrls();
console.log('Edit files in community/'+slug+'/ and the page reloads. Press Ctrl+C to stop.');
