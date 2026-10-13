// After vite build: write every page as static HTML with its real content, rendered from the same
// React components as the app (src/entry-server.tsx), so search engines and AI assistants read the
// words without running JavaScript. Each page also gets its own title, description, canonical URL,
// share tags and structured data (src/seo). Then 404.html (served with status 404 for unknown
// paths), sitemap.xml, robots.txt, llms.txt and llms-full.txt.
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderPage } from '../src/entry-server';
import { games } from '../src/data/games';
import { BRAND } from '../src/data/site';
import { llmsFullText,llmsText } from '../src/seo/llms';
import { pageMeta,sitePaths,unlistedPaths } from '../src/seo/meta';
import { structuredData } from '../src/seo/schema';

// Canonical origin: SITE_ORIGIN, else the Vercel production domain (available in every Vercel
// build), else the deployment URL, else local preview.
const origin = (process.env.SITE_ORIGIN
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  || 'http://127.0.0.1:4190').replace(/\/$/,'');
const preview = process.env.VERCEL_ENV === 'preview';
const escape = (value: string) => value.replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]!));
const shell = readFileSync('dist/index.html','utf8');

function page(path: string) {
  const meta = pageMeta(path);
  // JSON-LD is data, not script: the CSP (script-src 'self') never runs it. '<' is escaped so it can't close the tag.
  const jsonLd = JSON.stringify(structuredData(path,origin)).replace(/</g,'\\u003c');
  const head = [
    ...(meta.missing ? [] : [`<link rel="canonical" href="${escape(origin+path)}" />`]),
    ...(!meta.index || preview ? ['<meta name="robots" content="noindex" />'] : []),
    `<script type="application/ld+json">${jsonLd}</script>`
  ].join('\n    ');
  const set = (attribute: string,value: string) => (html: string) => html.replace(new RegExp(`(<meta ${attribute} content=")[^"]*`),(_match,prefix: string) => prefix+escape(value));
  const tags = [
    set('name="description"',meta.description),set('property="og:title"',meta.title),set('property="og:description"',meta.description),
    set('property="og:url"',origin+path),set('property="og:image"',origin+meta.image),set('property="og:image:alt"',meta.imageAlt),
    set('name="twitter:title"',meta.title),set('name="twitter:description"',meta.description),set('name="twitter:image"',origin+meta.image)
  ];
  const html = tags.reduce((text,apply) => apply(text),shell)
    .replace(/<title>.*?<\/title>/,() => `<title>${escape(meta.fullTitle)}</title>\n    ${head}`)
    .replace('<div id="root"></div>',() => `<div id="root">${renderPage(path)}</div>`);
  if (html.includes('<div id="root"></div>')) throw new Error(`${path}: nothing rendered`);
  return html;
}

const write = (path: string,html: string) => { const dir = resolve('dist','.'+path); mkdirSync(dir,{ recursive: true }); writeFileSync(resolve(dir,'index.html'),html); };
const listed = sitePaths(), unlisted = unlistedPaths();
for (const path of [...listed,...unlisted]) write(path,page(path));
writeFileSync('dist/404.html',page('/404'));

writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(path => `  <url><loc>${escape(origin+path)}</loc></url>`).join('\n')}\n</urlset>\n`);
// Search engines and AI assistants' crawlers are welcome on the public site; previews stay private.
const crawlers = ['Googlebot','Bingbot','Applebot','DuckDuckBot','GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-SearchBot','Claude-User','PerplexityBot','Perplexity-User','Google-Extended','Applebot-Extended','CCBot'];
writeFileSync('dist/robots.txt',preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\n${crawlers.map(bot => `User-agent: ${bot}\nAllow: /\n`).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`);
writeFileSync('dist/llms.txt',llmsText(origin,games));
writeFileSync('dist/llms-full.txt',llmsFullText(origin,games));
console.log(`${BRAND}: static HTML for ${listed.length+unlisted.length} pages and 404.html, sitemap (${listed.length} URLs), robots.txt, llms.txt and llms-full.txt for ${origin}${preview ? ' (preview: noindex)' : ''}.`);
