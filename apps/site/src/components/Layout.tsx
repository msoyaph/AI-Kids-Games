import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { RepoBox } from './GitHub';
import { Icon } from './Icon';
import { BRAND } from '../data/site';
import { usePreferences } from '../lib/preferences';
import { REPO } from '../lib/links';
import { usePageMeta } from '../lib/meta';
/** The owner's icon (public/brand/mark-96.png, from scripts/art/icons.ts) and the name. */
export function Brand() { return <span className="brand"><img src="/brand/mark-96.png" alt="" width={36} height={36} /><span>{BRAND}</span></span>; }
const themeColor = (dark: boolean) => document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark ? '#181B21' : '#FFFFFF');
export default function Layout() {
  const [dark,setDark] = useState(() => typeof document === 'undefined' ? false : document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  const { favorites } = usePreferences();
  const location = useLocation();
  usePageMeta();
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; themeColor(dark); },[dark]);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const change = (e: MediaQueryListEvent) => setDark(e.matches); media.addEventListener('change',change); return () => media.removeEventListener('change',change); },[]);
  useEffect(() => { window.scrollTo(0,0); document.getElementById('main-content')?.focus({ preventScroll: true }); },[location.pathname]);
  const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'nav-link active' : 'nav-link';
  return <>
    <a className="skip-link" href="#main-content">Skip to games</a>
    <header className="site-header"><div className="container header-inner">
      <Link to="/" aria-label={`${BRAND} home`}><Brand /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/games" className={navClass}>Games</NavLink>
        <NavLink to="/favorites" className={navClass}>Favorites{favorites.length > 0 && <span className="nav-count" aria-label={`${favorites.length} saved`}>{favorites.length}</span>}</NavLink>
        <NavLink to="/parents" className={navClass}>For parents</NavLink>
      </nav>
      <div className="header-actions">
        <RepoBox />
        <Link className="icon-button" to="/games?focus=search" aria-label="Search games"><Icon name="search" /></Link>
        <button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} /></button>
      </div>
    </div></header>
    <main id="main-content" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer"><div className="container footer-inner">
      <p>No ads. No subscriptions. No sign-ups. No tracking.</p>
      <nav className="footer-links" aria-label="Site information"><Link to="/parents">For parents</Link><Link to="/faq">Parent FAQ</Link><Link to="/guides">Guides</Link><Link to="/privacy">Privacy</Link><Link to="/about">About</Link><Link to="/community">Community games</Link><Link to="/list-your-game">Submit a game</Link><a href={REPO}>Build your own</a></nav>
      <p>© {new Date().getFullYear()} {BRAND}</p>
    </div></footer>
    <nav className="bottom-nav" aria-label="Mobile navigation"><NavLink to="/" end><Icon name="home" />Home</NavLink><NavLink to="/games"><Icon name="grid" />Games</NavLink><NavLink to="/favorites"><Icon name="heart" />Favorites</NavLink><NavLink to="/parents"><Icon name="shield" />Parents</NavLink></nav>
  </>;
}
