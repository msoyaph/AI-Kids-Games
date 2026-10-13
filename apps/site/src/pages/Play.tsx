import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { findGame } from '../data/games';
import sizes from '../data/build-sizes.json';
import { usePreferences } from '../lib/preferences';
import { mediaFor } from '../lib/media';
import { Icon } from '../components/Icon';
import { usePageMeta } from '../lib/meta';
import Cover from '../components/Cover';
import { computerOnly, touchOnlyDevice } from '../lib/devices';
import { enterFullscreen, exitFullscreen, fullscreenElement, fullscreenSupported, iPhoneSafari, lockOrientation, onFullscreenChange, standaloneDisplay, touchFirst, unlockOrientation } from '../lib/fullscreen';
import { deviceStorage, markTipSeen, tipsSeen, type TipId } from '../lib/storage';

/**
 * The one-time tip for this device, if any: "Play fullscreen?" on a phone or tablet that can, or
 * the Home Screen card on an iPhone (no fullscreen there). Never when opened from the Home Screen.
 */
function firstTip(): TipId | null {
  if (standaloneDisplay()) return null;
  const seen = tipsSeen(deviceStorage());
  if (fullscreenSupported() && touchFirst() && !seen.includes('fullscreen')) return 'fullscreen';
  if (iPhoneSafari() && !seen.includes('home-screen')) return 'home-screen';
  return null;
}

/** "I have a keyboard or controller" holds for this visit; nothing is stored. */
let keyboardConfirmed = false;

/**
 * Stream the game's HTML from our own origin to show real progress (measured against its
 * recorded size; the stream may be compressed in transit), then let the iframe load it from
 * the browser cache. Falls back to an indeterminate bar if streaming is unavailable.
 */
function useGameDownload(slug: string,attempt: number,enabled: boolean) {
  const [progress,setProgress] = useState<number | null>(0); const [src,setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setProgress(0); setSrc(null);
    if (!enabled) return;
    const url = `/games/${slug}/index.html`, total = (sizes as Record<string,number>)[slug];
    (async () => {
      try {
        const response = await fetch(url,{ cache: 'no-cache' });
        if (!response.ok || !response.body || !total) throw new Error('No stream');
        const reader = response.body.getReader(); let received = 0;
        for (;;) { const { done,value } = await reader.read(); if (done) break; received += value.byteLength; if (!cancelled) setProgress(Math.min(.98,received/total)); }
      } catch { if (!cancelled) setProgress(null); }
      if (!cancelled) setSrc(url);
    })();
    return () => { cancelled = true; };
  },[slug,attempt,enabled]);
  return { progress,src };
}

export default function Play() {
  const { slug = '' } = useParams(); const game = findGame(slug);
  const { rememberGame } = usePreferences();
  usePageMeta();
  const [loaded,setLoaded] = useState(false); const [slow,setSlow] = useState(false); const [attempt,setAttempt] = useState(0);
  const navigate = useNavigate();
  const [canFullscreen] = useState(fullscreenSupported);
  const [full,setFull] = useState(false); const [menu,setMenu] = useState(false); const [fullscreenError,setFullscreenError] = useState('');
  const [tip,setTip] = useState(firstTip);
  const locked = useRef(false);
  const [notice,setNotice] = useState(() => typeof window !== 'undefined' && (window.innerWidth <= 768 || matchMedia('(pointer: coarse)').matches));
  const stage = useRef<HTMLDivElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  // A computer-only game on a touch-only device: explain instead of loading it (driven by the manifest).
  const [confirmed,setConfirmed] = useState(keyboardConfirmed);
  const gate = !!game && computerOnly(game) && !confirmed && touchOnlyDevice();
  const { progress,src } = useGameDownload(slug,attempt,!gate);
  useEffect(() => { setLoaded(false); setSlow(false); if (gate) return; const timer = setTimeout(() => setSlow(true),12000); return () => clearTimeout(timer); },[slug,attempt,gate]);
  useEffect(() => {
    document.body.classList.add('is-playing');
    // However fullscreen ends (Esc, a swipe, the back gesture), the page just follows along.
    const off = onFullscreenChange(() => {
      const on = !!stage.current && fullscreenElement() === stage.current;
      setFull(on); setMenu(false);
      if (!on && locked.current) { locked.current = false; unlockOrientation(); }
    });
    return () => {
      document.body.classList.remove('is-playing'); off();
      if (fullscreenElement()) void exitFullscreen().catch(() => undefined);
      if (locked.current) { locked.current = false; unlockOrientation(); }
    };
  },[]);
  if (!game) return <div className="container page"><div className="empty"><h1 className="title">This game wandered off.</h1><Link className="button primary" to="/games">Find a game</Link></div></div>;
  const media = mediaFor(game);
  // Keys go back to the game after any site button (TheaBonk's Esc / pause, keyboard games).
  const focusGame = () => frame.current?.focus();
  const enter = async () => {
    try {
      if (stage.current) await enterFullscreen(stage.current);
      setFullscreenError('');
      locked.current = await lockOrientation(game.orientation);
    } catch { setFullscreenError('Fullscreen isn’t available in this browser. You can still play here.'); }
    focusGame();
  };
  const leave = async () => { setMenu(false); try { await exitFullscreen(); } catch { /* already out */ } focusGame(); };
  const answerTip = (id: TipId) => { markTipSeen(id,deviceStorage()); setTip(null); };
  const percent = progress === null ? null : Math.round((loaded ? 1 : progress)*100);
  if (gate) return <div className="play-shell">
    <header className="play-bar"><Link to={`/game/${game.slug}`}><Icon name="back" />Back</Link><h1><strong>{game.title}</strong></h1><span className="play-bar-spacer" aria-hidden="true" /></header>
    <main className="play-stage" id="main-content">
      <div className="touch-gate">
        <img className="logo" src={media.logo} alt="" width={360} height={96} />
        <div className="touch-gate-icons" aria-hidden="true"><Icon name="keyboard" size={34} /><Icon name="mouse" size={34} /><Icon name="gamepad" size={34} /></div>
        <h2>{game.title} needs a keyboard and mouse or a game controller for now.</h2>
        <p>Touch controls are coming soon!</p>
        <div className="touch-gate-actions">
          <Link className="button" to={`/game/${game.slug}`}><Icon name="back" />Back</Link>
          <button className="button primary" onClick={() => { keyboardConfirmed = true; setConfirmed(true); setNotice(false); }}>I have a keyboard or controller</button>
        </div>
      </div>
    </main>
  </div>;
  return <div className={`play-shell${full ? ' is-full' : ''}`} ref={stage}>
    <header className="play-bar"><Link to={`/game/${game.slug}`}><Icon name="back" />Back</Link><h1><strong>{game.title}</strong></h1>{canFullscreen ? <button onClick={() => void (full ? leave() : enter())} aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}><Icon name={full ? 'shrink' : 'expand'} /><span className="label">{full ? 'Exit fullscreen' : 'Fullscreen'}</span></button> : <span className="play-bar-spacer" aria-hidden="true" />}</header>
    {full && <div className="fs-rail">
      <button className="fs-corner" aria-label="Game menu" aria-expanded={menu} aria-controls="fs-menu" onClick={() => { setMenu(open => !open); if (menu) focusGame(); }}><Icon name="more" size={26} /></button>
      {menu && <div className="fs-menu" id="fs-menu" role="group" aria-label="Game menu" onKeyDown={event => { if (event.key === 'Escape') { setMenu(false); focusGame(); } }}>
        <button onClick={() => { void exitFullscreen().catch(() => undefined); navigate(`/game/${game.slug}`); }}><Icon name="back" />Back</button>
        <button onClick={() => void leave()}><Icon name="shrink" />Exit fullscreen</button>
      </div>}
    </div>}
    {fullscreenError && <p className="play-message" role="status">{fullscreenError}</p>}
    {notice && !game.controls.types.includes('Touch') && <div className="device-notice" role="note"><Icon name="computer" /><div><strong>This game works best on a computer.</strong><p>It needs a keyboard and mouse, or a gamepad. You can still try it here.</p></div><button className="button" onClick={() => { setNotice(false); frame.current?.focus(); }}>Play anyway</button></div>}
    <main className="play-stage" id="main-content">
      {!loaded && <div className="game-loading">
        <Cover game={game} eager />
        <img className="logo" src={media.logo} alt="" width={360} height={96} />
        <div className={`progress${percent === null ? ' indeterminate' : ''}`} role="progressbar" aria-label={`Loading ${game.title}`} aria-valuemin={0} aria-valuemax={100} {...(percent === null ? {} : { 'aria-valuenow': percent })} style={{ '--value': `${percent ?? 0}%` } as CSSProperties}><span /></div>
        <p aria-live="polite">{slow ? 'Taking a little longer… On a slow connection this can take a moment.' : percent === null ? 'Loading…' : `Loading… ${percent}%`}</p>
        {slow && <button className="button primary" onClick={() => setAttempt(old => old+1)}>Try again</button>}
      </div>}
      {menu && <div className="fs-scrim" onPointerDown={() => { setMenu(false); focusGame(); }} />}
      {tip === 'fullscreen' && <div className="play-tip" role="dialog" aria-labelledby="tip-title">
        <Icon name="expand" size={30} />
        <h2 id="tip-title">Play fullscreen?</h2>
        <p>The game fills the whole screen. Tap the corner button to come back.</p>
        <div className="play-tip-actions"><button className="button" onClick={() => { answerTip('fullscreen'); focusGame(); }}>Not now</button><button className="button primary" autoFocus onClick={() => { answerTip('fullscreen'); void enter(); }}>Play fullscreen</button></div>
      </div>}
      {tip === 'home-screen' && <div className="play-tip" role="dialog" aria-labelledby="tip-title">
        <Icon name="share" size={30} />
        <h2 id="tip-title">Add AI Kids Games to your Home Screen to play full screen</h2>
        <ol>
          <li>In Safari, tap <strong>Share</strong> (on newer iPhones it’s in the <strong>•••</strong> menu).</li>
          <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open <strong>AI Kids Games</strong> from your Home Screen.</li>
        </ol>
        <p>Games on the Home Screen keep their own progress: saves from Safari don’t carry over there, and saves made there stay there.</p>
        <div className="play-tip-actions"><button className="button primary" autoFocus onClick={() => { answerTip('home-screen'); focusGame(); }}>Got it</button></div>
      </div>}
      {src && <iframe key={`${slug}-${attempt}`} ref={frame} title={`Play ${game.title}`} src={src} sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" allowFullScreen referrerPolicy="no-referrer" onLoad={() => { setLoaded(true); rememberGame(game.slug); }} />}
    </main>
  </div>;
}
