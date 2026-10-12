import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame, games, type Control, type Device } from '../data/games';
import { usePageMeta } from '../lib/meta';
import { mediaFor } from '../lib/media';
import { FavoriteButton } from '../components/GameCard';
import GameGrid from '../components/GameGrid';
import Lightbox from '../components/Lightbox';
import Preview, { Still } from '../components/Preview';
import { Icon, type IconName } from '../components/Icon';
import NotFound from './NotFound';

const deviceIcon: Record<Device,IconName> = { Computer: 'computer',Tablet: 'tablet',Phone: 'phone' };
const controlIcon: Record<Control,IconName> = { Keyboard: 'keyboard',Mouse: 'mouse',Gamepad: 'gamepad',Touch: 'touch' };
const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;

export default function Details() {
  const { slug } = useParams(); const game = findGame(slug);
  usePageMeta(game?.title || 'Game not found',game?.tagline || 'This game could not be found.',game ? mediaFor(game).og : undefined);
  const [shot,setShot] = useState<number | null>(null);
  if (!game) return <NotFound />;
  const media = mediaFor(game);
  const devices = game.supportedDevices.map((device,index) => index ? device.toLowerCase() : device);
  // How phones and tablets are held comes from the game itself (game.json); the site never adds its own prompt.
  const handheld = game.supportedDevices.some(device => device !== 'Computer');
  const hold = !handheld ? '' : game.orientation === 'any' ? ', any way up' : game.orientation === 'landscape' ? ', phones held sideways' : ', phones held upright';
  return <div className="container details">
    <Link className="back-link" to="/games"><Icon name="back" size={20} />All games</Link>
    <div className="details-top">
      <div className="details-media"><Preview game={game} still="poster" auto eager sizes="(min-width: 1024px) 700px, 100vw" /></div>
      <div className="details-copy">
        <h1><img src={media.logo} alt={game.title} width={440} height={140} /></h1>
        <p>{game.description}</p>
        <div className="details-actions"><Link to={`/play/${game.slug}`} className="button primary play"><Icon name="play" filled size={20} />Play</Link><FavoriteButton game={game} large /></div>
      </div>
    </div>
    <dl className="facts">
      <div className="fact"><dt><Icon name="age" />Age</dt><dd>{game.ageGuidance}</dd></div>
      <div className="fact"><dt><Icon name="clock" />Play time</dt><dd>{game.estimatedPlayTime}</dd></div>
      <div className="fact"><dt><Icon name={deviceIcon[game.supportedDevices[0]]} />Works on</dt><dd>{list(devices)}{hold}{game.requirements.length > 0 && <span className="fact-note">Needs {list(game.requirements)}</span>}</dd></div>
      <div className="fact"><dt><Icon name="gamepad" />Controls</dt><dd className="fact-icons">{game.controls.types.map(type => <span key={type} title={type} role="img" aria-label={type}><Icon name={controlIcon[type]} /></span>)}</dd></div>
    </dl>
    {media.shots.length > 0 && <section className="section" aria-labelledby="screenshots"><div className="section-head"><h2 id="screenshots" className="title">Screenshots</h2></div>
      <div className="gallery">{media.shots.map((item,index) => <button key={index} onClick={() => setShot(index)} aria-label={`View screenshot: ${item.alt}`}><Still image={item.thumb} alt="" sizes="320px" /></button>)}</div>
      <Lightbox shots={media.shots} index={shot} onIndex={setShot} onClose={() => setShot(null)} /></section>}
    <div className="section how">
      <section aria-labelledby="how-to-play"><h2 id="how-to-play" className="title">How to play</h2>
        <ol className="steps" style={{ marginTop: 20 }}>{game.quickStart.map(step => <li key={step}>{step}</li>)}</ol>
        <details className="all-controls"><summary><Icon name="chevron" size={18} />All controls</summary><ul>{game.controls.howToPlay.map(step => <li key={step}>{step}</li>)}</ul></details>
      </section>
      <section className="grownups" aria-labelledby="grownups"><h2 id="grownups" className="title">For grown-ups</h2><p style={{ marginTop: 16 }}>{game.contentNotes}</p><p className="links"><Link className="text-link" to="/parents">For parents</Link><Link className="text-link" to="/privacy">Privacy</Link></p></section>
    </div>
    <section className="section" aria-labelledby="more-games"><div className="section-head"><h2 id="more-games" className="title">More games</h2></div><GameGrid games={games.filter(item => item.slug !== game.slug)} /></section>
  </div>;
}
