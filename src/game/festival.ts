/**
 * Festival client: decorations, a festival panel, and the four activities:
 * Seed Race (tap to till & plant), Berry Pick (tap ripe berries), Harvest Show (enter your
 * best item), Gift Exchange (give your secret friend a present, then sky lanterns).
 */
import { Sprite } from 'pixi.js';
import { TILE } from '../core/math';
import { tryItem } from '../data/items';
import { VILLAGER } from '../data/villagers';
import type { FestivalDef } from '../data/festivals';
import { canGift, giveGift } from '../sim/friendship';
import { activityDone, festivalKey, festivalOpen, festivalToday, finishActivity, judgeEntry, secretFriend } from '../sim/festivals';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { infoLine, invGrid } from '../ui/inventory';
import { iconName, itemName } from '../ui/itemview';
import { portrait, showDialogue } from '../ui/dialogue';
import { HOOKS, type Game } from './game';

const DECOR: Record<FestivalDef['id'], [string, number, number][]> = {
  sprout: [['banner', 27, 18], ['banner', 44, 18], ['stall', 28, 31], ['stall', 41, 31], ['flowers', 30, 20], ['flowers', 40, 20], ['flowers', 33, 32], ['banner', 34, 33], ['banner', 37, 33]],
  berry: [['stall', 28, 20], ['stall', 41, 20], ['stall', 30, 32], ['lanternPost', 27, 26], ['lanternPost', 44, 26], ['banner', 35, 19], ['banner', 36, 19]],
  harvest: [['pumpkinDeco', 28, 20], ['pumpkinDeco', 43, 20], ['hay', 29, 31], ['hay', 42, 31], ['stall', 33, 31], ['pumpkinDeco', 31, 31], ['pumpkinDeco', 40, 31], ['banner', 35, 19]],
  starlight: [['starTree', 35, 23], ['lanternPost', 27, 19], ['lanternPost', 44, 19], ['lanternPost', 27, 31], ['lanternPost', 44, 31], ['snowman', 30, 30], ['snowman', 41, 30]],
};

let decoSprites: Sprite[] = [];
let panel: HTMLElement | null = null;
let inFestival = false;

function clearDecor(): void {
  for (const s of decoSprites) s.removeFromParent();
  decoSprites = [];
}

function placeDecor(g: Game, f: FestivalDef): void {
  clearDecor();
  for (const [kind, x, y] of DECOR[f.id]) {
    const name = kind === 'flowers' || kind === 'hay' ? `prop.${kind}${kind === 'flowers' ? '.s0' : ''}` : `prop.${kind}`;
    const s = new Sprite(g.atlas.tex(name));
    s.anchor.set(0.5, 1);
    s.x = x * TILE + 8;
    s.y = (y + 1) * TILE;
    s.zIndex = s.y - 1;
    s.label = 'nocull';
    g.view.sorted.addChild(s);
    decoSprites.push(s);
  }
}

function showPanel(g: Game, f: FestivalDef): void {
  if (!panel) {
    panel = h('div', { class: 'fest panel' });
    g.uiRoot.appendChild(panel);
  }
  panel.innerHTML = '';
  const done = activityDone(g.sim, f);
  panel.append(h('b', null, `🎉 ${f.name}`), h('small', null, done ? 'You already played today. Enjoy the fair!' : f.activity));
  if (!done) panel.append(h('button', { class: 'btn small green', onclick: () => startActivity(g, f) }, 'Play!'));
  panel.style.display = '';
  g.uiRoot.classList.add('has-fest'); // toasts move below the banner
}

function hidePanel(): void {
  if (panel) {
    panel.style.display = 'none';
    panel.parentElement?.classList.remove('has-fest');
  }
}

function startActivity(g: Game, f: FestivalDef): void {
  if (g.modals.open || activityDone(g.sim, f)) return;
  if (f.id === 'sprout') seedRace(g, f);
  else if (f.id === 'berry') berryPick(g, f);
  else if (f.id === 'harvest') harvestShow(g, f);
  else giftExchange(g, f);
}

function result(g: Game, f: FestivalDef, place: number, text: string): void {
  const prize = finishActivity(g.sim, f, place);
  g.sfx(place === 1 ? 'fanfare' : 'pop');
  g.modals.ask(place === 1 ? '🥇 You won!' : place === 2 ? '🥈 Second place!' : '🎀 Great job!', `${text} You got ${prize}.`, [{ label: 'Hooray!', primary: true }]);
  showPanel(g, f);
}

// ── Seed Race ───────────────────────────────────────────────
function seedRace(g: Game, f: FestivalDef): void {
  const N = 12, TIME = 30;
  const tiles = new Array(N).fill(0); // 0 grass, 1 tilled, 2 planted
  const rivals = [['Kai', 0, 0.34], ['Pippa', 0, 0.42], ['Hollis', 0, 0.3]] as [string, number, number][];
  let t = 0, done = false;
  let close = () => {};
  const grid = h('div', { class: 'race-grid' });
  const bars = h('div', { class: 'race-bars' });
  const timer = h('div', { class: 'race-time' });
  const tileEls: HTMLElement[] = [];
  for (let i = 0; i < N; i++) {
    const el = h('button', { class: 'race-tile', 'aria-label': `Plot ${i + 1}` });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (done || tiles[i] >= 2) return;
      tiles[i]++;
      g.sfx(tiles[i] === 1 ? 'dig' : 'plant');
      draw();
    });
    tileEls.push(el);
    grid.appendChild(el);
  }
  const mine = () => tiles.reduce((a, b) => a + b, 0) / (N * 2);
  const draw = () => {
    tiles.forEach((v, i) => (tileEls[i].className = 'race-tile s' + v));
    bars.innerHTML = '';
    const row = (name: string, p: number, me = false) => h('div', { class: 'race-row' + (me ? ' me' : '') }, h('span', null, name), h('div', { class: 'race-bar' }, h('div', { class: 'fill', style: `width:${Math.round(Math.min(1, p) * 100)}%` })));
    bars.append(row(g.sim.p.name, mine(), true), ...rivals.map(([n, p]) => row(n, p)));
    timer.textContent = `⏱ ${Math.max(0, Math.ceil(TIME - t))}s`;
  };
  const finish = () => {
    done = true;
    clearInterval(iv);
    close();
    const my = mine();
    const place = 1 + rivals.filter(([, p]) => p >= 1 && my < 1).length + rivals.filter(([, p]) => p > my && p < 1).length;
    result(g, f, my >= 1 ? Math.min(place, 1 + rivals.filter(([, p]) => p >= 1).length) : Math.max(2, place), my >= 1 ? 'You planted every seed!' : 'What a race!');
  };
  const iv = window.setInterval(() => {
    t += 0.1;
    for (const r of rivals) r[1] = Math.min(1, r[1] + (r[2] / TIME) * 0.1 * 2.2);
    if (mine() >= 1 || t >= TIME || rivals.every(([, p]) => p >= 1)) finish();
    else draw();
  }, 100);
  draw();
  close = g.modals.show(h('div', { class: 'wide-modal' }, h('h2', null, '🌱 Seed Race!'), h('p', { style: 'margin:0 0 6px' }, 'Tap each patch twice: once to dig, once to plant. Finish before everyone else!'), timer, grid, bars), {});
}

// ── Berry Pick ──────────────────────────────────────────────
function berryPick(g: Game, f: FestivalDef): void {
  const N = 12, TIME = 30;
  const state = new Array(N).fill(0); // 0 empty, 1 ripe, 2 unripe
  let t = 0, score = 0, done = false;
  let close = () => {};
  const grid = h('div', { class: 'berry-grid' });
  const info = h('div', { class: 'race-time' });
  const els: HTMLElement[] = [];
  for (let i = 0; i < N; i++) {
    const el = h('button', { class: 'berry-bush', 'aria-label': `Bush ${i + 1}` });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (done) return;
      if (state[i] === 1) {
        score++;
        state[i] = 0;
        g.sfx('pop');
      } else if (state[i] === 2) g.sfx('meh');
      draw();
    });
    els.push(el);
    grid.appendChild(el);
  }
  const draw = () => {
    state.forEach((s, i) => (els[i].className = 'berry-bush b' + s));
    info.textContent = `⏱ ${Math.max(0, Math.ceil(TIME - t))}s   🫐 ${score}`;
  };
  const iv = window.setInterval(() => {
    t += 0.25;
    for (let i = 0; i < N; i++) {
      if (state[i] === 0 && Math.random() < 0.12) state[i] = Math.random() < 0.75 ? 1 : 2;
      else if (state[i] !== 0 && Math.random() < 0.1) state[i] = 0;
    }
    if (t >= TIME) {
      done = true;
      clearInterval(iv);
      close();
      g.sim.give('blueberry', Math.min(10, Math.floor(score / 3)));
      result(g, f, score >= 22 ? 1 : score >= 14 ? 2 : 3, `You picked ${score} berries!`);
    } else draw();
  }, 250);
  draw();
  close = g.modals.show(h('div', { class: 'wide-modal' }, h('h2', null, '🫐 Berry Pick!'), h('p', { style: 'margin:0 0 6px' }, 'Tap the bushes with ripe purple berries. Green ones aren\'t ready yet!'), info, grid), {});
}

// ── Harvest Show ────────────────────────────────────────────
function harvestShow(g: Game, f: FestivalDef): void {
  const sim = g.sim;
  const okCats = ['crop', 'fruit', 'flower', 'animal', 'artisan', 'forage', 'fish'];
  let close = () => {};
  const info = infoLine();
  close = g.modals.show(
    h('div', { class: 'wide-modal' },
      h('h2', null, '🎃 Harvest Show'),
      h('p', null, 'Pick your very best thing to show the judges. Shiny stars and valuable goods score higher. You get it back afterwards!'),
      invGrid(sim.p.inv, {
        sim,
        info,
        enabled: (s) => okCats.includes(tryItem(s.id)?.cat ?? ''),
        onClick: (i) => {
          const s = sim.p.inv[i];
          if (!s || !okCats.includes(tryItem(s.id)?.cat ?? '')) return;
          close();
          const r = judgeEntry(sim, s.id, s.q);
          const lines = [...r.rivals, [`${sim.p.name} (${itemName(s.id)})`, r.score] as [string, number]].sort((a, b) => b[1] - a[1]);
          g.modals.ask('The judges are ready...', h('div', null, ...lines.map(([n, sc], k) => h('div', { class: 'row' }, h('b', null, `${k + 1}.`), h('span', { class: 'nm' }, n), h('span', null, `${sc} pts`)))), [
            { label: 'See my ribbon!', primary: true, onClick: () => { setTimeout(() => result(g, f, Math.min(3, r.place), `Your ${itemName(s.id)} scored ${r.score} points!`), 50); } },
          ], false);
        },
      }),
      info,
      h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => close() }, 'Not yet')),
    ),
    { cancel: () => {} },
  );
}

// ── Gift Exchange ───────────────────────────────────────────
function giftExchange(g: Game, f: FestivalDef): void {
  const sim = g.sim;
  const friend = secretFriend(sim);
  const v = VILLAGER[friend];
  let close = () => {};
  const info = infoLine();
  close = g.modals.show(
    h('div', { class: 'wide-modal' },
      h('h2', null, '⭐ Gift Exchange'),
      h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('img', { src: portrait(friend), style: 'width:56px;height:56px;image-rendering:pixelated;background:#cfe8b8;border-radius:8px' }), h('p', null, `Your secret friend is ${v.name}! Pick a present for them.`)),
      invGrid(sim.p.inv, {
        sim,
        info,
        enabled: (s) => canGift(sim, friend, s.id).ok || !!sim.state.npcs[friend]?.gifted,
        onClick: (i) => {
          const s = sim.p.inv[i];
          if (!s) return;
          const st = sim.state.npcs[friend];
          if (st) st.gifted = false; // the exchange gift is always allowed
          const r = giveGift(sim, friend, i);
          if (!r.ok) {
            if (r.msg) g.toasts.show(r.msg);
            return;
          }
          close();
          const back = ['snowGlobe', 'heartLantern', 'teaSet', 'starLight', 'windChime'][(sim.state.seed + friend.length) % 5];
          sim.give(back, 1);
          showDialogue(g.modals, {
            name: v.name,
            face: friend,
            text: `${r.text} And this is for you, ${sim.p.name}! Happy Starlight Night!`,
            speak: g.settings.readAloud,
            pitch: v.pitch,
            buttons: [{ label: 'Thank you!', cls: 'green' }],
            onClose: () => lanterns(g, f, back),
          });
        },
      }),
      info,
    ),
    { cancel: () => {} },
  );
}

function lanterns(g: Game, f: FestivalDef, back: string): void {
  const sim = g.sim;
  for (let k = 0; k < 40; k++) {
    setTimeout(() => {
      g.fx.burst(g.atlas.tex('fx.spark'), sim.p.x + (Math.random() - 0.5) * 240, sim.p.y + 40, 1, { color: [0xffc6dc, 0xfff5b8, 0xa8c8ff][k % 3], speed: 8, up: 70, life: 4, gravity: -6, fade: true });
    }, k * 90);
  }
  g.sfx('chime');
  setTimeout(() => result(g, f, 1, `Sky lanterns drift up into the stars... You received a ${itemName(back)}!`), 2200);
}

export function installFestivals(_g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.fest { position: absolute; top: calc(max(8px, env(safe-area-inset-top)) + 58px * var(--ui)); left: 50%; transform: translateX(-50%); display: flex; gap: 10px; align-items: center; padding: 6px 12px; pointer-events: auto; max-width: 92vw; }
.fest small { color: var(--ink2); }
.has-fest .toasts { top: calc(max(8px, env(safe-area-inset-top)) + 58px * var(--ui) + 72px); }
@media (max-width: 520px) {
  .fest { top: calc(max(8px, env(safe-area-inset-top)) + 124px * var(--ui)); white-space: nowrap; }
  .fest small { display: none; }
  .has-fest .toasts { top: calc(max(8px, env(safe-area-inset-top)) + 124px * var(--ui) + 64px); }
}
.race-time { font-weight: 900; font-size: 1.2em; text-align: center; margin: 4px 0; }
.race-grid, .berry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 6px 0; }
.race-tile, .berry-bush { aspect-ratio: 1; min-height: 56px; border-radius: 10px; border: 3px solid var(--wood-d); cursor: pointer; touch-action: manipulation; }
.race-tile.s0 { background: #5c9e48; }
.race-tile.s1 { background: #6b4a32; }
.race-tile.s2 { background: #6b4a32 radial-gradient(circle at 50% 45%, #86c25a 0 22%, transparent 24%); }
.berry-bush { background: radial-gradient(circle at 50% 55%, #3e7c3c 0 60%, #2c5a37 61%); }
.berry-bush.b1 { background: radial-gradient(circle at 35% 45%, #664788 0 10%, transparent 11%), radial-gradient(circle at 62% 55%, #664788 0 10%, transparent 11%), radial-gradient(circle at 48% 70%, #664788 0 10%, transparent 11%), radial-gradient(circle at 50% 55%, #3e7c3c 0 60%, #2c5a37 61%); }
.berry-bush.b2 { background: radial-gradient(circle at 40% 50%, #b8e07c 0 9%, transparent 10%), radial-gradient(circle at 60% 60%, #b8e07c 0 9%, transparent 10%), radial-gradient(circle at 50% 55%, #3e7c3c 0 60%, #2c5a37 61%); }
.race-bars { display: flex; flex-direction: column; gap: 4px; }
.race-row { display: grid; grid-template-columns: 90px 1fr; gap: 6px; align-items: center; font-weight: 700; }
.race-row.me { color: #2c6a30; }
.race-bar { height: 12px; background: var(--paper2); border-radius: 6px; overflow: hidden; }
.race-bar .fill { height: 100%; background: linear-gradient(90deg, #ffd77a, #f5b942); }
.race-row.me .race-bar .fill { background: linear-gradient(90deg, #9fdc84, #5cae4c); }
`;
  document.head.appendChild(style);
  HOOKS.onEnter.push((game) => {
    clearDecor();
    const f = festivalToday(game.sim);
    const sim = game.sim;
    if (f && sim.p.loc === 'town' && festivalOpen(sim)) {
      placeDecor(game, f);
      game.atFestival = true;
      if (!inFestival) {
        inFestival = true;
        game.holdClock = true;
        sim.paused = true;
        game.toasts.show(`Welcome to the ${f.name}! ${f.desc}`, 'ui.star2', 5000);
      }
      showPanel(game, f);
    } else {
      if (inFestival && f) {
        // you left the festival: it wraps up and the day moves on
        inFestival = false;
        game.holdClock = false;
        sim.paused = game.modals.open;
        sim.state.flags[`left.${festivalKey(sim, f)}`] = 1;
        if (sim.state.min < f.close) sim.advanceMinutes(f.close - sim.state.min);
        game.toasts.show(`The ${f.name} is over. What a fun day!`, 'ui.star2');
      }
      game.atFestival = false;
      hidePanel();
    }
  });
  HOOKS.onUpdate.push((game) => {
    if (inFestival) game.sim.paused = true;
  });
  HOOKS.onAttach.push(() => {
    inFestival = false;
    hidePanel();
    clearDecor();
  });
  void icon;
  void iconName;
}
