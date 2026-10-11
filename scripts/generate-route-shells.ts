import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { categories,games } from '../src/data/games';
const origin = 'https://ai-kids-games.real-tours-1786.chatgpt.site';
const escape = (value: string) => value.replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]!));
const shell = readFileSync('dist/index.html','utf8');
const routes: { path: string; title: string; description: string; image?: string }[] = [
  { path: '/games', title: 'Find your next favorite', description: 'Browse original browser games. Search by name, category, or what you love to play.' },
  { path: '/favorites',title: 'My Favorites',description: 'Your very own little collection, saved only on this device.' },
  { path: '/parents',title: 'For Parents',description: 'Our play promise: no ads, chat, accounts, or tracking. Only device-local favorites and recent games.' },
  { path: '/about',title: 'About',description: 'A small, cheerful collection of original browser games.' },
  ...categories.map(category => ({ path: `/category/${category.toLowerCase()}`,title: `${category} games`,description: `Find your next ${category.toLowerCase()} adventure at Ai Kids Games.` })),
  ...games.flatMap(game => [{ path: `/game/${game.slug}`,title: game.title,description: game.tagline,image: game.banner },{ path: `/play/${game.slug}`,title: `Play ${game.title}`,description: game.tagline,image: game.banner }])
];
function metadata(title: string, description: string,path: string,image = '/art/light-crossing.svg') {
  return shell.replace(/<title>.*?<\/title>/,() => `<title>${escape(title)} | Ai Kids Games</title>`)
    .replace(/(<meta name="description" content=")[^"]*/,(_match,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:title" content=")[^"]*/,(_match,prefix: string) => prefix+escape(title))
    .replace(/(<meta property="og:description" content=")[^"]*/,(_match,prefix: string) => prefix+escape(description))
    .replace(/(<meta property="og:url" content=")[^"]*/,(_match,prefix: string) => prefix+escape(origin+path))
    .replace(/(<meta property="og:image" content=")[^"]*/,(_match,prefix: string) => prefix+escape(origin+image));
}
for (const route of routes) { const dir = resolve('dist','.'+route.path); mkdirSync(dir,{ recursive: true }); writeFileSync(resolve(dir,'index.html'),metadata(route.title,route.description,route.path,route.image)); }
writeFileSync('dist/404.html',metadata('Oops! Page not found','This page wandered off. Let’s find another adventure.','/404'));
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/',...routes.filter(route => !route.path.startsWith('/play/')).map(route => route.path)].map(path => `<url><loc>${escape(origin+path)}</loc></url>`).join('')}</urlset>`);
console.log(`Static page metadata generated for ${routes.length} routes.`);
