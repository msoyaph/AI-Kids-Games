import type { Game } from '../data/games';
export function filterGames(registry: readonly Game[], query = '', category = '', playerAge?: number) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return registry.filter(game => (playerAge === undefined || game.minAge <= playerAge) && (!category || game.categories.some(item => item.toLocaleLowerCase() === category.toLocaleLowerCase())) && terms.every(term => [game.title,game.tagline,...game.categories,...game.tags].join(' ').toLocaleLowerCase().includes(term)));
}
