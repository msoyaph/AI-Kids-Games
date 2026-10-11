import { useEffect, useRef } from 'react';
import type { GameMedia } from '../lib/media';
import { Icon } from './Icon';
import { Still } from './Preview';

/** Simple screenshot viewer on the native <dialog>: arrows, Previous/Next, Escape; focus returns to the opener. */
export default function Lightbox({ shots,index,onIndex,onClose }: { shots: GameMedia['shots']; index: number | null; onIndex: (index: number) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; if (!node) return; if (index !== null && !node.open) node.showModal(); if (index === null && node.open) node.close(); },[index]);
  const step = (delta: number) => { if (index !== null) onIndex((index+delta+shots.length) % shots.length); };
  const shot = index !== null ? shots[index] : null;
  return <dialog ref={dialog} className="lightbox" aria-label="Screenshot" onClose={onClose} onKeyDown={event => { if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1); }} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
    {shot && <figure><Still image={shot.full} alt={shot.alt} eager sizes="min(1280px, 100vw)" /><figcaption>
      <p>{shot.alt}<span className="sr-only">, screenshot {index!+1} of {shots.length}</span></p>
      <button className="icon-button" onClick={() => step(-1)} aria-label="Previous screenshot"><Icon name="back" /></button>
      <button className="icon-button" onClick={() => step(1)} aria-label="Next screenshot"><Icon name="next" /></button>
      <button className="icon-button" onClick={() => dialog.current?.close()} aria-label="Close" autoFocus><Icon name="close" /></button>
    </figcaption></figure>}
  </dialog>;
}
