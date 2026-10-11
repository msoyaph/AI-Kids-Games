import { drawPip } from '../render/atlas/drawPip';
import { h } from './dom';

const pipCache = new Map<string, string>();

export function pipUrl(mood: 'happy' | 'cheeky' = 'happy', size = 144): string {
  const key = `${mood}${size}`;
  let url = pipCache.get(key);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    drawPip(c.getContext('2d')!, size, mood);
    url = c.toDataURL('image/png');
    pipCache.set(key, url);
  }
  return url;
}

/** Pip with a speech bubble. */
export function pipSays(text: string, mood: 'happy' | 'cheeky' = 'happy'): HTMLElement {
  const face = h('img.face', { src: pipUrl(mood), alt: 'Pip' });
  return h('div.pip', null, face, h('div.bubble', null, text));
}

export interface ModalHandle {
  el: HTMLElement;
  close(): void;
}

/**
 * Show a centred modal. Clicking the backdrop calls `onBackdrop` (if given).
 * Returns a handle to close it.
 */
export function showModal(root: HTMLElement, content: HTMLElement[], opts: { onBackdrop?: () => void; cls?: string; label?: string } = {}): ModalHandle {
  const box = h('div.modal.panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label ?? 'Dialog', class: opts.cls }, ...content);
  const back = h('div.modal-back', null, box);
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) opts.onBackdrop?.();
  });
  root.appendChild(back);
  // focus first button for keyboard players
  queueMicrotask(() => ((box.querySelector('button.btn.green') ?? box.querySelector('button')) as HTMLButtonElement | null)?.focus({ preventScroll: true }));
  return {
    el: box,
    close: () => back.remove(),
  };
}

export function starsHtml(n: number, max = 3, big = false): HTMLElement {
  const wrap = h('span.stars', { 'aria-label': `${n} of ${max} stars`, class: big ? 'big' : '' });
  for (let i = 0; i < max; i++) wrap.append(h('span.star', { class: i < n ? 'on' : '' }, '★'));
  return wrap;
}
