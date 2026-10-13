// npm run build --workspace apps/play
// Builds the community games this deployment serves, from source, with the shared kit
// (scripts/submission/vite-config.ts), into .vercel/output (Vercel's Build Output API) with the
// routes and headers from routes.ts.
// - Production serves only approved, listed games whose source still matches what the owner
//   approved (approval.sourceSha256), after the same release guard as the website.
// - Previews serve every game that isn't unlisted, so a pull request's game can be tried on this
//   separate origin before review.
import { spawnSync } from 'node:child_process';
import { mkdirSync,readdirSync,rmSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { build } from 'vite';
import { communityMode,servedCommunity } from '../../../scripts/lib/community';
import { validCommunityManifests } from '../../../scripts/lib/manifest';
import { communityDir,site } from '../../../scripts/lib/repo';
import { communityViteConfig } from '../../../scripts/submission/vite-config';
import { PUBLIC_ORIGIN } from '../../site/src/data/site';
import { playRoutes } from './routes';

const production = communityMode() === 'production';
if (production) {
  // The website's release guard: the same version, owner approval, recorded local suites and branch.
  const guard = spawnSync('npx',['tsx','scripts/check-deployment.ts'],{ cwd: site,stdio: 'inherit',env: process.env });
  if (guard.status !== 0) throw new Error('Production deployment refused by the release guard (apps/site/scripts/check-deployment.ts).');
}
const out = resolve(import.meta.dirname,'../.vercel/output'), staticDir = join(out,'static');
rmSync(out,{ recursive: true,force: true }); mkdirSync(staticDir,{ recursive: true });

const included: string[] = [];
const { valid,invalid } = validCommunityManifests();
const { served,skipped } = servedCommunity(valid,communityMode(),communityDir);
for (const { slug,why } of [...invalid,...skipped]) console.log(`skip ${slug}: ${why}`);
for (const { manifest: m } of served) {
  await build(communityViteConfig(communityDir(m.slug),join(staticDir,m.slug)));
  const files = readdirSync(join(staticDir,m.slug));
  if (files.length !== 1 || files[0] !== 'index.html') throw new Error(`${m.slug}: the build made ${files.join(', ')} instead of one index.html.`);
  included.push(m.slug);
  console.log(`built ${m.slug}`);
}

const siteOrigins = production ? [...new Set([process.env.SITE_ORIGIN || PUBLIC_ORIGIN].map(origin => origin.replace(/\/$/,'')))] : ['https://*.vercel.app','http://127.0.0.1:*','http://localhost:*'];
const page = (title: string,body: string) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="font:18px/1.5 system-ui,sans-serif;max-width:36em;margin:15vh auto;padding:0 24px;color:#16191F"><h1 style="font-size:28px">${title}</h1>${body}</body></html>\n`;
writeFileSync(join(staticDir,'index.html'),page('AI Kids Games community games','<p>This address serves the community games of AI Kids Games, each from its own address, so they can\'t reach the website or each other. Play them on the AI Kids Games website.</p>'));
writeFileSync(join(staticDir,'404.html'),page('Not here','<p>There\'s no game at this address. Community games are played on the AI Kids Games website.</p>'));
writeFileSync(join(staticDir,'games.json'),`${JSON.stringify({ mode: production ? 'production' : 'preview',games: included },null,2)}\n`);
writeFileSync(join(out,'config.json'),`${JSON.stringify(playRoutes({ slugs: included,production,siteOrigins }),null,2)}\n`);
console.log(`Play origin (${production ? 'production' : 'preview'}): ${included.length} game(s)${included.length ? `: ${included.join(', ')}` : ''}.`);
