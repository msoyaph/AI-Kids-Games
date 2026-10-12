import { describe,expect,it } from 'vitest';
import { games } from '../src/data/games';
import { filterGames } from '../src/lib/search';
describe('game discovery',() => {
  it('shows all games with an empty query',() => expect(filterGames(games,'  ')).toHaveLength(games.length));
  it('matches title, categories, tags and keywords without case sensitivity',() => { expect(filterGames(games,'THEABONK')[0].slug).toBe('theabonk'); expect(filterGames(games,'CoZy').map(g => g.slug).sort()).toEqual(['cliff-valley','light-crossing']); expect(filterGames(games,'power-ups')[0].slug).toBe('theabonk'); expect(filterGames(games,'tower defense').map(g => g.slug)).toEqual(['vanex-defense']); });
  it('requires all search words and applies the selected category',() => { expect(filterGames(games,'island fishing','cozy').map(g => g.slug)).toEqual(['light-crossing']); expect(filterGames(games,'island','Action')).toEqual([]); expect(filterGames(games,'','Farming').map(g => g.slug)).toEqual(['cliff-valley']); });
  it('filters by minimum age while preserving search/category filters',() => { expect(filterGames(games,'','',6).map(g => g.slug)).toEqual(['light-crossing','space-sky']); expect(filterGames(games,'','',7)).toHaveLength(2); expect(filterGames(games,'','',8)).toHaveLength(4); expect(filterGames(games,'','',10)).toHaveLength(6); expect(filterGames(games,'','Racing',9)).toEqual([]); expect(filterGames(games,'kart','Racing',10)[0].slug).toBe('calex-cart'); });
  it('handles punctuation and no results',() => { expect(filterGames(games,'🐢 nowhere')).toEqual([]); expect(filterGames(games,'theabonk','Adventure')).toHaveLength(1); });
});
