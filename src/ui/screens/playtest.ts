import type { App } from '../../game/app';
import { BUILD_VERSION } from '../../game/playtest';
import { button, h, type Screen } from '../ui';
import { choice } from './setup';
import { confirmOverlay } from './settings';

/** Is this page running inside another page (e.g. the games site's sandboxed iframe)? */
export function inFrame(): boolean {
  try {
    return window.top !== window;
  } catch {
    return true;
  }
}

/** Try a normal file download (works when the game runs on its own). */
function tryDownload(name: string, text: string): boolean {
  if (inFrame()) return false; // sandboxed frames usually block downloads silently
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

/** Copy-box overlay used inside the iframe (or when downloads fail). */
export function copyOverlay(app: App, title: string, text: string, hint = 'Copy this text and save it as a .json file for the analyzer.'): Screen {
  const area = h('textarea', { readonly: 'readonly', 'aria-label': title }) as HTMLTextAreaElement;
  area.value = text;
  const close = (): void => app.ui.closeOverlay();
  const copy = async (): Promise<void> => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      area.focus();
      area.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    app.toast(ok ? 'Copied! Paste it into a file or message.' : 'Select the text and copy it by hand.');
  };
  const el = h(
    'div',
    { class: 'panel menu-col playtest-export', style: 'width:min(640px,92vw)' },
    h('div', { style: 'font-weight:900;font-size:clamp(16px,2.6vh,22px)' }, title),
    h('div', { class: 'hint' }, hint),
    area,
    h('div', { class: 'menu-row', style: 'justify-content:center' }, button('Copy', () => void copy(), 'yellow'), button('Close', close, 'ghost')),
  );
  return { el, onBack: close };
}

export function exportPlaytest(app: App): void {
  const data = app.playtest.exportData(BUILD_VERSION);
  const text = JSON.stringify(data, null, 1);
  const d = new Date();
  const name = `calex-cart-playtest-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  if (tryDownload(name, text)) app.toast(`Saved ${name}`);
  else app.ui.showOverlay(copyOverlay(app, `Playtest data (${data.races.length} races)`, text));
}

/** Settings → Playtest tab. */
export function renderPlaytest(app: App, body: HTMLElement, rerender: () => void): void {
  const s = app.saves.settings;
  const kb = Math.round((app.playtest.chars * 2) / 1024);
  body.append(
    choice('Playtest recording', [[false, 'Off'], [true, 'On']], () => s.playtest, (v) => {
      s.playtest = v;
      app.saveSettings();
      rerender();
    }),
    h(
      'div',
      { class: 'hint' },
      'Records anonymous numbers for each race (track, times, falls, drifts, items, input type). ' +
        'No names. It stays on this device and is never sent anywhere.',
    ),
    h('div', { class: 'setting-row' }, h('div', null, 'Recorded'), h('div', null, `${app.playtest.count} races · ${kb} KB`)),
    h(
      'div',
      { class: 'menu-row' },
      button('Export playtest data', () => exportPlaytest(app), 'small yellow'),
      button('Clear playtest data', () =>
        app.ui.showOverlay(
          confirmOverlay(app, 'Delete all recorded playtest races?', () => {
            app.playtest.clear();
            app.toast('Playtest data cleared');
            rerender();
          }),
        ), 'small ghost'),
    ),
  );
}
