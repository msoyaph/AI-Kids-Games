import { describe,expect,it } from 'vitest';
import { games } from '../src/data/games';
import { filterGames } from '../src/lib/search';
describe('game discovery',() => {
  it('shows all games with an empty query',() => expect(filterGames(games,'  ')).toHaveLength(games.length));
  it('matches title, categories, and tags without case sensitivity',() => { expect(filterGames(games,'THEABONK')[0].slug).toBe('theabonk'); expect(filterGames(games,'CoZy')[0].slug).toBe('light-crossing'); expect(filterGames(games,'power-ups')[0].slug).toBe('theabonk'); });
  it('requires all search words and applies the selected category',() => { expect(filterGames(games,'island relax','cozy')).toHaveLength(1); expect(filterGames(games,'island','Action')).toEqual([]); });
  it('filters by minimum age while preserving search/category filters',() => { expect(filterGames(games,'','',6).map(g => g.slug)).toEqual(['light-crossing','space-sky']); expect(filterGames(games,'','',7)).toHaveLength(3); expect(filterGames(games,'','',8)).toHaveLength(4); expect(filterGames(games,'','Racing',9)).toEqual([]); expect(filterGames(games,'kart','Racing',10)[0].slug).toBe('calex-cart'); });
  it('handles punctuation and no results',() => { expect(filterGames(games,'🐢 nowhere')).toEqual([]); expect(filterGames(games,'theabonk','Adventure')).toHaveLength(1); });
});
