import type { Game } from '../data/games';
export function filterGames(registry: readonly Game[], query = '', category = '', playerAge?: number) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return registry.filter(game => (playerAge === undefined || game.minAge <= playerAge) && (!category || game.categories.some(item => item.toLocaleLowerCase() === category.toLocaleLowerCase())) && terms.every(term => [game.title,game.tagline,...game.categories,...game.tags,...game.keywords].join(' ').toLocaleLowerCase().includes(term)));
}

/**
 * The home page's "All games" order (owner, 2026-10-14: "Put our new games on first lines"): games
 * released after the first launch day come first, newest first (on the same day, the one added to
 * the catalog last); the launch games follow in their curated catalog order. `registry` is the
 * catalog, which gives that order.
 */
export function newestFirst(list: readonly Game[], registry: readonly Game[] = list) {
  const launch = registry.reduce((day,game) => (game.releaseDate < day ? game.releaseDate : day),registry[0]?.releaseDate ?? '');
  const position = (game: Game) => registry.findIndex(entry => entry.slug === game.slug);
  return [...list].sort((a,b) => {
    const newA = a.releaseDate > launch, newB = b.releaseDate > launch;
    if (newA !== newB) return newA ? -1 : 1;
    if (!newA) return position(a)-position(b);
    return b.releaseDate.localeCompare(a.releaseDate) || position(b)-position(a);
  });
}
