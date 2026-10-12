// After vite build: write a static HTML shell per route with its own title, description,
// keywords, canonical URL, Open Graph image and structured data (JSON-LD: WebSite and
// Organization everywhere, VideoGame on each game page), plus 404.html, sitemap.xml and robots.txt.
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

interface Route { path: string; title: string; description: string; image?: string; index?: boolean; keywords?: string[]; data?: object[] }
const REPO = 'https://github.com/msoyaph/AI-Kids-Games';
const SITE_DESCRIPTION = 'Free, ad-free browser games for kids: kart racing, farming, tower defense, space adventures and more. No subscriptions, no sign-ups, no tracking.';
const organization = { '@type': 'Organization','@id': `${origin}/#organization`,name: 'Ai Kids Games',url: `${origin}/`,logo: `${origin}/icon-512.png`,sameAs: [REPO] };
const website = { '@type': 'WebSite','@id': `${origin}/#website`,name: 'Ai Kids Games',url: `${origin}/`,description: SITE_DESCRIPTION,inLanguage: 'en',publisher: { '@id': `${origin}/#organization` } };
/** schema.org VideoGame for a game's details page. */
function videoGame(game: typeof games[number]) {
  const ages = /(\d+)(?:–(\d+))?/.exec(game.ageGuidance);
  return {
    '@type': 'VideoGame','@id': `${origin}/game/${game.slug}#game`,name: game.title,description: game.description,url: `${origin}/game/${game.slug}`,
    image: `${origin}/og/${game.slug}.jpg`,genre: game.categories,keywords: game.keywords.join(', '),gamePlatform: 'Web browser',applicationCategory: 'Game',
    operatingSystem: 'Any device with a modern web browser',inLanguage: 'en',version: game.version,datePublished: game.releaseDate,
    audience: { '@type': 'PeopleAudience',suggestedMinAge: game.minAge,...(ages?.[2] ? { suggestedMaxAge: Number(ages[2]) } : {}) },
    typicalAgeRange: ages?.[2] ? `${ages[1]}-${ages[2]}` : `${game.minAge}-`,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer',price: '0',priceCurrency: 'USD',availability: 'https://schema.org/InStock',url: `${origin}/play/${game.slug}` },
    publisher: { '@id': `${origin}/#organization` }
  };
}
const routes: Route[] = [
  { path: '/games',title: 'Find a game',description: 'Search the games by name, category or what you love to play, and filter by age.' },
  { path: '/favorites',title: 'Favorites',description: 'Your favorite games, saved on this device.',index: false },
  { path: '/parents',title: 'For parents',description: 'No ads, no subscriptions, no sign-ups, no tracking. Game progress stays on your device. Age guidance for every game.' },
  { path: '/privacy',title: 'Privacy',description: 'Ai Kids Games has no accounts, ads, analytics or tracking. Game progress stays on your device.' },
  { path: '/about',title: 'About',description: 'Ai Kids Games makes free, open-source browser games for kids, with no ads, subscriptions, sign-ups or tracking.' },
  { path: '/list-your-game',title: 'List your game',description: 'Listing kid-safe games made by others on Ai Kids Games is coming soon. See what a game needs, and get in line on GitHub.' },
  ...categories.map(category => ({ path: `/category/${category.toLowerCase()}`,title: `${category} games`,description: `${category} games for kids at Ai Kids Games. No ads, no tracking, no accounts.` })),
  ...games.flatMap(game => [
    { path: `/game/${game.slug}`,title: `${game.title}: a free ${game.categories[0]!.toLowerCase()} game for kids`,description: `${game.description} ${game.ageGuidance}. Free, no ads or sign-ups.`,image: `/og/${game.slug}.jpg`,keywords: game.keywords,data: [videoGame(game)] },
    { path: `/play/${game.slug}`,title: `Play ${game.title}`,description: `Play ${game.title} free in your browser. ${game.tagline}`,image: `/og/${game.slug}.jpg`,keywords: game.keywords }
  ])
];

function page({ path,title,description,image = '/og/site.jpg',index = true,keywords,data = [] }: Route,fullTitle = `${title} | Ai Kids Games`) {
  // JSON-LD is data, not script: the CSP (script-src 'self') never runs it. '<' is escaped so it can't close the tag.
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org','@graph': [website,organization,...data] }).replace(/</g,'\\u003c');
  const head = [`<link rel="canonical" href="${escape(origin+(path === '/404' ? '/' : path))}" />`,...(!index || preview ? ['<meta name="robots" content="noindex" />'] : []),...(keywords?.length ? [`<meta name="keywords" content="${escape(keywords.join(', '))}" />`] : []),`<script type="application/ld+json">${jsonLd}</script>`].join('\n    ');
  return shell.replace(/<title>.*?<\/title>/,() => `<title>${escape(fullTitle)}</title>\n    ${head}`)
    .replace(/(<meta name="description" content=")[^"]*/,(_m,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:title" content=")[^"]*/,(_m,prefix: string) => prefix+escape(title))
    .replace(/(<meta property="og:description" content=")[^"]*/,(_m,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:url" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+path))
    .replace(/(<meta property="og:image" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+image))
    .replace(/(<meta name="twitter:image" content=")[^"]*/,(_m,prefix: string) => prefix+escape(origin+image));
}

writeFileSync('dist/index.html',page({ path: '/',title: "Ai Kids Games: The games kids love. None of the stuff parents don’t.",description: 'Free, ad-free browser games for kids: kart racing, farming, tower defense, space adventures and more. No subscriptions, no sign-ups, no tracking.' },"Ai Kids Games: The games kids love. None of the stuff parents don’t."));
for (const route of routes) { const dir = resolve('dist','.'+route.path); mkdirSync(dir,{ recursive: true }); writeFileSync(resolve(dir,'index.html'),page(route)); }
writeFileSync('dist/404.html',page({ path: '/404',title: 'Page not found',description: 'This page wandered off. Head back home to find a game.',index: false }));
// Play pages stay indexable (they are real pages) but the sitemap lists the details pages instead.
const listed = ['/',...routes.filter(route => route.index !== false && !route.path.startsWith('/play/')).map(route => route.path)];
// llms.txt names the site by its permanent address; serve it with this deployment's own origin until that domain is live.
writeFileSync('dist/llms.txt',readFileSync('dist/llms.txt','utf8').replaceAll('https://aikids.games',origin));
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(path => `  <url><loc>${escape(origin+path)}</loc></url>`).join('\n')}\n</urlset>\n`);
// Search engines and AI assistants' crawlers are welcome on the public site; previews stay private.
const crawlers = ['GPTBot','ClaudeBot','PerplexityBot','Google-Extended','Applebot-Extended'];
writeFileSync('dist/robots.txt',preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\n${crawlers.map(bot => `User-agent: ${bot}\nAllow: /\n`).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Static pages for ${routes.length+1} routes, sitemap (${listed.length} URLs) and robots.txt for ${origin}${preview ? ' (preview: noindex)' : ''}.`);
