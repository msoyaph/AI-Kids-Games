import { inIframe } from '../core/env';
import { h } from './dom';

/**
 * Export JSON to the player's device. Top-level pages get a file download; inside an iframe
 * (where sandboxed downloads are blocked and would log errors) we show a Copy box instead.
 * Nothing is ever sent over the network.
 */
export function exportJson(filename: string, data: unknown, host: HTMLElement): void {
  const text = JSON.stringify(data, null, 2);
  if (!inIframe()) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = h('a', { href: url, download: filename, style: 'display:none' });
      host.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    } catch {
      /* fall through to the copy box */
    }
  }
  showCopyBox(host, filename, text);
}

export function showCopyBox(host: HTMLElement, title: string, text: string): void {
  const area = h('textarea', { class: 'copy-text', readonly: true, spellcheck: 'false' }) as HTMLTextAreaElement;
  area.value = text;
  const status = h('span', { class: 'copy-status' });
  const close = (): void => box.remove();
  const copy = (): void => copyText(area, status);
  const box = h(
    'div',
    { class: 'copy-box' },
    h('div', { class: 'copy-title' }, title),
    area,
    h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: copy }, 'Copy'), h('button', { class: 'btn small ghost', onclick: close }, 'Close'), status),
  );
  host.append(box);
  area.select();
}

/** Copy a text box to the clipboard (selected either way, so Ctrl/Cmd+C works as a fallback). */
export function copyText(area: HTMLTextAreaElement, status: HTMLElement): void {
  area.focus();
  area.select();
  const done = (ok: boolean): void => {
    status.textContent = ok ? 'Copied!' : 'Press Ctrl/Cmd+C to copy';
  };
  try {
    const p = navigator.clipboard?.writeText(area.value);
    if (p) p.then(() => done(true)).catch(() => done(false));
    else done(false);
  } catch {
    done(false);
  }
}

/** Ask the player to paste JSON (import). Resolves null on cancel. */
export function promptJson(host: HTMLElement, title: string): Promise<unknown | null> {
  return new Promise((resolve) => {
    const area = h('textarea', { class: 'copy-text', placeholder: 'Paste exported JSON here', spellcheck: 'false' }) as HTMLTextAreaElement;
    const err = h('span', { class: 'copy-status' });
    const finish = (v: unknown | null): void => {
      box.remove();
      resolve(v);
    };
    const ok = (): void => {
      try {
        finish(JSON.parse(area.value));
      } catch {
        err.textContent = 'That is not valid JSON.';
      }
    };
    const box = h(
      'div',
      { class: 'copy-box' },
      h('div', { class: 'copy-title' }, title),
      area,
      h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: ok }, 'Import'), h('button', { class: 'btn small ghost', onclick: () => finish(null) }, 'Cancel'), err),
    );
    host.append(box);
    area.focus();
  });
}
