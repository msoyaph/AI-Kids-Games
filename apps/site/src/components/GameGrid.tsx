import type { Game } from '../data/games';
import { gridSpans } from '../lib/grid';
import GameCard from './GameCard';

/** Balanced grid: full rows for any count, wider rows first (see src/lib/grid.ts). */
export default function GameGrid({ games,eager = 0,label }: { games: Game[]; eager?: number; label?: string }) {
  const spans = gridSpans(games.length);
  return <div className="game-grid" aria-label={label}>{games.map((game,index) => <GameCard key={game.slug} game={game} span={spans[index]} eager={index < eager} />)}</div>;
}
