import { lazy, Suspense, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ExitGuard from './components/ExitGuard';
import { PreferencesProvider } from './lib/preferences';
import './styles.css';
const Home = lazy(() => import('./pages/Home'));
const Browse = lazy(() => import('./pages/Browse'));
const Details = lazy(() => import('./pages/Details'));
const Play = lazy(() => import('./pages/Play'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Parents = lazy(() => import('./pages/Parents'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));
class FriendlyBoundary extends Component<{ children: ReactNode },{ failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="empty-state"><h1>Let’s try that again.</h1><p>A little hiccup stopped this page.</p><button className="button primary" onClick={() => location.reload()}>Reload the page</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<FriendlyBoundary><BrowserRouter><PreferencesProvider><Suspense fallback={<div className="route-loading" role="status">Getting your next adventure ready…</div>}><Routes><Route element={<Layout />}><Route index element={<Home />} /><Route path="games" element={<Browse />} /><Route path="category/:name" element={<Browse />} /><Route path="game/:slug" element={<Details />} /><Route path="favorites" element={<Favorites />} /><Route path="parents" element={<Parents />} /><Route path="about" element={<About />} /><Route path="*" element={<NotFound />} /></Route><Route path="play/:slug" element={<Play />} /></Routes></Suspense><ExitGuard /></PreferencesProvider></BrowserRouter></FriendlyBoundary>);
