import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { games, type Control, type Device, type Game } from '../data/games';
import { communityGames, findAnyGame } from '../data/community';
import { REPO } from '../lib/links';
import { mediaFor } from '../lib/media';
import { FavoriteButton } from '../components/GameCard';
import GameGrid from '../components/GameGrid';
import Lightbox from '../components/Lightbox';
import Preview, { Still } from '../components/Preview';
import { Icon, type IconName } from '../components/Icon';
import NotFound from './NotFound';
import { computerOnly } from '../lib/devices';

const deviceIcon: Record<Device,IconName> = { Computer: 'computer',Tablet: 'tablet',Phone: 'phone' };
const controlIcon: Record<Control,IconName> = { Keyboard: 'keyboard',Mouse: 'mouse',Gamepad: 'gamepad',Touch: 'touch' };
/** From the game's manifest (game.json `safety`): what it never does. */
const SAFETY: [keyof Game['safety'],string][] = [['ads','No ads'],['purchases','No purchases'],['chat','No chat or messages'],['accounts','No accounts or sign-ups'],['network','Nothing sent anywhere']];
const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;

export default function Details() {
  const { slug } = useParams(); const game = findAnyGame(slug);
  const [shot,setShot] = useState<number | null>(null);
  if (!game) return <NotFound />;
  const media = mediaFor(game);
  const devices = game.supportedDevices.map((device,index) => index ? device.toLowerCase() : device);
  // How phones and tablets are held comes from the game itself (game.json); the site never adds its own prompt.
  const handheld = game.supportedDevices.some(device => device !== 'Computer');
  const hold = !handheld ? '' : game.orientation === 'any' ? ', any way up' : game.orientation === 'landscape' ? ', phones held sideways' : ', phones held upright';
  return <div className="container details">
    {game.community ? <Link className="back-link" to="/community"><Icon name="back" size={20} />Community games</Link> : <Link className="back-link" to="/games"><Icon name="back" size={20} />All games</Link>}
    {game.community?.preview && <p className="preview-note" role="note"><strong>Preview:</strong> this community game hasn’t been reviewed yet. It appears only on preview builds.</p>}
    <div className="details-top">
      <div className="details-media"><Preview game={game} still="poster" auto eager sizes="(min-width: 1024px) 700px, 100vw" /></div>
      <div className="details-copy">
        {game.community ? <h1 className="display community-title">{game.title}</h1> : <h1><img src={media.logo} alt={game.title} width={440} height={140} /></h1>}
        {game.community && <p className="credit"><span className="card-community">{game.community.preview ? 'Preview' : 'Community'}</span> Made by {game.community.handle}</p>}
        <p>{game.community?.longDescription ?? game.description}</p>
        <div className="details-actions"><Link to={`/play/${game.slug}`} className="button primary play"><Icon name="play" filled size={20} />Play</Link><FavoriteButton game={game} large /></div>
      </div>
    </div>
    <dl className="facts">
      <div className="fact"><dt><Icon name="age" />Age</dt><dd>{game.ageGuidance}</dd></div>
      <div className="fact"><dt><Icon name="clock" />Play time</dt><dd>{game.estimatedPlayTime}</dd></div>
      <div className="fact"><dt><Icon name={deviceIcon[game.supportedDevices[0]]} />Works on</dt><dd>{list(devices)}{hold}{computerOnly(game) && <span className="fact-note">Needs a keyboard and mouse or a game controller. Touch controls are coming soon.</span>}{game.requirements.length > 0 && <span className="fact-note">Needs {list(game.requirements)}</span>}</dd></div>
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
      <section className="grownups safety" aria-labelledby="safety"><h2 id="safety" className="title">Safety and privacy</h2>
        <dl className="safety-facts">
          <div><dt>Ages</dt><dd>{game.ageGuidance}: our suggestion, not an official rating.</dd></div>
          <div><dt>What to expect</dt><dd>{game.contentNotes}</dd></div>
          <div><dt>Never in this game</dt><dd><ul className="safety-checks">{SAFETY.filter(([flag]) => game.safety[flag] === false).map(([flag,label]) => <li key={flag}><Icon name="check" size={18} />{label}</li>)}</ul></dd></div>
          <div><dt>Saved on this device</dt><dd>Progress saves in this browser only, never sent to us, under {game.storage.keys.length === 1 ? 'one storage key' : `${game.storage.keys.length} storage keys`} starting with <code>{game.storage.prefix}</code>{game.community ? <>, for the game’s own address (<code>{new URL(game.community.playUrl).host}</code>). This community game runs from that separate address, so it can’t reach this site or other games. To erase its saves, clear site data in your browser settings.</> : <>. To erase it, clear this site’s data in your browser settings.</>}</dd></div>
        </dl>
        <p className="links"><Link className="text-link" to="/faq">Parent FAQ</Link><Link className="text-link" to="/parents">For parents</Link><Link className="text-link" to="/privacy">Privacy</Link>{game.community && <a className="text-link" href={`${REPO}/issues/new?template=community-game-report.yml&game=${game.slug}&title=${encodeURIComponent(`Problem with ${game.title}`)}`}>Report a problem with this game</a>}</p>
      </section>
    </div>
    <section className="section" aria-labelledby="more-games"><div className="section-head"><h2 id="more-games" className="title">More games</h2></div><GameGrid games={(game.community ? communityGames : games).filter(item => item.slug !== game.slug).concat(game.community ? games.slice(0,3) : [])} /></section>
  </div>;
}
