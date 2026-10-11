import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame } from '../data/games';
import sizes from '../data/build-sizes.json';
import { usePreferences } from '../lib/preferences';
import { usePageMeta } from '../lib/meta';
import { mediaFor } from '../lib/media';
import { Icon } from '../components/Icon';
import Cover from '../components/Cover';

/**
 * Stream the game's HTML from our own origin to show real progress (measured against its
 * recorded size; the stream may be compressed in transit), then let the iframe load it from
 * the browser cache. Falls back to an indeterminate bar if streaming is unavailable.
 */
function useGameDownload(slug: string,attempt: number) {
  const [progress,setProgress] = useState<number | null>(0); const [src,setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setProgress(0); setSrc(null);
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
  },[slug,attempt]);
  return { progress,src };
}

export default function Play() {
  const { slug = '' } = useParams(); const game = findGame(slug);
  usePageMeta(game ? `Play ${game.title}` : 'Game not found',game?.tagline || 'Choose another game.',game ? mediaFor(game).og : undefined);
  const { rememberGame } = usePreferences();
  const [loaded,setLoaded] = useState(false); const [slow,setSlow] = useState(false); const [attempt,setAttempt] = useState(0);
  const [full,setFull] = useState(false); const [fullscreenError,setFullscreenError] = useState('');
  const [notice,setNotice] = useState(() => window.innerWidth <= 768 || matchMedia('(pointer: coarse)').matches);
  const stage = useRef<HTMLDivElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  const { progress,src } = useGameDownload(slug,attempt);
  useEffect(() => { setLoaded(false); setSlow(false); const timer = setTimeout(() => setSlow(true),12000); return () => clearTimeout(timer); },[slug,attempt]);
  useEffect(() => { document.body.classList.add('is-playing'); const change = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange',change); return () => { document.body.classList.remove('is-playing'); document.removeEventListener('fullscreenchange',change); }; },[]);
  if (!game) return <div className="container page"><div className="empty"><h1 className="title">This game wandered off.</h1><Link className="button primary" to="/games">Find a game</Link></div></div>;
  const media = mediaFor(game);
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); setFullscreenError(''); } catch { setFullscreenError('Fullscreen isn’t available in this browser. You can still play here.'); } };
  const percent = progress === null ? null : Math.round((loaded ? 1 : progress)*100);
  return <div className="play-shell" ref={stage}>
    <header className="play-bar"><Link to={`/game/${game.slug}`}><Icon name="back" />Back</Link><h1><strong>{game.title}</strong></h1><button onClick={toggleFullscreen} aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}><Icon name={full ? 'shrink' : 'expand'} /><span className="label">{full ? 'Exit fullscreen' : 'Fullscreen'}</span></button></header>
    {fullscreenError && <p className="play-message" role="status">{fullscreenError}</p>}
    {notice && !game.controls.types.includes('Touch') && <div className="device-notice" role="note"><Icon name="computer" /><div><strong>This game works best on a computer.</strong><p>It needs a keyboard and mouse, or a gamepad. You can still try it here.</p></div><button className="button" onClick={() => { setNotice(false); frame.current?.focus(); }}>Play anyway</button></div>}
    <div className="play-stage">
      {!loaded && <div className="game-loading">
        <Cover game={game} eager />
        <img className="logo" src={media.logo} alt="" width={360} height={96} />
        <div className={`progress${percent === null ? ' indeterminate' : ''}`} role="progressbar" aria-label={`Loading ${game.title}`} aria-valuemin={0} aria-valuemax={100} {...(percent === null ? {} : { 'aria-valuenow': percent })} style={{ '--value': `${percent ?? 0}%` } as CSSProperties}><span /></div>
        <p aria-live="polite">{slow ? 'Taking a little longer… On a slow connection this can take a moment.' : percent === null ? 'Loading…' : `Loading… ${percent}%`}</p>
        {slow && <button className="button primary" onClick={() => setAttempt(old => old+1)}>Try again</button>}
      </div>}
      {src && <iframe key={`${slug}-${attempt}`} ref={frame} title={`Play ${game.title}`} src={src} sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" allowFullScreen referrerPolicy="no-referrer" onLoad={() => { setLoaded(true); rememberGame(game.slug); }} />}
    </div>
  </div>;
}
