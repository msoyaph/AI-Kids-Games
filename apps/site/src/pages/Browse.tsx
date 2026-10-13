import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categories } from '../data/games';
import { Icon } from '../components/Icon';
import GameGrid from '../components/GameGrid';
import { AgeSelect, CategoryChips, useCatalogFilters } from '../components/Filters';

export default function Browse() {
  const { name } = useParams();
  const fixed = name ? categories.find(category => category.toLowerCase() === name.toLowerCase()) ?? '?' : undefined;
  const { category,playerAge,query,results,set,reset,sort } = useCatalogFilters(fixed === '?' ? undefined : fixed);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (new URLSearchParams(location.search).has('focus')) input.current?.focus(); },[]);
  const shown = sort === 'new' ? [...results].sort((a,b) => b.releaseDate.localeCompare(a.releaseDate)) : results;
  if (fixed === '?') return <div className="container page"><div className="empty"><h1 className="title">That category wandered off.</h1><Link className="button primary" to="/games">See all games</Link></div></div>;
  return <div className="container page">
    <div className="page-head"><h1 className="display">{fixed ? `${fixed} games` : 'Find a game'}</h1></div>
    <div className="search"><Icon name="search" /><label className="sr-only" htmlFor="game-search">Search games</label><input ref={input} id="game-search" type="search" placeholder="Try “island”, “space” or “racing”" value={query} onChange={event => set('q',event.target.value)} autoComplete="off" />{query && <button className="icon-button" aria-label="Clear search" onClick={() => { set('q',''); input.current?.focus(); }}><Icon name="close" /></button>}</div>
    <div className="filters">{fixed ? <Link className="chip" to="/games">All games</Link> : <CategoryChips selected={category} onSelect={value => set('category',value.toLowerCase())} />}<AgeSelect value={playerAge} onChange={value => set('age',value)} /></div>
    <p className="result-count" role="status">{shown.length} {shown.length === 1 ? 'game' : 'games'}{query && ` for “${query}”`}</p>
    {shown.length ? <GameGrid games={shown} /> : <div className="empty"><h2 className="heading">No games found. Try another word.</h2><p>Try “island”, “monsters” or a game’s name.</p><button className="button primary" onClick={reset}>Show all games</button></div>}
  </div>;
}
