// Community games (community/<slug>/, SUBMITTING.md): built from source, reviewed by the owner and
// played from their own origin (apps/play). Kept apart from the first-party games so counts, the
// hero and category rows don't change; the website shows them on their own shelf.
import { generatedCommunity } from './community.generated';
import { findGame,games,type Game } from './games';

export const communityGames: Game[] = generatedCommunity;
export const isCommunity = (game: Game) => !!game.community;
/** A first-party or a community game. */
export const findAnyGame = (slug: string | undefined): Game | undefined => findGame(slug) ?? communityGames.find(game => game.slug === slug);
export const allGames = () => [...games,...communityGames];
