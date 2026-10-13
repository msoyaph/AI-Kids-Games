// Renders a page to HTML at build time (scripts/generate-route-shells.ts), from the same
// components and routes as the app, so search engines and AI assistants read the real words
// without running JavaScript. Browser-only state (favorites, theme, reduced motion) starts at its
// default here; the app fills it in when it starts.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import ExitGuard from './components/ExitGuard';
import { PreferencesProvider } from './lib/preferences';
import { AppRoutes, type Pages } from './routes';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Details from './pages/Details';
import Play from './pages/Play';
import Favorites from './pages/Favorites';
import Parents from './pages/Parents';
import Faq from './pages/Faq';
import Guides from './pages/Guides';
import Guide from './pages/Guide';
import About from './pages/About';
import Privacy from './pages/Privacy';
import ListYourGame from './pages/ListYourGame';
import NotFound from './pages/NotFound';

const pages: Pages = { Home,Browse,Details,Play,Favorites,Parents,Faq,Guides,Guide,About,Privacy,ListYourGame,NotFound };

export function renderPage(url: string) {
  return renderToString(<StaticRouter location={url}><PreferencesProvider><AppRoutes pages={pages} /><ExitGuard /></PreferencesProvider></StaticRouter>);
}
