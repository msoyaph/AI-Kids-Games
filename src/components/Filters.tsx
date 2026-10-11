import { useSearchParams } from 'react-router-dom';
import { categories, games, type Category, type Game } from '../data/games';
import { filterGames } from '../lib/search';

/** Category and player-age filters kept in the URL (?category=&age=&q=), shared by Home and Search. */
export function useCatalogFilters(fixedCategory?: string) {
  const [params,setParams] = useSearchParams();
  const category = fixedCategory ?? (categories.find(item => item.toLowerCase() === params.get('category')?.toLowerCase()) || '');
  const age = params.get('age'); const playerAge = age && /^\d+$/.test(age) ? Number(age) : undefined;
  const query = params.get('q') || '';
  const set = (key: string,value: string) => { const next = new URLSearchParams(params); next.delete('focus'); if (value) next.set(key,value); else next.delete(key); setParams(next,{ replace: true,preventScrollReset: true }); };
  const results: Game[] = filterGames(games,query,category,playerAge);
  return { category,playerAge,query,results,set,reset: () => setParams({},{ replace: true }),sort: params.get('sort') };
}

export function CategoryChips({ selected,onSelect }: { selected: string; onSelect: (category: Category | '') => void }) {
  return <div className="chips" role="group" aria-label="Game categories">
    <button className="chip" aria-pressed={!selected} onClick={() => onSelect('')}>All</button>
    {categories.map(category => <button key={category} className="chip" aria-pressed={selected === category} onClick={() => onSelect(category)}>{category}</button>)}
  </div>;
}

export function AgeSelect({ value,onChange }: { value?: number; onChange: (age: string) => void }) {
  return <div className="age-select"><label htmlFor="player-age">Player age</label><select id="player-age" value={value ?? ''} onChange={event => onChange(event.target.value)} aria-describedby="age-help">
    <option value="">Any age</option>
    {Array.from({ length: 12 },(_,i) => i+3).map(age => <option key={age} value={age}>{age} years old</option>)}
  </select><span id="age-help" className="sr-only">Shows games suggested for this age and younger.</span></div>;
}
