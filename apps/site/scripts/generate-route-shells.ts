// After vite build: write a static HTML shell per route with its own title, description,
// canonical URL and Open Graph image, plus 404.html, sitemap.xml and robots.txt.
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { categories,games } from '../src/data/games';

// Canonical origin: SITE_ORIGIN, else the Vercel production domain (available in every Vercel
// build), else the deployment URL, else local preview.
const origin = (process.env.SITE_ORIGIN
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  || 'http://127.0.0.1:4190').replace(/\/$/,'');
const preview = process.env.VERCEL_ENV === 'preview';
const escape = (value: string) => value.replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]!));
const shell = readFileSync('dist/index.html','utf8');

interface Route { path: string; title: string; description: string; image?: string; index?: boolean }
const routes: Route[] = [
  { path: '/games',title: 'Find a game',description: 'Search the games by name, category or what you love to play, and filter by age.' },
  { path: '/favorites',title: 'Favorites',description: 'Your favorite games, saved on this device.',index: false },
  { path: '/parents',title: 'For parents',description: 'No ads, no tracking, no accounts. Game progress stays on your device. Age guidance for every game.' },
  { path: '/privacy',title: 'Privacy',description: 'Ai Kids Games has no accounts, ads, analytics or tracking. Game progress stays on your device.' },
  { path: '/about',title: 'About',description: 'Ai Kids Games is a small collection of original games for kids.' },
  ...categories.map(category => ({ path: `/category/${category.toLowerCase()}`,title: `${category} games`,description: `${category} games for kids at Ai Kids Games. No ads, no tracking, no accounts.` })),
  ...games.flatMap(game => [
    { path: `/game/${game.slug}`,title: game.title,description: `${game.tagline} ${game.ageGuidance}. Play in your browser, with no ads or accounts.`,image: `/og/${game.slug}.jpg` },
    { path: `/play/${game.slug}`,title: `Play ${game.title}`,description: `Play ${game.title} in your browser. ${game.tagline}`,image: `/og/${game.slug}.jpg` }
  ])
];

function page({ path,title,description,image = '/og/site.jpg',index = true }: Route,fullTitle = `${title} | Ai Kids Games`) {
  const head = [`<link rel="canonical" href="${escape(origin+(path === '/404' ? '/' : path))}" />`,...(!index || preview ? ['<meta name="robots" content="noindex" />'] : [])].join('\n    ');
  return shell.replace(/<title>.*?<\/title>/,() => `<title>${escape(fullTitle)}</title>\n    ${head}`)
    .replace(/(<meta name="description" content=")[^"]*/,(_m,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:title" content=")[^"]*/,(_m,prefix: string) => prefix+escape(title))
    .replace(/(<meta property="og:description" content=")[^"]*/,(_m,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:url" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+path))
    .replace(/(<meta property="og:image" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+image))
    .replace(/(<meta name="twitter:image" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+image));
}

writeFileSync('dist/index.html',page({ path: '/',title: 'Ai Kids Games — Little games. Big adventures.',description: 'Five original games for kids. No ads, no tracking, no accounts. Just press Play.' },'Ai Kids Games — Little games. Big adventures.'));
for (const route of routes) { const dir = resolve('dist','.'+route.path); mkdirSync(dir,{ recursive: true }); writeFileSync(resolve(dir,'index.html'),page(route)); }
writeFileSync('dist/404.html',page({ path: '/404',title: 'Page not found',description: 'This page wandered off. Head back home to find a game.',index: false }));
// Play pages stay indexable (they are real pages) but the sitemap lists the details pages instead.
const listed = ['/',...routes.filter(route => route.index !== false && !route.path.startsWith('/play/')).map(route => route.path)];
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(path => `  <url><loc>${escape(origin+path)}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('dist/robots.txt',preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Static pages for ${routes.length+1} routes, sitemap (${listed.length} URLs) and robots.txt for ${origin}${preview ? ' (preview: noindex)' : ''}.`);
