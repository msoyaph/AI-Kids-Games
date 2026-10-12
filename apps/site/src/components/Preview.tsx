import { useEffect, useRef, useState } from 'react';
import type { Game } from '../data/games';
import { mediaFor } from '../lib/media';
import { previews, type PreviewEntry } from '../lib/previews';
import Cover from './Cover';

/** A responsive still (AVIF/WebP/JPG). */
export function Still({ image,alt = '',eager = false,sizes = '100vw' }: { image: { avif: string; webp: string; jpg: string }; alt?: string; eager?: boolean; sizes?: string }) {
  return <picture>
    <source type="image/avif" srcSet={image.avif} sizes={sizes} />
    <source type="image/webp" srcSet={image.webp} sizes={sizes} />
    <img src={image.jpg} alt={alt} width={1280} height={720} loading={eager ? 'eager' : 'lazy'} decoding="async" {...(eager ? { fetchPriority: 'high' as const } : {})} />
  </picture>;
}

/**
 * Gameplay preview: the still stays underneath; the muted loop fades in only while the
 * preview controller lets it play (see src/lib/previews.ts).
 */
export default function Preview({ game,still,auto = false,active = false,eager = false,sizes }: { game: Game; still: 'poster' | 'cover'; auto?: boolean; active?: boolean; eager?: boolean; sizes?: string }) {
  const media = mediaFor(game); const preview = media.preview;
  const root = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null), entry = useRef<PreviewEntry | null>(null);
  const [playing,setPlaying] = useState(false);
  const webm = preview?.webm, mp4 = preview?.mp4;
  useEffect(() => {
    if (!webm || !mp4 || !root.current || !video.current) return;
    video.current.muted = true;
    const registered: PreviewEntry = { root: root.current,video: video.current,sources: { webm,mp4 },auto,onPlaying: setPlaying,ratio: 0,activeAt: 0,loaded: false,failed: false };
    entry.current = registered;
    const unregister = previews.register(registered);
    return () => { entry.current = null; unregister(); };
  },[webm,mp4,auto]);
  useEffect(() => { if (entry.current) previews.setActive(entry.current,active); },[active]);
  return <div ref={root} className={`preview${playing ? ' is-playing' : ''}`}>
    {still === 'poster' && preview ? <Still image={preview.poster} eager={eager} sizes={sizes} /> : <Cover game={game} eager={eager} />}
    {preview && <video ref={video} muted loop playsInline preload="none" disablePictureInPicture aria-hidden="true" tabIndex={-1} data-game={game.slug} />}
  </div>;
}
