import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Game } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { computerOnly } from '../lib/devices';
import { Icon } from './Icon';
import Preview from './Preview';

/** Heart on a card, or a labelled Save button on the details page. */
export function FavoriteButton({ game,large = false }: { game: Game; large?: boolean }) {
  const { favorites,toggleFavorite } = usePreferences(); const saved = favorites.includes(game.slug);
  const label = `${saved ? 'Remove' : 'Add'} ${game.title} ${saved ? 'from' : 'to'} favorites`;
  // The accessible name starts with the visible text (WCAG 2.5.3 label in name).
  if (large) return <button className="button secondary save-button" onClick={() => toggleFavorite(game.slug)} aria-pressed={saved} aria-label={saved ? `Saved: remove ${game.title} from favorites` : `Save ${game.title} to favorites`}><Icon name="heart" filled={saved} />{saved ? 'Saved' : 'Save'}</button>;
  return <button className="heart" onClick={() => toggleFavorite(game.slug)} aria-pressed={saved} aria-label={label}><span><Icon name="heart" filled={saved} size={20} /></span></button>;
}

export interface Span { lg: number; md: number; solo: boolean }

export default function GameCard({ game,eager = false,span }: { game: Game; eager?: boolean; span?: Span }) {
  const [active,setActive] = useState(false);
  const style = span ? { '--span-lg': span.lg,'--span-md': span.md } as CSSProperties : undefined;
  return <article className={`card${span?.solo ? ' solo' : ''}`} style={style}>
    <Link to={`/game/${game.slug}`} className="card-link game-card-link" onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(true); }} onPointerLeave={() => setActive(false)} onFocus={() => setActive(true)} onBlur={() => setActive(false)}>
      <div className="card-media">
        <Preview game={game} still="cover" active={active} eager={eager} />
        <span className="card-badge">{game.ageGuidance}</span>
      </div>
      <div className="card-text"><h3 className="card-title">{game.title}</h3><p className="card-meta">{game.status === 'Coming soon' ? 'Coming soon' : game.categories[0]}{computerOnly(game) && <span className="card-device"><Icon name="computer" size={16} />Computer game</span>}</p></div>
    </Link>
    <FavoriteButton game={game} />
  </article>;
}
