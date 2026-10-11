import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { usePageMeta } from '../lib/meta';
import GameCard from '../components/GameCard';
import { Icon } from '../components/Icon';
export default function Favorites() {
  const { favorites } = usePreferences(); const saved = games.filter(game => favorites.includes(game.slug));
  usePageMeta('My Favorites','Your very own little collection of favorite games, saved only on this device.');
  return <div className="container inner-page"><div className="page-heading"><h1>My Favorites</h1></div>{saved.length ? <><p className="result-count">{saved.length} {saved.length === 1 ? 'favorite' : 'favorites'}</p><div className="game-grid">{saved.map(game => <GameCard key={game.slug} game={game} eager />)}</div></> : <div className="empty-state"><span className="empty-icon"><Icon name="heart" size={48} /></span><h2>A little empty. For now.</h2><p>Tap the heart on a game to save it here.</p><Link className="button primary" to="/games">Find a favorite<Icon name="arrow" size={18} /></Link></div>}</div>;
}
