// Every page's title, description, share image and indexing, from its path. The build writes
// them into each page's static HTML (scripts/generate-route-shells.ts) and the app keeps them up
// to date as people move around (usePageMeta), so the two can never disagree.
import { categories,findGame,games,type Category } from '../data/games';
import { findGuide,guides } from '../data/guides';
import { BRAND,SITE_DESCRIPTION,TAGLINE } from '../data/site';

export interface PageMeta {
  title: string;
  /** The <title>; most pages add " | AI Kids Games". */
  fullTitle: string;
  description: string;
  image: string;
  imageAlt: string;
  /** false: not in the sitemap, and noindex. */
  index: boolean;
  /** true for the 404 page (served with status 404). */
  missing?: boolean;
}

const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
const page = (title: string,description: string,extra: Partial<PageMeta> = {}): PageMeta => ({ title,fullTitle: `${title} | ${BRAND}`,description,image: '/og/site.jpg',imageAlt: `${BRAND}: ${TAGLINE}`,index: true,...extra });
const notFound = () => page('Page not found','This page wandered off. Head back home to find a game.',{ index: false,missing: true });

/** Every indexable path: the sitemap, IndexNow and the build's static pages all use this list. */
export function sitePaths() {
  return ['/','/games','/faq','/parents','/guides',...guidePaths(),'/privacy','/about','/list-your-game',...categories.map(category => `/category/${category.toLowerCase()}`),...games.map(game => `/game/${game.slug}`)];
}
const guidePaths = () => guides.map(guide => `/guides/${guide.slug}`);
/** Pages that get static HTML but stay out of the sitemap: play pages (the details page is the one to find) and Favorites. */
export const unlistedPaths = () => ['/favorites',...games.map(game => `/play/${game.slug}`)];

export function pageMeta(pathname: string): PageMeta {
  const path = pathname.replace(/\/+$/,'') || '/';
  const [,section,slug] = path.split('/');
  if (path === '/') return { ...page(BRAND,SITE_DESCRIPTION),fullTitle: `${BRAND}: ${TAGLINE}` };
  if (path === '/games') return page('Find a game',`Search ${BRAND} by name, category or what your kid loves to play, and filter by age. Every game is free, with no ads or purchases.`);
  if (section === 'category') {
    const category = categories.find(name => name.toLowerCase() === slug) as Category | undefined;
    if (!category) return notFound();
    const titles = games.filter(game => game.categories.includes(category)).map(game => game.title);
    return page(`${category} games for kids`,`Free ${category.toLowerCase()} games for kids that play in the browser: ${list(titles)}. No ads, purchases or sign-ups.`);
  }
  if (section === 'game' || section === 'play') {
    const game = findGame(slug);
    if (!game) return notFound();
    const devices = list(game.supportedDevices.map(device => device.toLowerCase()));
    const art = { image: `/og/${game.slug}.jpg`,imageAlt: `${game.title}: ${game.tagline}` };
    return section === 'game'
      ? page(`${game.title}: a free ${game.categories[0]!.toLowerCase()} game for kids`,`${game.tagline} ${game.ageGuidance}. Free to play in the browser on ${devices}, with no ads, purchases or chat.`,art)
      : page(`Play ${game.title}`,`Play ${game.title} free in your browser. ${game.tagline} ${game.ageGuidance}. No ads, purchases or sign-ups.`,art);
  }
  if (section === 'guides' && slug) { const guide = findGuide(slug); return guide ? page(guide.title,guide.description) : notFound(); }
  switch (path) {
    case '/guides': return page('Guides for parents','Short, practical guides for parents: choosing ad-free games, what makes a game kid-safe, and building a first game with your kid using AI.');
    case '/faq': return page('Parent FAQ',`Is ${BRAND} really free? Are there ads, purchases or chat? What data is collected, what ages are the games for, and do they work on iPad?`);
    case '/parents': return page('For parents',`What ${BRAND} does and doesn’t do: no ads, purchases, chat or tracking. Ages and content notes for every game, and saves that stay on your device.`);
    case '/privacy': return page('Privacy',`${BRAND} collects nothing: no accounts, ads, analytics, cookies or tracking. Game progress stays in your browser on your device.`);
    case '/about': return page('About',`${BRAND} makes free, open-source browser games for kids with AI coding tools. No ads, purchases, sign-ups or tracking. Watch the trailer.`);
    case '/list-your-game': return page('List your game',`Listing kid-safe games made by others on ${BRAND} is coming soon. See what a game needs, and get in line on GitHub.`);
    case '/favorites': return page('Favorites','Your favorite games, saved on this device. Tap the heart on any game to keep it here.',{ index: false });
    default: return notFound();
  }
}
