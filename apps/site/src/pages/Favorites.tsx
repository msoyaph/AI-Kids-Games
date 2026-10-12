import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { usePageMeta } from '../lib/meta';
import GameGrid from '../components/GameGrid';

export default function Favorites() {
  const { favorites } = usePreferences(); const saved = games.filter(game => favorites.includes(game.slug));
  usePageMeta('Favorites','Your favorite games, saved on this device.');
  return <div className="container page">
    <div className="page-head"><h1 className="display">Favorites</h1><p className="muted">Saved on this device only.</p></div>
    {saved.length ? <GameGrid games={saved} /> : <div className="empty"><h2 className="heading">No favorites yet.</h2><p>Tap the heart on a game to keep it here.</p><Link className="button primary" to="/games">Find a game</Link></div>}
  </div>;
}
