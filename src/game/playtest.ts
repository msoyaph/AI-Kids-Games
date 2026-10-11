/**
 * `?playtest=1` client: records real play time (clock running vs paused vs title), each
 * in-game day, milestones and FPS into a local-only log, and offers an export screen —
 * a JSON download when the game runs on its own page, or a Copy box inside an iframe
 * (sandboxed frames usually block downloads). Nothing is ever sent anywhere.
 */
import { remove, storageMode } from '../core/storage';
import { h } from '../ui/dom';
import { HOOKS, type Game } from './game';
import { PLAYTEST_KEY, PlaytestRecorder, emptyLog, loadLog, quickSummary, type PlaytestDevice } from './playtest-log';

function newId(): string {
  const a = new Uint32Array(2);
  try {
    crypto.getRandomValues(a);
  } catch {
    a[0] = Math.floor(Math.random() * 2 ** 32);
    a[1] = Math.floor(Math.random() * 2 ** 32);
  }
  return a[0].toString(36) + a[1].toString(36);
}

function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function installPlaytest(g: Game): void {
  const device: PlaytestDevice = {
    w: innerWidth,
    h: innerHeight,
    dpr: Math.round(devicePixelRatio * 100) / 100,
    touch: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
    renderer: g.host.kind,
    lowq: g.opts.lowq,
  };
  let rec = new PlaytestRecorder(loadLog(device, newId), new Date().toISOString().slice(0, 10));
  let lastDay = -1, lastMin = 0, passedOut = false, wasOpen = false, deepest = 0, harvested = 0, boards = 0, festivals = 0, finale = 0;
  const sync = () => {
    const st = g.sim.state;
    lastDay = st.day;
    deepest = st.mine.deepest;
    harvested = st.stats.harvested;
    boards = st.story.done.length;
    festivals = st.story.festivalsDone.length;
    finale = st.story.finale;
  };

  // events from the sim
  let unsub: (() => void)[] = [];
  HOOKS.onAttach.push((game) => {
    for (const u of unsub) u();
    unsub = [];
    // decide once the new mode is set: the title's backdrop farm and benchmarks aren't real games
    const sim = game.sim;
    queueMicrotask(() => {
      if (game.sim === sim && game.mode !== 'bench' && game.mode !== 'title') watchSim(game);
    });
  });
  function watchSim(game: Game): void {
    rec.resetDay();
    sync();
    const ev = game.sim.ev;
    const at = (kind: string, data?: string | number) => rec.event(game.sim.state.day, game.sim.state.min, kind, data);
    unsub.push(
      ev.on('levelUp', (e) => at('levelUp', `${e.skill}:${e.level}`)),
      ev.on('mineFloor', (e) => {
        if (e.floor > deepest) {
          deepest = e.floor;
          if (e.floor % 5 === 0) at('deepest', e.floor);
        }
      }),
      ev.on('faint', () => at('faint')),
      ev.on('achievement', (e) => at('achievement', e.id)),
      ev.on('hearts', (e) => at('hearts', `${e.id}:${e.hearts}`)),
      ev.on('passout', () => {
        passedOut = true;
      }),
      ev.on('newDay', () => {
        const st = game.sim.state;
        rec.endDay({ slot: game.slot, day: lastDay, bed: Math.round(lastMin), passedOut, coins: st.player.coins, boards: st.story.done.length, bundles: st.story.bundles.length, deepest: st.mine.deepest });
        passedOut = false;
        if (st.story.done.length > boards) for (const b of st.story.done.slice(boards)) at('board', b);
        sync();
        rec.flush();
      }),
    );
    at('start', game.sim.state.day);
  }

  // real time, every frame (rAF stops while the tab is hidden, so idle tabs don't count)
  let last = performance.now();
  let fpsT = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (g.mode !== 'bench' && g.mode !== 'boot') {
      const where = g.mode === 'title' ? 'title' : g.mode === 'play' && !g.sim.paused && !g.modals.open && !g.inputBlocked ? 'play' : 'paused';
      if (rec.tick(dt, where, g.fps)) rec.flush();
      fpsT += dt;
      if (fpsT >= 1) {
        fpsT = 0;
        rec.sampleFps(g.fps);
      }
      if (g.mode === 'play') {
        const st = g.sim.state;
        lastMin = st.min;
        if (g.modals.open && !wasOpen) rec.menuOpened();
        wasOpen = g.modals.open;
        if (st.stats.harvested > 0 && harvested === 0) rec.event(st.day, st.min, 'firstHarvest');
        harvested = st.stats.harvested;
        if (st.story.festivalsDone.length > festivals) rec.event(st.day, st.min, 'festival', st.story.festivalsDone[st.story.festivalsDone.length - 1]);
        festivals = st.story.festivalsDone.length;
        if (st.story.finale && !finale) rec.event(st.day, st.min, 'finale');
        finale = st.story.finale;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const save = () => rec.flush();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  addEventListener('pagehide', save);

  // the little badge + export screen
  const style = document.createElement('style');
  style.textContent = `
.pt-badge { position: absolute; left: max(8px, env(safe-area-inset-left)); bottom: calc(max(8px, env(safe-area-inset-bottom)) + 66px); z-index: 40; pointer-events: auto;
  font: 800 12px/1 system-ui, sans-serif; padding: 5px 9px; border-radius: 999px; border: 2px solid #3d3c4e; background: #f5e6c8; color: #3d3c4e; cursor: pointer; opacity: .85; }
.pt-badge:hover { opacity: 1; }
.pt-box { width: 100%; height: 140px; font: 11px/1.3 ui-monospace, Menlo, monospace; resize: vertical; border-radius: 6px; border: 2px solid var(--paper3); padding: 6px; }
`;
  document.head.appendChild(style);
  const badge = h('button', { class: 'pt-badge', 'aria-label': 'Playtest data' }, '🧪 Playtest');
  badge.addEventListener('click', () => openExport());
  g.uiRoot.appendChild(badge);

  function openExport(): void {
    const log = rec.snapshot();
    const json = JSON.stringify(log);
    const sum = quickSummary(log);
    const frame = inFrame();
    const box = h('textarea', { class: 'pt-box', readonly: '', 'aria-label': 'Playtest data (JSON)' }) as HTMLTextAreaElement;
    box.value = json;
    const status = h('p', { class: 'hint', role: 'status' }, '');
    const copy = h('button', { class: 'btn blue small' }, 'Copy');
    copy.addEventListener('click', async () => {
      box.focus();
      box.select();
      let ok = false;
      try {
        await navigator.clipboard.writeText(json);
        ok = true;
      } catch {
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
      }
      status.textContent = ok ? 'Copied! Paste it into a message or file for the game makers.' : 'The text is selected — press Ctrl+C (or ⌘C) to copy it.';
    });
    const download = h('button', { class: 'btn green small' }, 'Download file');
    download.addEventListener('click', () => {
      try {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = h('a', { href: url, download: `cliff-valley-playtest-${log.id}-${new Date().toISOString().slice(0, 10)}.json` }) as HTMLAnchorElement;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        status.textContent = 'Saved a file to your downloads.';
      } catch {
        status.textContent = 'Downloading is blocked here — use Copy instead.';
      }
    });
    const clear = h('button', { class: 'btn red small' }, 'Clear data');
    let close = () => {};
    clear.addEventListener('click', () => {
      g.modals.ask('Clear playtest data?', 'This removes the playtest numbers on this device. Your farm is not touched.', [
        { label: 'Keep it', cls: 'gray' },
        {
          label: 'Clear',
          cls: 'red',
          onClick: () => {
            remove(PLAYTEST_KEY);
            rec = new PlaytestRecorder(emptyLog(device, newId()), new Date().toISOString().slice(0, 10));
            if (g.mode === 'play') sync();
            close();
          },
        },
      ]);
    });
    close = g.modals.show(
      h('div', { style: 'width:min(92vw,520px)' },
        h('h2', null, '🧪 Playtest data'),
        h('p', null, 'Thank you for testing Cliff Valley! This counts play time and progress only — no names, nothing personal. It stays on this device until you choose to share it.'),
        h('p', null, h('b', null, `${sum.minutes} minutes played · ${sum.days} days slept · about ${sum.perDay} min per day`)),
        storageMode() === 'memory' ? h('p', { class: 'hint' }, 'This page can\'t keep data after it closes, so copy it before you leave.') : null,
        box,
        status,
        h('div', { class: 'actions' }, frame ? null : download, copy, clear, h('button', { class: 'btn gray small', onclick: () => close() }, 'Done')),
      ),
      { cancel: () => {} },
    );
    if (frame) box.select();
  }
}
