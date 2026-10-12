import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Game } from '../data/games';
import { mediaFor } from '../lib/media';
import { Icon } from './Icon';
import Preview from './Preview';

const REDUCED = '(prefers-reduced-motion: reduce)';
function useReducedMotion() {
  const [reduced,setReduced] = useState(() => matchMedia(REDUCED).matches);
  useEffect(() => { const media = matchMedia(REDUCED); const change = (event: MediaQueryListEvent) => setReduced(event.matches); media.addEventListener('change',change); return () => media.removeEventListener('change',change); },[]);
  return reduced;
}

/** Featured games: gameplay loop beside (or above) logo, one line, age and Play. Rotates after each loop. */
export default function Hero({ games }: { games: Game[] }) {
  const [index,setIndex] = useState(0); const [paused,setPaused] = useState(false); const [holding,setHolding] = useState(false);
  const reduced = useReducedMotion();
  const game = games[index % games.length]; const media = mediaFor(game);
  useEffect(() => {
    if (paused || holding || reduced || games.length < 2) return;
    const timer = window.setTimeout(() => { if (!document.hidden) setIndex(old => (old+1) % games.length); },Math.round((media.preview?.seconds ?? 8)*1000));
    return () => clearTimeout(timer);
  },[index,paused,holding,reduced,games.length,media.preview?.seconds]);
  return <section className="hero" aria-roledescription="carousel" aria-label="Featured games" onMouseEnter={() => setHolding(true)} onMouseLeave={() => setHolding(false)} onFocus={() => setHolding(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setHolding(false); }}>
    <div className="hero-media"><Preview key={game.slug} game={game} still="poster" auto eager={index === 0} sizes="(min-width: 1024px) 700px, 100vw" /></div>
    <div className="hero-copy" aria-live={paused || reduced ? 'polite' : 'off'}>
      <h2 className="hero-logo"><img src={media.logo} alt={game.title} width={440} height={130} /></h2>
      <p className="hero-line">{game.tagline}</p>
      <span className="badge">{game.ageGuidance}</span>
      <Link to={`/play/${game.slug}`} className="button primary play"><Icon name="play" filled size={20} />Play</Link>
      <div className="hero-controls">
        <div className="slide-picks" role="group" aria-label="Choose a featured game">{games.map((item,i) => <button key={item.slug} className="slide-pick" aria-label={`Show ${item.title}`} aria-current={i === index} onClick={() => setIndex(i)}><img src={mediaFor(item).cover} alt="" width={64} height={36} loading="lazy" /></button>)}</div>
        {!reduced && games.length > 1 && <button className="icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play featured games' : 'Pause featured games'}><Icon name={paused ? 'play' : 'pause'} filled={paused} /></button>}
      </div>
    </div>
  </section>;
}
