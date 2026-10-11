import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { categories, games } from '../data/games';
import { filterGames } from '../lib/search';
import { usePageMeta } from '../lib/meta';
import GameCard from '../components/GameCard';
import { Icon } from '../components/Icon';
export default function Browse() {
  const { name } = useParams(); const [params,setParams] = useSearchParams();
  const selected = categories.find(category => category.toLowerCase() === name?.toLowerCase()) || params.get('category') || '';
  const query = params.get('q') || ''; const input = useRef<HTMLInputElement>(null);
  usePageMeta(name ? `${selected || 'Unknown'} games` : 'Find your next favorite','Browse original browser games. Search by name, category, or what you love to play.');
  useEffect(() => { if (params.has('focus')) input.current?.focus(); },[params]);
  const age = params.get('age');
  const playerAge = age && /^\d+$/.test(age) ? Number(age) : undefined;
  const results = filterGames(games,query,selected,playerAge).sort((a,b) => params.get('sort') === 'new' ? b.releaseDate.localeCompare(a.releaseDate) : 0);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('focus'); if (value) next.set(key,value); else next.delete(key); setParams(next,{ replace: true }); };
  return <div className="container inner-page"><div className="page-heading"><h1>{name ? `${selected || name} games` : 'Find your next favorite.'}</h1></div>
    <div className="search-field"><Icon name="search" size={24} /><label className="sr-only" htmlFor="game-search">Search games</label><input ref={input} id="game-search" type="search" placeholder="Search games, adventures, or a little bit of cozy…" value={query} onChange={e => update('q',e.target.value)} autoComplete="off" />{query && <button className="icon-button" aria-label="Clear search" onClick={() => { update('q',''); input.current?.focus(); }}><Icon name="close" /></button>}</div>
    <div className="filter-row" aria-label="Game categories">{name ? <Link to="/games" className="category-chip"><Icon name="back" size={18} />All games</Link> : <button className={`category-chip ${!selected ? 'chip-selected' : ''}`} aria-pressed={!selected} onClick={() => update('category','')}>All games</button>}{categories.map(category => name ? <Link key={category} to={`/category/${category.toLowerCase()}`} className={`category-chip ${selected === category ? 'chip-selected' : ''}`}>{category}</Link> : <button key={category} className={`category-chip ${selected === category ? 'chip-selected' : ''}`} aria-pressed={selected === category} onClick={() => update('category',category)}>{category}</button>)}</div>
    <div className="age-filter"><label htmlFor="player-age">Player age</label><select id="player-age" value={playerAge ?? ''} onChange={e => update('age',e.target.value)}><option value="">All ages</option>{Array.from({ length: 12 },(_,i) => i+3).map(age => <option key={age} value={age}>{age} years old</option>)}</select><span>Shows games with a suggested minimum age at or below this age.</span></div>
    <p className="result-count" role="status">{results.length} {results.length === 1 ? 'game' : 'games'}{query && ` for “${query}”`}</p>
    {name && !categories.some(category => category.toLowerCase() === name.toLowerCase()) ? <div className="empty-state"><Icon name="compass" size={52} /><h2>That category wandered off!</h2><Link className="button primary" to="/games">See all games</Link></div> : results.length ? <div className="game-grid">{results.map(game => <GameCard key={game.slug} game={game} eager />)}</div> : <div className="empty-state"><Icon name="search" size={52} /><h2>No games found — try another word!</h2><p>Try “island”, “monsters”, or a game name.</p><button className="button primary" onClick={() => setParams({})}>Show all games</button></div>}
  </div>;
}
