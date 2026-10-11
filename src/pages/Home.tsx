import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, games } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { usePageMeta } from '../lib/meta';
import GameRow from '../components/GameRow';
import { Icon, type IconName } from '../components/Icon';
const categoryIcons: Record<string,IconName> = { Cozy: 'leaf', Action: 'bolt', Adventure: 'compass', Strategy: 'shield', Racing: 'gamepad', Learning: 'spark' };
export default function Home() {
  usePageMeta('Little games. Big adventures.','Discover five original games for little adventurers. No ads, no chat, just play.');
  const { favorites,recent } = usePreferences();
  const featured = games.filter(game => game.featured);
  const [slide,setSlide] = useState(0); const [paused,setPaused] = useState(false); const [hover,setHover] = useState(false);
  const [reduced,setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const listener = (e: MediaQueryListEvent) => setReduced(e.matches); media.addEventListener('change',listener); return () => media.removeEventListener('change',listener); },[]);
  useEffect(() => { if (paused || hover || reduced || featured.length < 2) return; const timer = window.setInterval(() => { if (!document.hidden) setSlide(old => (old+1)%featured.length); },8500); return () => clearInterval(timer); },[paused,hover,reduced,featured.length]);
  const game = featured[slide % featured.length] || games[0];
  const orderedRecent = recent.map(slug => games.find(game => game.slug === slug)).filter(game => !!game);
  return <div className="container home-page">
    <section className={`hero ${game.slug === 'theabonk' ? 'hero-bonk' : ''}`} aria-label="Featured games" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}>
      <div className="hero-copy"><h1>Little games.<br />Big adventures.</h1><p className="hero-intro">A whole lot of wonder, a little bit of magic,<br className="desktop-break" /> and a new favorite waiting for you.</p><div className="hero-feature"><span className="hero-game-label"><Icon name={categoryIcons[game.categories[0]]} size={18} />{game.title}<span className="hero-feature-age">{game.ageGuidance}</span></span><p>{game.tagline}</p></div><div className="hero-buttons"><Link to={`/play/${game.slug}`} className="button primary"><Icon name="play" filled size={18} />Let’s play</Link><Link to={`/game/${game.slug}`} className="hero-details">Meet the game<Icon name="arrow" size={18} /></Link></div><div className="hero-slide-controls"><div className="slide-dots">{featured.map((item,index) => <button key={item.slug} aria-label={`Show ${item.title}`} aria-pressed={index === slide} className={index === slide ? 'selected' : ''} onClick={() => setSlide(index)} />)}</div><span>{String(slide+1).padStart(2,'0')} / {String(featured.length).padStart(2,'0')}</span>{!reduced && <button className="rotation-button" aria-label={paused ? 'Resume featured games' : 'Pause featured games'} onClick={() => setPaused(!paused)}>{paused ? '▶' : 'Ⅱ'}</button>}</div></div>
      <div className="hero-art"><img key={game.slug} src={game.banner} alt={`Original illustration for ${game.title}`} width="1280" height="720" fetchPriority="high" /><span className="hero-sticker"><Icon name={categoryIcons[game.categories[0]]} size={20} />{game.title}</span><span className="illustration-note">Original game illustration</span></div>
    </section>
    <div className="browse-categories"><span>What feels fun?</span><Link to="/games" className="category-chip chip-all"><Icon name="grid" size={18} />All games</Link>{categories.map(category => <Link key={category} to={`/category/${category.toLowerCase()}`} className={`category-chip chip-${category.toLowerCase()}`}><Icon name={categoryIcons[category]} size={18} />{category}</Link>)}</div>
    <GameRow title="Featured" games={featured} href="/games" eager />
    <aside className="safety-strip"><span className="safety-icon"><Icon name="shield" size={26} /></span><div><strong>More play. Less worry.</strong><p>No ads, no chat, and no sign-ups. Just a place to have fun.</p></div><Link to="/parents" className="text-link">A note for grown-ups<Icon name="arrow" size={18} /></Link></aside>
    <GameRow title="Recently Played" games={orderedRecent} icon="clock" />
    <GameRow title="My Favorites" description="Your very own little collection." games={games.filter(game => favorites.includes(game.slug))} icon="heart" href="/favorites" />
    <GameRow title="New Games" games={[...games].sort((a,b) => b.releaseDate.localeCompare(a.releaseDate))} icon="spark" href="/games?sort=new" />
    {categories.map(category => <GameRow key={category} title={category} games={games.filter(game => game.categories.includes(category))} icon={categoryIcons[category]} href={`/category/${category.toLowerCase()}`} />)}
    <aside className="end-note"><img src="/favicon.svg" alt="" width="68" height="68" /><div><h2>Small collection. Big heart.</h2><p>Five original games. Find a little adventure that feels like you.</p></div><Link to="/games" className="button secondary">Explore all games<Icon name="arrow" size={18} /></Link></aside>
  </div>;
}
