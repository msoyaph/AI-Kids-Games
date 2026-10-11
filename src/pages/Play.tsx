import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { usePageMeta } from '../lib/meta';
import { Icon } from '../components/Icon';
export default function Play() {
  const { slug } = useParams(); const game = findGame(slug);
  usePageMeta(game ? `Play ${game.title}` : 'Game not found',game?.tagline || 'Choose your next adventure.');
  const { rememberGame } = usePreferences();
  const [loaded,setLoaded] = useState(false); const [slow,setSlow] = useState(false); const [reload,setReload] = useState(0);
  const [full,setFull] = useState(false); const [fullscreenError,setFullscreenError] = useState('');
  const [notice,setNotice] = useState(() => window.innerWidth <= 768 || matchMedia('(pointer: coarse)').matches);
  const stage = useRef<HTMLDivElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { setLoaded(false); setSlow(false); const timer = setTimeout(() => setSlow(true),12000); return () => clearTimeout(timer); },[slug,reload]);
  useEffect(() => { document.body.classList.add('is-playing'); const change = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange',change); return () => { document.body.classList.remove('is-playing'); document.removeEventListener('fullscreenchange',change); }; },[]);
  if (!game) return <div className="empty-state"><h1>This adventure wandered off!</h1><Link className="button primary" to="/games">Find a game</Link></div>;
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); setFullscreenError(''); } catch { setFullscreenError('Fullscreen is not available in this browser. You can still play here.'); } };
  return <div className="play-shell" ref={stage}><header className="play-header"><Link to={`/game/${game.slug}`} className="play-back"><Icon name="back" />Back</Link><div className="play-title"><strong>{game.title}</strong><span>Have fun. Take breaks.</span></div><button className="play-fullscreen" onClick={toggleFullscreen} aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}><Icon name={full ? 'shrink' : 'expand'} /><span>{full ? 'Exit fullscreen' : 'Fullscreen'}</span></button></header>{fullscreenError && <p className="play-message" role="status">{fullscreenError}</p>}{notice && !game.controls.types.includes('Touch') && <div className="device-notice" role="note"><Icon name="computer" /><div><strong>This game works best on a computer.</strong><p>You’ll need a keyboard and mouse, or a gamepad. You can still give it a try here.</p></div><button className="button secondary" onClick={() => { setNotice(false); frame.current?.focus(); }}>Play anyway</button></div>}<div className="play-stage">{!loaded && <div className="game-loading" role="status"><img src="/favicon.svg" alt="" width="76" height="76" /><h1>{slow ? 'Taking a little longer…' : 'Getting your adventure ready…'}</h1><p>{slow ? 'Try loading the game again.' : `Next stop: ${game.title}`}</p>{slow && <button className="button primary" onClick={() => { setLoaded(false); setSlow(false); setReload(old => old+1); }}>Try again</button>}</div>}<iframe key={`${slug}-${reload}`} ref={frame} title={`Play ${game.title}`} src={`/games/${game.slug}/index.html`} sandbox="allow-scripts allow-pointer-lock allow-same-origin" allow="fullscreen; gamepad" allowFullScreen referrerPolicy="no-referrer" onLoad={() => { setLoaded(true); rememberGame(game.slug); }} /></div></div>;
}
