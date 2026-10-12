/** DOM item/UI icons via one generated sprite-sheet data URL. */
import { makeIconSheet, type Atlas } from '../render/atlas';

let sheet: { url: string; index: Map<string, number>; cols: number; rows: number } | null = null;

export function initIcons(atlas: Atlas): void {
  sheet = makeIconSheet(atlas.raw);
  const style = document.createElement('style');
  style.textContent = `.ico{background-image:url(${sheet.url})}`;
  document.head.appendChild(style);
}

function pos(name: string): { x: number; y: number } {
  const i = sheet?.index.get(name) ?? sheet?.index.get('ui.hand') ?? 0;
  const cols = sheet?.cols ?? 1;
  return { x: i % cols, y: Math.floor(i / cols) };
}

/** Inline style for an icon at `size` CSS px (multiple of 16 looks crispest). */
export function iconStyle(name: string, size = 32): string {
  if (!sheet) return `width:${size}px;height:${size}px`;
  const s = size / 16;
  const p = pos(name);
  return `width:${size}px;height:${size}px;background-size:${sheet.cols * 16 * s}px ${sheet.rows * 16 * s}px;background-position:${-p.x * 16 * s}px ${-p.y * 16 * s}px`;
}

export function icon(name: string, size = 32, title?: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = 'ico';
  el.setAttribute('style', iconStyle(name, size));
  if (title) {
    el.title = title;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', title);
  } else el.setAttribute('aria-hidden', 'true');
  return el;
}

export function setIcon(el: HTMLElement, name: string, size = 32): void {
  el.setAttribute('style', iconStyle(name, size));
}

export function hasIcon(name: string): boolean {
  return sheet?.index.has(name) ?? false;
}
