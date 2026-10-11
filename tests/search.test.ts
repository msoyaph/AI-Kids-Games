import { describe,expect,it } from 'vitest';
import { games } from '../src/data/games';
import { filterGames } from '../src/lib/search';
describe('game discovery',() => {
  it('shows all games with an empty query',() => expect(filterGames(games,'  ')).toHaveLength(2));
  it('matches title, categories, and tags without case sensitivity',() => { expect(filterGames(games,'THEABONK')[0].slug).toBe('theabonk'); expect(filterGames(games,'CoZy')[0].slug).toBe('light-crossing'); expect(filterGames(games,'power-ups')[0].slug).toBe('theabonk'); });
  it('requires all search words and applies the selected category',() => { expect(filterGames(games,'island relax','cozy')).toHaveLength(1); expect(filterGames(games,'island','Action')).toEqual([]); });
  it('handles punctuation and no results',() => { expect(filterGames(games,'🐢 nowhere')).toEqual([]); expect(filterGames(games,'theabonk','Adventure')).toHaveLength(1); });
});
