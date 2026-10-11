// Playtest UI: the hidden Settings section (tap the version line 5 times), export as a file when
// standalone, or a JSON box with a Copy button inside an iframe (downloads are often blocked there).
import type { App } from '../app';
import { MISSION_BY_ID } from '../data/missions';
import { btn, clear, h, type Panel } from './dom';

export const GAME_VERSION = '1.1';

/** Running inside an iframe (cross-origin access to window.top throws, which also means yes). */
export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Copy text: async clipboard API, then execCommand on the textarea, else ask the player to copy. */
export async function copyText(text: string, area?: HTMLTextAreaElement): Promise<'copied' | 'manual'> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    /* fall through */
  }
  try {
    if (area) {
      area.focus();
      area.select();
      if (document.execCommand('copy')) return 'copied';
    }
  } catch {
    /* fall through */
  }
  area?.select();
  return 'manual';
}

function fileName(app: App): string {
  const g = app.game;
  return `light-crossing-playtest-slot${app.currentSlot + 1}${g ? `-day${g.state.clock.day}` : ''}.json`;
}

/** Export the current playtest log: a file download standalone, a copy box inside an iframe. */
export function exportPlaytest(app: App): void {
  const rec = app.playtest;
  if (!rec) return;
  const json = rec.exportJSON();
  if (!inIframe()) {
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = h('a', { href: url, download: fileName(app), style: 'display:none' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      app.hud.toast('Playtest data saved as a file.', 'good');
      return;
    } catch {
      /* fall back to the copy box */
    }
  }
  showJsonBox(app, json);
}

export function showJsonBox(app: App, json: string): void {
  const area = h('textarea', { class: 'pt-json', readonly: true, spellcheck: false }) as HTMLTextAreaElement;
  area.value = json;
  area.addEventListener('keydown', (e) => e.stopPropagation());
  const status = h('div', { class: 'tiny muted' }, 'Copy this text and paste it into a .json file.');
  const p: Panel = {
    name: 'playtestExport',
    modal: true,
    el: h('div', { class: 'screen', style: 'z-index:11' }, h('div', { class: 'dim' })),
    command(c) {
      if (c === 'back' || c === 'cancel') {
        app.ui.pop(p);
        return true;
      }
      return false;
    },
  };
  p.el.appendChild(
    h(
      'div',
      { class: 'panel center', style: 'padding:20px;width:min(620px,94vw);display:flex;flex-direction:column;gap:10px' },
      h('h2', null, 'Playtest data', h('span', { class: 'spacer' }), btn('✕', () => app.ui.pop(p), 'small ghost')),
      area,
      status,
      h(
        'div',
        { class: 'row' },
        btn('Copy', () => {
          void copyText(json, area).then((r) => {
            status.textContent = r === 'copied' ? 'Copied! Paste it into a .json file.' : 'The text is selected — press Ctrl+C (or ⌘C) to copy it.';
          });
        }, 'primary'),
        btn('Close', () => app.ui.pop(p)),
      ),
    ),
  );
  app.ui.push(p);
}

/** Version line + hidden playtest section (appended to the Settings body). */
export function playtestSettings(app: App, body: HTMLElement): void {
  const box = h('div', { class: 'col', style: 'gap:6px' });
  let taps = 0;
  const version = h('div', { class: 'tiny muted pt-version', style: 'margin-top:12px;text-align:center;cursor:default;user-select:none' }, `Light Crossing ${GAME_VERSION}`);
  version.addEventListener('click', () => {
    if (++taps >= 5 && !box.childElementCount) render();
  });
  const render = () => {
    clear(box);
    const on = app.playtestEnabled();
    box.append(
      h('h3', null, 'Playtest mode'),
      h('div', { class: 'tiny muted' }, 'Keeps a small log of play time per mission on this device only. Nothing personal is saved, and nothing is sent anywhere.'),
    );
    const toggle = h('div', { class: 'row wrap' });
    for (const [v, label] of [[true, 'On'], [false, 'Off']] as const) {
      const b = h('button', { class: `chip ${on === v ? 'sel' : ''}`, 'data-nav': '' }, label);
      b.addEventListener('click', () => {
        app.settings.playtest = v;
        app.applySettings();
        app.syncPlaytest();
        render();
      });
      toggle.append(b);
    }
    box.append(h('div', { class: 'opt-row' }, h('label', null, 'Recording'), toggle));
    const rec = app.playtest;
    if (rec) {
      const L = rec.log;
      const done = Object.values(L.missions).filter((m) => m.e !== undefined).length;
      const stalled = Object.entries(L.missions).filter(([, m]) => m.stalls > 0).map(([id]) => MISSION_BY_ID[id]?.title ?? id);
      box.append(h('div', { class: 'tiny' }, `${Math.round(L.total / 60)} min recorded (${Math.round(L.idle / 60)} min idle) · ${done} missions done · day ${L.day}`));
      if (stalled.length) box.append(h('div', { class: 'tiny muted' }, `Stalled on: ${stalled.slice(-4).join(', ')}`));
      box.append(
        h(
          'div',
          { class: 'row wrap' },
          btn(inIframe() ? 'Show data to copy' : 'Export file', () => exportPlaytest(app), 'small primary'),
          inIframe() ? null : btn('Show data', () => showJsonBox(app, rec.exportJSON()), 'small'),
          btn('Clear log', () => {
            rec.reset();
            render();
          }, 'small danger'),
        ),
      );
    } else if (on) box.append(h('div', { class: 'tiny muted' }, 'Recording starts when you load an island.'));
    // keep keyboard/gamepad focus inside the section after re-rendering it
    const first = box.querySelector<HTMLElement>('[data-nav]');
    if (first && app.ui.top?.el.contains(box)) app.ui.focus(first);
  };
  if (app.playtestEnabled()) render();
  body.append(version, box);
}
