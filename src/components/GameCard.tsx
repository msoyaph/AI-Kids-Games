import { Link } from 'react-router-dom';
import type { Game } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { Icon } from './Icon';
import styles from './GameCard.module.css';
export function FavoriteButton({ game, large = false }: { game: Game; large?: boolean }) {
  const { favorites,toggleFavorite } = usePreferences(); const saved = favorites.includes(game.slug);
  return <button className={`favorite-button ${saved ? 'saved' : ''} ${large ? 'favorite-large' : ''}`} onClick={() => toggleFavorite(game.slug)} aria-label={`${saved ? 'Remove' : 'Add'} ${game.title} ${saved ? 'from' : 'to'} favorites`} aria-pressed={saved}><Icon name="heart" filled={saved} />{large && <span>{saved ? 'Saved to favorites' : 'Add to favorites'}</span>}</button>;
}
export default function GameCard({ game, eager = false }: { game: Game; eager?: boolean }) {
  return <article className={`game-card ${styles.card}`}>
    <Link to={`/game/${game.slug}`} className="game-card-link">
      <div className="game-card-art" style={{ backgroundColor: game.accentColor }}><img src={game.thumbnail} alt={`Original illustration for ${game.title}`} width="720" height="720" loading={eager ? 'eager' : 'lazy'} decoding="async" /><span className="age-badge">{game.ageGuidance}</span><span className="card-play"><Icon name="play" filled /></span></div>
      <div className="card-copy"><div className="card-title-row"><h3>{game.title}</h3><Icon name="arrow" size={20} /></div><p>{game.tagline}</p><div className="card-meta"><span className={`category-label ${game.categories[0].toLowerCase()}`}>{game.categories[0]}</span><span><span className={`status-dot ${game.status === 'Ready to play' ? '' : 'preview'}`} />{game.status}</span></div></div>
    </Link>
    <FavoriteButton game={game} />
  </article>;
}
