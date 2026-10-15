import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { mediaFor } from '../lib/media';

/** Compact tiles for every game: a quick way back into play from quiet pages. */
export default function GameStrip({ label }: { label: string }) {
  return <nav aria-label={label}><ul className="play-again">{games.map(game => <li key={game.slug}><Link className="tile" to={`/game/${game.slug}`}><img src={mediaFor(game).thumb} alt="" width={85} height={48} loading="lazy" />{game.title}</Link></li>)}</ul></nav>;
}
