import type { App } from '../../game/app';
import { RACERS } from '../../data/racers';
import { CUPS } from '../../data/cups';
import { SPEED_CLASSES } from '../../sim/tuning';
import type { SpeedClass } from '../../data/types';
import { SLOT_COUNT } from '../../save/save';
import { button, h, type Screen } from '../ui';
import { TROPHY_SVG } from '../icons';

function logo(): HTMLElement {
  const word = (w: string, colors: string[], delay: number): HTMLElement =>
    h('div', null, ...w.split('').map((c, i) => h('span', { style: `color:${colors[i % colors.length]};animation-delay:${delay + i * 0.08}s` }, c)));
  return h('div', { class: 'big-logo' }, word('CALEX', ['#ffd23f', '#4ce0d2', '#ff6fae', '#8cff6b'], 0), word('CART', ['#ff6fae', '#8cff6b', '#4ce0d2', '#ffd23f'], 0.4));
}

export function titleScreen(app: App): Screen {
  app.menu.setView('title');
  app.menu.showLineup(
    RACERS.slice(0, 6).map((r) => ({ racerId: r.id, cfg: { ...r.defaultKart, paint: 'cherry', decal: 'none' } })).map((e, i) => ({ ...e, cfg: { ...e.cfg, paint: ['cherry', 'ocean', 'lime', 'sunny', 'grape', 'tangerine'][i] ?? 'cherry' } })),
  );
  let started = false;
  const go = (): void => {
    if (started) return;
    started = true;
    app.audio.unlock();
    app.audio.ui('start');
    app.audio.playMusic('menu');
    app.screens.slots();
  };
  const press = h('div', { class: 'press' }, app.gr.isTouch ? 'Tap to start!' : 'Press any button!');
  const el = h(
    'div',
    { class: 'title-screen', style: 'align-items:center;justify-content:center;cursor:pointer' },
    logo(),
    press,
    h('div', { class: 'hint', style: 'position:absolute;bottom:calc(10px + var(--safe-b));left:0;right:0;text-align:center' }, 'An original kart racer · Made for racers aged 10–14'),
  );
  el.addEventListener('pointerdown', go);
  const onKey = (e: KeyboardEvent): void => {
    if (e.code !== 'Tab') go();
  };
  window.addEventListener('keydown', onKey);
  let padTimer = 0;
  const checkPad = (): void => {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.buttons.some((b) => b.pressed)) go();
    if (!started) padTimer = requestAnimationFrame(checkPad);
  };
  padTimer = requestAnimationFrame(checkPad);
  return {
    el,
    onExit: () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(padTimer);
    },
  };
}

function ago(ts: number): string {
  const d = (Date.now() - ts) / 1000;
  if (d < 90) return 'just now';
  if (d < 3600) return `${Math.round(d / 60)} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} h ago`;
  return `${Math.round(d / 86400)} days ago`;
}

export function slotsScreen(app: App): Screen {
  app.menu.setView('title');
  const list = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(260px,80vw),1fr));width:min(940px,100%);margin:0 auto' });
  const render = (): void => {
    list.innerHTML = '';
    const slots = app.saves.listSlots();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const s = slots[i];
      const slot = i + 1;
      const card = h('div', { class: 'panel menu-col', style: 'align-items:center;text-align:center' });
      card.appendChild(h('div', { style: 'font-size:clamp(18px,3vh,26px);font-weight:900' }, `Save ${slot}`));
      if (s) {
        const racer = RACERS.find((r) => r.id === s.racer);
        card.appendChild(h('div', { style: 'font-size:clamp(16px,2.6vh,22px);color:#ffd23f' }, s.name));
        card.appendChild(h('div', { class: 'hint' }, `${racer?.name ?? ''} · 🏆 ${s.trophies} · ${Math.floor(s.playSeconds / 60)} min · ${ago(s.updatedAt)}`));
        card.appendChild(
          button('Continue', () => {
            app.saves.load(slot);
            app.flow.racers[0] = app.save.racer;
            app.screens.mainMenu();
          }, 'yellow'),
        );
        card.appendChild(
          button('Delete', () => {
            app.screens.confirm(`Delete "${s.name}"? This can't be undone.`, () => {
              app.saves.deleteSlot(slot);
              render();
            });
          }, 'small ghost'),
        );
      } else {
        card.appendChild(h('div', { class: 'hint' }, 'Empty'));
        card.appendChild(button('New Game', () => app.screens.nameEntry(slot), 'teal'));
      }
      list.appendChild(card);
    }
  };
  render();
  const el = h('div', { class: 'dim', style: 'justify-content:center' }, h('div', { class: 'title-h', style: 'justify-content:center' }, 'Choose a save'), list, h('div', { class: 'hint', style: 'text-align:center;margin-top:10px' }, 'Progress saves automatically on this device only.'));
  return { el, onBack: () => app.screens.title() };
}

const NAME_IDEAS = ['Turbo Star', 'Zoom Zoom', 'Drift King', 'Speedy', 'Sparky', 'Rocket', 'Comet', 'Blaze', 'Ace', 'Whirlwind', 'Nova', 'Pixel'];

export function nameEntryScreen(app: App, slot: number): Screen {
  let name = NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)];
  const input = h('input', { type: 'text', maxlength: '14', value: name, 'aria-label': 'Racer name', style: 'font:900 24px var(--font);padding:10px 14px;border-radius:14px;border:3px solid #fff;width:min(320px,80vw);text-align:center' }) as HTMLInputElement;
  input.addEventListener('input', () => (name = input.value.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 14)));
  const ideas = h('div', { class: 'menu-row', style: 'justify-content:center;max-width:640px' });
  for (const n of NAME_IDEAS.slice(0, 8)) ideas.appendChild(button(n, () => ((input.value = n), (name = n)), 'small ghost'));
  const go = (): void => {
    app.saves.create(slot, name.trim() || 'Racer');
    app.flow.racers[0] = app.save.racer;
    app.screens.mainMenu();
  };
  const el = h(
    'div',
    { class: 'dim', style: 'align-items:center;justify-content:center;gap:14px' },
    h('div', { class: 'title-h' }, 'Pick a racer name'),
    h('div', { class: 'hint' }, 'Use a nickname — not your real name!'),
    input,
    ideas,
    button("Let's go!", go, 'big yellow'),
  );
  return { el, onBack: () => app.screens.slots() };
}

export function mainMenuScreen(app: App): Screen {
  app.menu.setView('showcase');
  app.menu.offsetX = -4.4;
  app.menu.showKart(app.save.racer, app.save.kart);
  const s = app.save;
  const trophies = Object.values(s.trophies);
  const gold = trophies.filter((t) => t === 'gold').length;
  const big = (label: string, sub: string, cls: string, fn: () => void): HTMLButtonElement => {
    const b = button(h('div', null, h('div', null, label), h('div', { style: 'font-size:.55em;opacity:.85' }, sub)), fn, `big ${cls}`);
    b.style.textAlign = 'left';
    return b;
  };
  // New racers get a gentle nudge toward the Driving School
  const newbie = Object.keys(s.school ?? {}).length === 0 && s.stats.races < 3;
  const col = h(
    'div',
    { class: 'menu-col', style: 'width:min(420px,46vw);min-width:250px;overflow-y:auto;max-height:100%' },
    newbie ? big('🎓 New here? Driving School', 'Six quick lessons: steer, drift, rocket starts…', 'teal school-prompt', () => app.screens.school()) : null,
    big('Grand Prix', 'Race a 4-track cup for trophies', 'yellow', () => {
      app.flow.mode = 'grandPrix';
      app.screens.players();
    }),
    big('Versus', 'Your rules: one race or a custom cup', '', () => {
      app.flow.mode = 'versus';
      app.screens.players();
    }),
    big('Battle', 'Pop balloons or grab coins in the arenas!', 'pink', () => {
      app.flow.mode = 'battle';
      app.screens.players();
    }),
    big('Time Trial', 'Beat your ghost and the staff', 'teal', () => {
      app.flow.mode = 'timeTrial';
      app.flow.players = 1;
      app.screens.racerSelect(0, () => app.screens.trackSelect());
    }),
  );
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  const fsButton = canFullscreen
    ? button(document.fullscreenElement ? '⤢ Exit fullscreen' : '⛶ Fullscreen', () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => app.toast('Fullscreen isn’t allowed here.'));
        setTimeout(() => app.screens.mainMenu(), 300);
      }, 'small ghost')
    : null;
  const row = h(
    'div',
    { class: 'menu-row' },
    button('🎓 School', () => app.screens.school(), 'small'),
    button('🎯 Challenges', () => app.screens.challenges(), 'small'),
    button('🔧 Garage', () => app.screens.garage(() => app.screens.mainMenu()), 'small'),
    button('📖 Collection', () => app.screens.collection(), 'small'),
    button('⏱ Records', () => app.screens.records(), 'small'),
    button('⚙️ Settings', () => app.screens.settings(() => app.screens.mainMenu()), 'small'),
  );
  const done = Object.values(s.challenges).filter((c) => c.done).length;
  const el = h(
    'div',
    { class: 'dim' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Calex Cart', h('span', { class: 'sub' }, `· ${s.name}`)), h('div', { class: 'spacer' }), h('div', { class: 'hint' }, `🏆 ${trophies.length}  (${gold} gold) · 🎯 ${done} · 🏎 ${s.unlocks.racers.length}/${RACERS.length}`)),
    h('div', { style: 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:0' }, col),
    row,
    h('div', { class: 'menu-row', style: 'margin-top:8px' }, button('↩ Change save', () => app.screens.slots(), 'small ghost'), fsButton),
  );
  return {
    el,
    onBack: () => app.screens.slots(),
    onExit: () => (app.menu.offsetX = 0),
  };
}

export function playersScreen(app: App): Screen {
  app.menu.setView('title');
  const pick = (n: 1 | 2): void => {
    app.flow.players = n;
    if (app.flow.mode === 'battle') app.screens.racerSelect(0, () => (n === 2 ? app.screens.racerSelect(1, () => app.screens.battleSetup()) : app.screens.battleSetup()));
    else app.screens.classSelect(() => app.screens.racerSelect(0, () => (n === 2 ? app.screens.racerSelect(1, after) : after())));
  };
  const after = (): void => {
    if (app.flow.mode === 'grandPrix') app.screens.cupSelect();
    else app.screens.vsOptions();
  };
  const d1 = app.describeSources(1);
  const d2 = app.describeSources(2);
  const touchOnly = app.gr.isTouch && app.input.connectedPads().length === 0;
  const two = button(h('div', null, '2 Players', h('div', { class: 'hint' }, `P1: ${d2[0]} · P2: ${d2[1]}`)), () => pick(2), 'big pink');
  if (touchOnly) {
    two.disabled = true;
    two.title = 'Connect a keyboard or gamepad for 2 players';
  }
  const el = h(
    'div',
    { class: 'dim', style: 'align-items:center;justify-content:center;gap:16px' },
    h('div', { class: 'title-h' }, 'How many racers?'),
    button(h('div', null, '1 Player', h('div', { class: 'hint' }, d1[0])), () => pick(1), 'big yellow'),
    two,
    h('div', { class: 'hint', style: 'max-width:600px;text-align:center' }, touchOnly ? 'Split-screen needs a keyboard or gamepads.' : 'Split-screen: connect gamepads for the best experience. Two players can also share one keyboard.'),
  );
  return { el, onBack: () => app.screens.mainMenu() };
}

export function classSelectScreen(app: App, next: () => void): Screen {
  app.menu.setView('title');
  const s = app.save;
  const opt = (id: SpeedClass | 'mirror', desc: string): HTMLButtonElement => {
    const unlocked = s.unlocks.classes.includes(id);
    const name = id === 'mirror' ? 'Mirror' : SPEED_CLASSES[id].name;
    const b = button(h('div', null, `${unlocked ? '' : '🔒 '}${name}`, h('div', { class: 'hint' }, unlocked ? desc : id === 'champion' ? 'Win gold in every cup on Pro' : 'Win gold in every cup on Champion')), () => {
      if (!unlocked) {
        app.audio.ui('error');
        return;
      }
      app.flow.mirror = id === 'mirror';
      app.flow.speedClass = id === 'mirror' ? 'champion' : id;
      next();
    }, `big ${id === 'rookie' ? 'teal' : id === 'pro' ? '' : id === 'champion' ? 'pink' : 'yellow'}`);
    if (!unlocked) b.classList.add('locked');
    return b;
  };
  const el = h(
    'div',
    { class: 'dim', style: 'align-items:center;justify-content:center;gap:12px' },
    h('div', { class: 'title-h' }, 'Choose your speed'),
    h(
      'div',
      { class: 'menu-col', style: 'width:min(520px,92vw)' },
      opt('rookie', 'Relaxed speed — perfect for learning'),
      opt('pro', 'Faster karts, smarter rivals'),
      opt('champion', 'Top speed! The AI races to win'),
      opt('mirror', 'Champion speed on flipped tracks'),
    ),
  );
  return { el, onBack: () => app.screens.players() };
}

export function cupProgress(app: App, cupId: string): string {
  const cls = app.flow.mirror ? 'mirror' : app.flow.speedClass;
  const medal = app.save.trophies[`${cupId}:${cls}`];
  return medal ? TROPHY_SVG(medal === 'gold' ? '#ffd23f' : medal === 'silver' ? '#d9dee8' : '#d98a5f') : '';
}

export function cupLocked(app: App, cupId: string): boolean {
  return !app.save.unlocks.cups.includes(cupId as never) || !CUPS.find((c) => c.id === cupId);
}
