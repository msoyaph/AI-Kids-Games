import { useEffect, useRef, useState } from 'react';
import reel from '../data/trailer.json';
import type { TrailerData } from '../data/trailers';
import { Icon } from './Icon';

/** The 60-second reel: AV1 in WebM first, then H.264; 1080p only on big screens. */
function reelSources() {
  const big = typeof screen !== 'undefined' && Math.max(screen.width,screen.height) * (window.devicePixelRatio || 1) > 1600;
  const height = big ? 1080 : 720;
  return [
    { src: `/trailer/trailer-${height}.webm`, type: 'video/webm; codecs="av01.0.08M.08, opus"' },
    { src: `/trailer/trailer-${height}.mp4`, type: 'video/mp4' }
  ];
}
const REEL: TrailerData = { ...reel,get sources() { return reelSources(); } };

/** The trailer itself: starts with the sound off and captions on; stops and unloads when it goes away. */
function TrailerVideo({ trailer,id }: { trailer: TrailerData; id: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    node.play().catch(() => {});
    return () => { node.pause(); node.querySelectorAll('source').forEach(source => source.remove()); node.load(); };
  },[]);
  return <video ref={video} className="trailer-video" controls muted playsInline preload="auto" poster={trailer.poster} aria-describedby={id}>
    {trailer.sources.map(source => <source key={source.src} src={source.src} type={source.type} />)}
    <track kind="captions" srcLang="en" label="English" src={trailer.captions} default />
  </video>;
}

/** What happens in the trailer, for anyone who can't see it. */
function Description({ trailer,id }: { trailer: TrailerData; id: string }) {
  return <details className="trailer-description"><summary>What’s in the trailer</summary><div id={id}>{trailer.description.map(line => <p key={line}>{line}</p>)}</div></details>;
}

/** A trailer in a page: a poster you press to play. Nothing but the poster loads until then. */
export function TrailerInline({ trailer = REEL,name = 'the trailer',id = 'trailer-inline-description' }: { trailer?: TrailerData; name?: string; id?: string }) {
  const [playing,setPlaying] = useState(false);
  return <figure className="trailer-inline">
    <div className="trailer-frame">
      {playing ? <TrailerVideo trailer={trailer} id={id} /> : <button type="button" className="trailer-poster" onClick={() => setPlaying(true)} aria-label={`Play ${name} (${Math.round(trailer.seconds)} seconds, sound off)`}>
        <picture><source srcSet={trailer.posterWebp} type="image/webp" /><img src={trailer.poster} alt="" width={1920} height={1080} loading="lazy" decoding="async" /></picture>
        <span className="trailer-play"><Icon name="play" filled size={34} /></span>
      </button>}
    </div>
    <figcaption><Description trailer={trailer} id={id} /></figcaption>
  </figure>;
}
