import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { usePreferences } from '../lib/preferences';
export function Logo() { return <span className="logo"><img src="/favicon.svg" alt="" width="48" height="48" /><span>Ai Kids <span className="logo-games">Games</span></span></span>; }
export default function Layout() {
  const [dark,setDark] = useState(() => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  const { favorites } = usePreferences();
  const location = useLocation();
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; },[dark]);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const change = (e: MediaQueryListEvent) => setDark(e.matches); media.addEventListener('change',change); return () => media.removeEventListener('change',change); },[]);
  useEffect(() => { window.scrollTo(0,0); document.getElementById('main-content')?.focus({ preventScroll: true }); },[location.pathname]);
  const linkClass = ({ isActive }: { isActive: boolean }) => isActive ? 'nav-link active' : 'nav-link';
  return <>
    <a className="skip-link" href="#main-content">Skip to games</a>
    <header className="site-header"><div className="header-inner">
      <Link to="/" className="brand-link" aria-label="Ai Kids Games home"><Logo /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/games" className={linkClass}><Icon name="grid" size={18} />Games</NavLink>
        <NavLink to="/favorites" className={linkClass}><Icon name="heart" size={18} />My Favorites{favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</NavLink>
        <NavLink to="/parents" className={linkClass}><Icon name="shield" size={18} />For Parents</NavLink>
      </nav>
      <div className="header-actions"><Link className="icon-button" to="/games?focus=search" aria-label="Search games"><Icon name="search" /></Link><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} /></button></div>
    </div></header>
    <main id="main-content" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer"><div className="footer-inner"><div><Link to="/" aria-label="Ai Kids Games home"><Logo /></Link><p>Made for a little more play.</p></div><div className="footer-links"><Link to="/parents">For Parents</Link><Link to="/about">About</Link></div><p className="copyright">© {new Date().getFullYear()} Ai Kids Games<br /><span>No ads. No chat. Just play.</span></p></div></footer>
    <nav className="bottom-nav" aria-label="Mobile navigation"><NavLink to="/" end><Icon name="home" />Home</NavLink><NavLink to="/games"><Icon name="grid" />Games</NavLink><NavLink to="/favorites"><Icon name="heart" />Favorites</NavLink><NavLink to="/parents"><Icon name="shield" />Parents</NavLink></nav>
  </>;
}
