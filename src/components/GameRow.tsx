import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Game } from '../data/games';
import { Icon, type IconName } from './Icon';
import GameCard from './GameCard';
export default function GameRow({ title, description, games, icon = 'spark', href, eager = false }: { title: string; description?: string; games: Game[]; icon?: IconName; href?: string; eager?: boolean }) {
  const row = useRef<HTMLDivElement>(null);
  if (!games.length) return null;
  const scroll = (direction: number) => row.current?.scrollBy({ left: direction * 360, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  return <section className="game-section" aria-label={title}><div className="section-heading"><div><h2><span className={`heading-icon icon-${icon}`}><Icon name={icon} /></span>{title}</h2>{description && <p>{description}</p>}</div><div className="row-actions">{href && <Link className="text-link" to={href}>View all <Icon name="arrow" size={18} /></Link>}{games.length > 2 && <><button className="icon-button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><Icon name="back" /></button><button className="icon-button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><Icon name="arrow" /></button></>}</div></div><div className="game-row" ref={row}>{games.map(game => <GameCard key={game.slug} game={game} eager={eager} />)}</div></section>;
}
