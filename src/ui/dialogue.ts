/** Dialogue box: portrait, name, typewriter text, read-aloud, and action buttons. */
import { VILLAGER } from '../data/villagers';
import { drawCharacter, type Look } from '../render/art/characters';
import { PixelCanvas } from '../render/pixelcanvas';
import { h } from './dom';
import { icon } from './icons';
import type { Modals } from './widgets';

export const DLG_CSS = `
.dlg-bg { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding: 10px 10px calc(90px * var(--ui) + 12px); pointer-events: auto; }
.dlg { width: min(96vw, 720px); display: flex; gap: 12px; padding: 12px 14px; align-items: flex-start; animation: toastIn .2s ease-out; }
.dlg .face { flex: none; width: 88px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.dlg .face canvas, .dlg .face img { width: 80px; height: 80px; image-rendering: pixelated; background: #cfe8b8; border: 3px solid var(--wood-d); border-radius: 8px; }
.dlg .who { font-weight: 800; font-size: .95em; text-align: center; }
.dlg .body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dlg .text { font-size: 1.12em; min-height: 3.4em; line-height: 1.4; cursor: pointer; }
.dlg .hearts { display: flex; gap: 1px; margin-top: 2px; flex-wrap: wrap; justify-content: center; }
.dlg .acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 8px; }
@media (max-width: 520px) { .dlg .face { width: 64px; } .dlg .face canvas, .dlg .face img { width: 60px; height: 60px; } .dlg .text { font-size: 1.02em; } }
`;

const portraits = new Map<string, string>();

/** Head-and-shoulders portrait as a data URL (cached). */
export function portrait(id: string, look?: Look): string {
  const key = id;
  const cached = portraits.get(key);
  if (cached) return cached;
  const v = VILLAGER[id];
  const lk = look ?? (v?.look as Look);
  if (!lk) return '';
  const full = drawCharacter(lk, 0, 0);
  const top = lk.kid ? 6 : 2;
  const crop = new PixelCanvas(20, 20);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) crop.set(x + 2, y, full.get(x, y + top));
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(20, 20);
  for (let i = 0; i < crop.px.length; i++) {
    const c = crop.px[i];
    if (c < 0) continue;
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL();
  portraits.set(key, url);
  return url;
}

export interface DialogueOpts {
  name: string;
  /** villager id for the portrait (or a data url) */
  face?: string;
  text: string;
  hearts?: number;
  buttons?: { label: string; cls?: string; onClick?: () => void | boolean }[];
  onClose?: () => void;
  speak?: boolean;
  pitch?: number;
  instant?: boolean;
}

let speaking = false;
export function speak(text: string, pitch = 1): void {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ', '));
    u.pitch = Math.max(0.1, Math.min(2, pitch));
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    speaking = true;
  } catch {
    /* read-aloud is optional */
  }
}
export function stopSpeaking(): void {
  try {
    if (speaking && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  speaking = false;
}

/** Show a dialogue; returns a close function. */
export function showDialogue(modals: Modals, o: DialogueOpts): () => void {
  const textEl = h('div', { class: 'text', 'aria-live': 'polite' });
  const face = h('div', { class: 'face' });
  if (o.face) {
    const url = o.face.startsWith('data:') ? o.face : portrait(o.face);
    if (url) face.appendChild(h('img', { src: url, alt: o.name }));
  }
  face.appendChild(h('div', { class: 'who' }, o.name));
  if (o.hearts !== undefined) {
    const hs = h('div', { class: 'hearts', 'aria-label': `${o.hearts} of 10 hearts` });
    for (let i = 0; i < 10; i++) hs.appendChild(icon(i < o.hearts ? 'ui.heart' : 'ui.heartEmpty', 12));
    face.appendChild(hs);
  }
  const acts = h('div', { class: 'acts' });
  let close: () => void = () => {};
  const buttons = o.buttons ?? [{ label: 'OK' }];
  for (const b of buttons) {
    const btn = h('button', { class: `btn small ${b.cls ?? ''}` }, b.label);
    btn.addEventListener('click', () => {
      finish();
      const keep = b.onClick?.();
      if (keep !== true) close();
    });
    acts.appendChild(btn);
  }
  const box = h('div', { class: 'dlg panel', role: 'dialog', 'aria-label': `${o.name} says` }, face, h('div', { class: 'body' }, textEl, acts));
  const bg = h('div', { class: 'dlg-bg' }, box);
  // typewriter
  let shown = o.instant ? o.text.length : 0;
  let timer = 0;
  const finish = () => {
    shown = o.text.length;
    textEl.textContent = o.text;
    clearInterval(timer);
  };
  if (shown < o.text.length) {
    timer = window.setInterval(() => {
      shown = Math.min(o.text.length, shown + 2);
      textEl.textContent = o.text.slice(0, shown);
      if (shown >= o.text.length) clearInterval(timer);
    }, 22);
  } else textEl.textContent = o.text;
  textEl.addEventListener('click', finish);
  if (o.speak) speak(o.text, o.pitch);
  close = modals.show(bg, {
    bare: true,
    cancel: () => {},
    onClose: () => {
      clearInterval(timer);
      stopSpeaking();
      o.onClose?.();
    },
  });
  return close;
}
