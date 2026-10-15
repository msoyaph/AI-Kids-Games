import { useEffect, useRef, useState } from 'react';
import type { Game } from '../data/games';
import { mediaFor } from '../lib/media';

let observer: IntersectionObserver | null = null;
const watchers = new Map<Element,(visible: boolean) => void>();
function watch(element: Element,callback: (visible: boolean) => void) {
  observer ??= new IntersectionObserver(records => { for (const record of records) watchers.get(record.target)?.(record.isIntersecting); });
  watchers.set(element,callback); observer.observe(element);
  return () => { watchers.delete(element); observer?.unobserve(element); };
}

/** The game's cover: real gameplay (its poster) once captured, else the drawn art with its slow idle layers, animated only while on screen (CSS stops it under reduced motion). */
export default function Cover({ game,eager = false,animate = true,className = '' }: { game: Pick<Game,'slug' | 'coverLayers' | 'community'>; eager?: boolean; animate?: boolean; className?: string }) {
  const media = mediaFor(game); const root = useRef<HTMLDivElement>(null); const [visible,setVisible] = useState(false);
  useEffect(() => animate && root.current ? watch(root.current,setVisible) : undefined,[animate]);
  const loading = eager ? 'eager' : 'lazy';
  return <div ref={root} className={`cover ${className}`} data-animate={animate && visible} aria-hidden="true">
    <picture>
      <source type="image/avif" srcSet={media.coverImage.avif} />
      <source type="image/webp" srcSet={media.coverImage.webp} />
      <img src={media.coverImage.jpg} alt="" width={1600} height={900} loading={loading} decoding="async" />
    </picture>
    {media.layers.map(layer => <img key={layer.motion} className={`layer-${layer.motion}`} src={layer.src} alt="" width={1600} height={900} loading={loading} decoding="async" />)}
  </div>;
}
