import { Link } from 'react-router-dom';
import { categories, games } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { mediaFor } from '../lib/media';
import { BRAND,TAGLINE } from '../data/site';
import Hero from '../components/Hero';
import GameGrid from '../components/GameGrid';
import GameCard from '../components/GameCard';
import { AgeSelect, CategoryChips, useCatalogFilters } from '../components/Filters';

/** Category rows return automatically once the catalog is big enough to need them. */
export const CATEGORY_ROWS_FROM = 12;
/** The featured carousel opens on this game (owner's pick); the others follow in catalog order. */
export const HERO_LEAD = 'theabonk';

export default function Home() {
  const { recent } = usePreferences();
  const { category,playerAge,results,set,reset } = useCatalogFilters();
  const featured = games.filter(game => game.featured).sort((a,b) => Number(b.slug === HERO_LEAD)-Number(a.slug === HERO_LEAD));
  const played = recent.map(slug => games.find(game => game.slug === slug)).filter(game => !!game).slice(0,6);
  return <div className="container home">
    <header className="home-intro">
      {/* The heading is for screen readers and search only; the page opens on the featured games. */}
      <h1 className="sr-only">{BRAND}: {TAGLINE}</h1>
      <p>No ads. No subscriptions. No sign-ups. No tracking. Just play, or build your own.</p>
    </header>
    <Hero games={featured.length ? featured : games} />
    <section className="section" aria-labelledby="all-games">
      <div className="section-head"><h2 id="all-games" className="title">All games</h2></div>
      <div className="filters"><CategoryChips selected={category} onSelect={value => set('category',value.toLowerCase())} /><AgeSelect value={playerAge} onChange={value => set('age',value)} /></div>
      {results.length ? <GameGrid games={results} label="All games" /> : <div className="empty"><h3 className="heading">No games match yet.</h3><p>Try another category or age.</p><button className="button secondary" onClick={reset}>Show all games</button></div>}
    </section>
    {played.length > 0 && <section className="section" aria-labelledby="play-again"><div className="section-head"><h2 id="play-again" className="title">Play again</h2></div>
      <ul className="play-again">{played.map(game => <li key={game.slug}><Link className="tile" to={`/play/${game.slug}`}><img src={mediaFor(game).cover} alt="" width={85} height={48} loading="lazy" />{game.title}</Link></li>)}</ul></section>}
    {games.length >= CATEGORY_ROWS_FROM && categories.map(name => <section key={name} className="section" aria-labelledby={`row-${name}`}>
      <div className="section-head"><h2 id={`row-${name}`} className="title">{name}</h2><Link className="text-link" to={`/category/${name.toLowerCase()}`}>See all {name.toLowerCase()} games</Link></div>
      <div className="row">{games.filter(game => game.categories.includes(name)).map(game => <GameCard key={game.slug} game={game} />)}</div>
    </section>)}
  </div>;
}
