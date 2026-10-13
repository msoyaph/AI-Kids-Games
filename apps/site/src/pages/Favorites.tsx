import { Link } from 'react-router-dom';
import { allGames } from '../data/community';
import { usePreferences } from '../lib/preferences';
import GameGrid from '../components/GameGrid';

export default function Favorites() {
  const { favorites } = usePreferences(); const saved = allGames().filter(game => favorites.includes(game.slug));
  return <div className="container page">
    <div className="page-head"><h1 className="display">Favorites</h1><p className="muted">Saved on this device only.</p></div>
    {saved.length ? <GameGrid games={saved} /> : <div className="empty"><h2 className="heading">No favorites yet.</h2><p>Tap the heart on a game to keep it here.</p><Link className="button primary" to="/games">Find a game</Link></div>}
  </div>;
}
