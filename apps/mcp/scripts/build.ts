// npm run build --workspace apps/mcp
// 1. The production gate (scripts/check-deployment.ts).
// 2. The widget: widget/ built by Vite into one self-contained file, dist/widget.html.
// 3. The Vercel output (Build Output API, .vercel/output): the /mcp function bundled by esbuild with the
//    widget inlined, a small landing page, the icons (served next to the server, as MCP icons should be)
//    and the routes with their headers.
import { copyFileSync,mkdirSync,readFileSync,renameSync,rmSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { build as bundle } from 'esbuild';
import { build as vite } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { checkDeployment } from './check-deployment';
import { siteFrom } from '../src/config';

// Production only past the owner's gate; anything else is a preview. The target also goes into
// .vercel/output/builds.json, so a prebuilt upload (vercel deploy --prebuilt) can't land in production by
// default: the first upload of a new project once did, because it skipped this build's gate.
console.log(checkDeployment());
const target = (process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV) === 'production' ? 'production' : 'preview';
const here = resolve(import.meta.dirname,'..'), dist = join(here,'dist'), out = join(here,'.vercel/output');
const site = siteFrom();

rmSync(dist,{ recursive: true,force: true });
await vite({
  root: join(here,'widget'),configFile: false,logLevel: 'warn',
  build: { outDir: join(dist,'widget'),emptyOutDir: true,target: 'es2022',assetsInlineLimit: Infinity,cssCodeSplit: false,modulePreload: false,reportCompressedSize: false },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })]
});
renameSync(join(dist,'widget/index.html'),join(dist,'widget.html'));
rmSync(join(dist,'widget'),{ recursive: true });
const widgetBytes = readFileSync(join(dist,'widget.html')).length;
if (widgetBytes > 150_000) throw new Error(`The widget is ${widgetBytes} bytes; keep it under 150 KB.`);

// Static files: icons from the website's own set, and a page for people who open the address in a browser.
const statics = join(dist,'static');
mkdirSync(join(statics,'.well-known'),{ recursive: true });
for (const size of [192,512]) copyFileSync(join(here,`../site/public/icon-${size}.png`),join(statics,`icon-${size}.png`));
const page = (title: string,body: string) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><link rel="icon" href="/icon-192.png"><body style="font:18px/1.5 system-ui,sans-serif;max-width:36em;margin:15vh auto;padding:0 24px;color:#16191F;background:#F5F6F8"><h1 style="font-size:28px">${title}</h1>${body}</body></html>\n`;
writeFileSync(join(statics,'index.html'),page('AI Kids Games app for AI assistants',`<p>This is the address AI assistants use to find and show AI Kids Games: <code>/mcp</code>. There's nothing to see here in a browser.</p><p>Play the games on <a href="${site.origin}/">${site.host}</a>.</p>`));
writeFileSync(join(statics,'404.html'),page('Not here',`<p>The AI Kids Games MCP endpoint is <code>/mcp</code>. The games are on <a href="${site.origin}/">${site.host}</a>.</p>`));
writeFileSync(join(statics,'robots.txt'),'User-agent: *\nDisallow: /\n');
// ChatGPT's domain check for directory submission: the owner sets the token in Vercel when submitting.
if (process.env.OPENAI_APPS_CHALLENGE) writeFileSync(join(statics,'.well-known/openai-apps-challenge'),process.env.OPENAI_APPS_CHALLENGE.trim());

rmSync(out,{ recursive: true,force: true });
const fn = join(out,'functions/mcp.func');
mkdirSync(fn,{ recursive: true });
await bundle({
  entryPoints: [join(here,'src/vercel.ts')],outfile: join(fn,'index.mjs'),bundle: true,platform: 'node',format: 'esm',target: 'node22',
  loader: { '.html': 'text' },legalComments: 'none',logLevel: 'warning',
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' }
});
writeFileSync(join(fn,'.vc-config.json'),`${JSON.stringify({ runtime: 'nodejs22.x',handler: 'index.mjs',launcherType: 'Nodejs',shouldAddHelpers: false,supportsResponseStreaming: true,maxDuration: 30 },null,2)}\n`);
writeFileSync(join(fn,'package.json'),'{ "type": "module" }\n');
writeFileSync(join(out,'builds.json'),`${JSON.stringify({ '//': 'Written by apps/mcp/scripts/build.ts. Not part of the Build Output API.',target,argv: process.argv,builds: [] },null,2)}\n`);
const staticOut = join(out,'static');
mkdirSync(join(staticOut,'.well-known'),{ recursive: true });
for (const file of ['index.html','404.html','robots.txt','icon-192.png','icon-512.png',...(process.env.OPENAI_APPS_CHALLENGE ? ['.well-known/openai-apps-challenge'] : [])]) copyFileSync(join(statics,file),join(staticOut,file));
const pageHeaders = { 'x-content-type-options': 'nosniff','referrer-policy': 'no-referrer','x-robots-tag': 'noindex','content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'cache-control': 'public, max-age=0, must-revalidate' };
writeFileSync(join(out,'config.json'),`${JSON.stringify({ version: 3,routes: [
  { src: '^/(.*)$',headers: pageHeaders,continue: true },
  { src: '^/mcp/?$',dest: '/mcp' },
  { handle: 'filesystem' },
  { src: '^/.*$',status: 404,dest: '/404.html' }
] },null,2)}\n`);
console.log(`Built the MCP app (${target}) for ${site.origin}: widget ${(widgetBytes/1024).toFixed(1)} KB, function .vercel/output/functions/mcp.func.`);
