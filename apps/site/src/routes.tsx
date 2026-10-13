// The site's routes, shared by the app (main.tsx, pages load on demand) and the build
// (entry-server.tsx renders every page to static HTML, so its words are there without JavaScript).
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

export type PageName = 'Home' | 'Browse' | 'Details' | 'Play' | 'Favorites' | 'Parents' | 'Faq' | 'Guides' | 'Guide' | 'About' | 'Privacy' | 'ListYourGame' | 'NotFound';
export type Pages = Record<PageName,ComponentType>;

/** Inside the site layout, in matching order; Play has the whole screen. */
export const ROUTES: { path?: string; index?: true; page: PageName }[] = [
  { index: true,page: 'Home' },{ path: 'games',page: 'Browse' },{ path: 'category/:name',page: 'Browse' },{ path: 'game/:slug',page: 'Details' },
  { path: 'favorites',page: 'Favorites' },{ path: 'parents',page: 'Parents' },{ path: 'faq',page: 'Faq' },{ path: 'guides',page: 'Guides' },{ path: 'guides/:slug',page: 'Guide' },
  { path: 'about',page: 'About' },{ path: 'privacy',page: 'Privacy' },{ path: 'list-your-game',page: 'ListYourGame' },{ path: '*',page: 'NotFound' }
];

export function AppRoutes({ pages }: { pages: Pages }) {
  return <Routes>
    <Route element={<Layout />}>{ROUTES.map(({ path,index,page }) => { const Page = pages[page]; return index ? <Route key={page} index element={<Page />} /> : <Route key={path} path={path} element={<Page />} />; })}</Route>
    <Route path="play/:slug" element={<pages.Play />} />
  </Routes>;
}

/** Which page a path shows (the app loads it before its first render). */
export function pageFor(pathname: string): PageName {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'play' && parts.length === 2) return 'Play';
  if (!parts.length) return 'Home';
  for (const route of ROUTES) {
    if (!route.path || route.path === '*') continue;
    const pattern = route.path.split('/');
    if (pattern.length === parts.length && pattern.every((segment,index) => segment.startsWith(':') || segment === parts[index])) return route.page;
  }
  return 'NotFound';
}
