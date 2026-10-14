import { lazy, Suspense, Component, useEffect, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ExitGuard from './components/ExitGuard';
import { PreferencesProvider } from './lib/preferences';
import { AppRoutes, pageFor, type PageName, type Pages } from './routes';
import './lib/install';
import './styles.css';

const loaders: Record<PageName,() => Promise<{ default: ComponentType }>> = {
  Home: () => import('./pages/Home'),Browse: () => import('./pages/Browse'),Details: () => import('./pages/Details'),Play: () => import('./pages/Play'),
  Favorites: () => import('./pages/Favorites'),Parents: () => import('./pages/Parents'),Faq: () => import('./pages/Faq'),Guides: () => import('./pages/Guides'),
  Guide: () => import('./pages/Guide'),Community: () => import('./pages/Community'),About: () => import('./pages/About'),Privacy: () => import('./pages/Privacy'),ListYourGame: () => import('./pages/ListYourGame'),
  NotFound: () => import('./pages/NotFound')
};
/** Pages load on demand, except one whose code is already here (the first page), which renders at once. */
const ready: Partial<Pages> = {};
const pages = {} as Pages;
for (const name of Object.keys(loaders) as PageName[]) {
  const Lazy = lazy(loaders[name]);
  pages[name] = () => { const Page = ready[name]; return Page ? <Page /> : <Lazy />; };
}

function AppReady() {
  useEffect(() => { document.documentElement.dataset.app = 'ready'; },[]);
  return null;
}

class FriendlyBoundary extends Component<{ children: ReactNode },{ failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="container page"><div className="empty"><h1 className="title">Let’s try that again.</h1><p>Something stopped this page from loading.</p><button className="button primary" onClick={() => location.reload()}>Reload the page</button></div></div> : this.props.children; }
}

// Each page's HTML was built ahead of time from these same components (entry-server.tsx), so it
// reads without JavaScript. Load this page's code first: the first render then swaps that HTML for
// the same markup in one step, with no loading screen in between.
const first = pageFor(location.pathname);
void loaders[first]().then(module => { ready[first] = module.default; },() => {}).finally(() => {
  // The prebuilt HTML is inert until this first render replaces it: <html data-app="ready"> says the
  // page now answers taps (tests wait for it before pressing anything right after loading).
  createRoot(document.getElementById('root')!).render(<FriendlyBoundary><AppReady /><BrowserRouter><PreferencesProvider><Suspense fallback={<div className="route-loading" role="status">Loading…</div>}><AppRoutes pages={pages} /></Suspense><ExitGuard /></PreferencesProvider></BrowserRouter></FriendlyBoundary>);
});
