/**
 * Fishing client: hold to charge a cast, wait for a nibble, tap when "!" appears, then the
 * Tension Reel: hold to pull, let go to ease off — keep the marker in the green zone while
 * the fish tugs. Fill the catch meter to land it.
 */
import { Sprite } from 'pixi.js';
import { DIR_DX, DIR_DY, TILE } from '../core/math';
import { FISH_BY_ID } from '../data/fish';
import { tryItem } from '../data/items';
import { Reel, biteDelay, landCatch, pickCatch, reelParams, zoneAt, type Catch } from '../sim/fishing';
import { remove, count } from '../sim/inventory';
import { level } from '../sim/skills';
import { TUNING } from '../tuning';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { iconName } from '../ui/itemview';
import { HOOKS, type Game } from './game';

type Phase = 'idle' | 'charge' | 'fly' | 'wait' | 'bite' | 'reel';

const S = {
  phase: 'idle' as Phase,
  power: 0,
  t: 0,
  bx: 0,
  by: 0,
  sx: 0,
  sy: 0,
  waitT: 0,
  biteT: 0,
  bait: false,
  catch: null as Catch | null,
  reel: null as Reel | null,
  zone: null as string | null,
};

let bobber: Sprite | null = null;
let alert: Sprite | null = null;
let line: Sprite | null = null;
let ui: HTMLElement | null = null;
let ptrHold = false;

function end(g: Game, msg?: string): void {
  S.phase = 'idle';
  S.reel = null;
  S.catch = null;
  g.inputBlocked = false;
  g.sim.paused = g.modals.open;
  if (bobber) bobber.visible = false;
  if (alert) alert.visible = false;
  if (line) line.visible = false;
  ui?.classList.remove('show');
  if (msg) g.toasts.show(msg);
}

function startCast(g: Game): void {
  const sim = g.sim;
  if ((sim.p.tools.rod ?? -1) < 0) return;
  if (S.phase !== 'idle') {
    // pressing again while waiting reels in early
    if (S.phase === 'wait') end(g, 'You reeled in too soon. Wait for the "!"');
    else if (S.phase === 'bite') hook(g);
    return;
  }
  if (sim.p.energy <= 0) {
    sim.ev.emit('tired', { energy: 0 });
    return;
  }
  S.phase = 'charge';
  S.power = 0;
  S.t = 0;
  g.inputBlocked = true;
}

function release(g: Game): void {
  const sim = g.sim;
  const d = sim.p.dir;
  const dist = 1 + Math.round(S.power * 4);
  const pt = sim.playerTile();
  let tx = pt.x, ty = pt.y, found = false;
  for (let k = dist; k >= 1; k--) {
    const x = pt.x + DIR_DX[d] * k, y = pt.y + DIR_DY[d] * k;
    if (zoneAt(sim.here, x, y)) {
      tx = x;
      ty = y;
      found = true;
      break;
    }
  }
  if (!found) {
    end(g, 'Cast into the water! Face a pond, river, lake or the sea.');
    return;
  }
  const cost = Math.max(1, TUNING.energy.fish - Math.floor(level(sim, 'fishing') / 3));
  sim.useEnergy(cost);
  S.zone = zoneAt(sim.here, tx, ty);
  S.bait = count(sim.p.inv, 'bait') > 0;
  if (S.bait) remove(sim.p.inv, 'bait', 1);
  S.sx = sim.p.x;
  S.sy = sim.p.y - 14;
  S.bx = tx * TILE + 8;
  S.by = ty * TILE + 8;
  S.phase = 'fly';
  S.t = 0;
  g.sfx('cast');
}

function hook(g: Game): void {
  const sim = g.sim;
  const zone = S.zone as never;
  // pier fish only bite at the end of the pier
  S.catch = pickCatch(sim, zone, sim.rng(0xf1f, Math.floor(sim.state.playSec * 10)));
  const fishId = S.catch.kind === 'fish' ? S.catch.id : null;
  S.reel = new Reel(reelParams(sim, fishId), Math.floor(sim.state.playSec * 1000));
  S.phase = 'reel';
  if (alert) alert.visible = false;
  g.sfx('hook');
  showUI(g);
}

function showUI(g: Game): void {
  if (!ui) {
    ui = h('div', { class: 'reel panel', role: 'group', 'aria-label': 'Reel in the fish' });
    g.uiRoot.appendChild(ui);
  }
  ui.innerHTML = '';
  const hold = h('button', { class: 'btn blue reel-hold', 'aria-label': 'Hold to reel' }, 'HOLD to reel');
  const down = (e: Event) => {
    e.preventDefault();
    ptrHold = true;
  };
  const up = () => (ptrHold = false);
  hold.addEventListener('pointerdown', down);
  hold.addEventListener('pointerup', up);
  hold.addEventListener('pointerleave', up);
  hold.addEventListener('pointercancel', up);
  ui.append(
    h('div', { class: 'reel-title' }, 'Reel it in!'),
    h('div', { class: 'reel-bar' }, h('div', { class: 'reel-zone' }), h('div', { class: 'reel-mark' }), h('div', { class: 'reel-fish' }, icon('item.chub', 24))),
    h('div', { class: 'reel-prog' }, h('div', { class: 'fill' })),
    h('div', { class: 'reel-tip' }, 'Hold to pull, let go to ease off. Keep the marker in the green!'),
    hold,
  );
  ui.classList.add('show');
}

function updateUI(): void {
  if (!ui || !S.reel) return;
  const r = S.reel;
  const zone = ui.querySelector('.reel-zone') as HTMLElement;
  const mark = ui.querySelector('.reel-mark') as HTMLElement;
  const fill = ui.querySelector('.reel-prog .fill') as HTMLElement;
  const fish = ui.querySelector('.reel-fish') as HTMLElement;
  zone.style.left = `${(r.zone - r.p.zoneHalf) * 100}%`;
  zone.style.width = `${r.p.zoneHalf * 200}%`;
  mark.style.left = `${r.tension * 100}%`;
  mark.classList.toggle('in', r.inZone());
  mark.classList.toggle('hot', r.tension > 0.93);
  fill.style.width = `${Math.max(0, Math.min(1, r.progress)) * 100}%`;
  fish.style.left = `${r.zone * 100}%`;
}

function finish(g: Game, caught: boolean): void {
  const sim = g.sim;
  const c = S.catch!;
  const perfect = S.reel!.perfect;
  if (!caught) {
    g.sfx('escape');
    end(g, c.kind === 'fish' ? 'The fish wiggled free! Try again.' : 'It slipped away.');
    return;
  }
  const first = c.kind === 'fish' && !sim.state.col.fish[c.id];
  const r = landCatch(sim, c, perfect);
  g.sfx('catch');
  const d = tryItem(c.id);
  g.fx.burst(g.atlas.tex('fx.splash'), S.bx, S.by, 3, { speed: 30, up: 30, life: 0.5 });
  end(g);
  if (c.kind === 'fish') {
    const f = FISH_BY_ID[c.id];
    g.toasts.show(`You caught a ${d?.name}! ${r.size} cm${perfect ? ' · Perfect!' : ''}${first ? ' · New in your fish log!' : ''}`, iconName(c.id), 4000);
    if (f.rare) g.modals.ask('A legendary catch!', `The ${f.name}! Cap'n Wren is going to flip his hat when he hears about this!`, [{ label: 'Wow!', primary: true }]);
  } else g.toasts.show(`You fished up some ${d?.name}. Recycle it!`, iconName(c.id));
}

export function installFishing(g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.reel { position: absolute; left: 50%; bottom: calc(90px * var(--ui) + 20px); transform: translateX(-50%); width: min(92vw, 460px); padding: 12px 14px; display: none; flex-direction: column; gap: 8px; pointer-events: auto; z-index: 40; }
.reel.show { display: flex; }
.reel-title { font-weight: 900; font-size: 1.2em; text-align: center; }
.reel-bar { position: relative; height: 34px; background: linear-gradient(90deg, #cfe8ff, #8fb6f5); border: 3px solid var(--wood-d); border-radius: 10px; overflow: hidden; }
.reel-zone { position: absolute; top: 0; bottom: 0; background: rgba(92, 200, 92, .75); border-left: 2px solid #2c6a30; border-right: 2px solid #2c6a30; }
.reel-mark { position: absolute; top: -2px; bottom: -2px; width: 6px; margin-left: -3px; background: #d2434a; border-radius: 3px; box-shadow: 0 0 0 2px #fff; }
.reel-mark.in { background: #ffffff; box-shadow: 0 0 0 2px #2c6a30; }
.reel-mark.hot { background: #ff2a2a; }
.reel-fish { position: absolute; top: 4px; margin-left: -12px; opacity: .6; }
.reel-prog { height: 14px; background: var(--paper2); border-radius: 7px; overflow: hidden; border: 2px solid var(--wood-d); }
.reel-prog .fill { height: 100%; background: linear-gradient(90deg, #ffd77a, #f5b942); }
.reel-tip { font-size: .85em; text-align: center; color: var(--ink2); }
.reel-hold { font-size: 1.2em; min-height: 56px; touch-action: none; }
.cast-meter { position: absolute; width: 8px; height: 40px; background: #2b2433; border: 2px solid #fff; border-radius: 4px; overflow: hidden; }
`;
  document.head.appendChild(style);
  bobber = new Sprite(g.atlas.tex('fx.bobber'));
  bobber.anchor.set(0.5);
  bobber.visible = false;
  bobber.label = 'nocull';
  alert = new Sprite(g.atlas.tex('fx.alert'));
  alert.anchor.set(0.5, 1);
  alert.visible = false;
  alert.label = 'nocull';
  line = new Sprite(g.atlas.tex('ui.white'));
  line.visible = false;
  line.label = 'nocull';
  line.tint = 0xffffff;
  line.alpha = 0.7;
  HOOKS.onEnter.push((game) => {
    game.view.top.addChild(line!, bobber!, alert!);
    if (S.phase !== 'idle') end(game);
  });
  HOOKS.special.rod = startCast;
  HOOKS.trigger.freeRodHint = () => {};
  HOOKS.onUpdate.push((game, dt) => {
    if (S.phase === 'idle') return;
    const sim = game.sim;
    const holding = game.input.holdUse || ptrHold || game.input.keyHeld('Space') || game.input.keyHeld('KeyC');
    S.t += dt;
    if (game.modals.open && S.phase !== 'reel') {
      end(game);
      return;
    }
    switch (S.phase) {
      case 'charge':
        S.power = Math.min(1, S.t / 0.9);
        if (!holding || S.t > 1.6) release(game);
        break;
      case 'fly':
        if (S.t >= 0.35) {
          S.phase = 'wait';
          S.t = 0;
          S.waitT = biteDelay(sim, sim.rng(0xb17, Math.floor(sim.state.playSec)), S.bait);
          game.sfx('plop');
        }
        break;
      case 'wait':
        sim.paused = false;
        if (S.t >= S.waitT) {
          S.phase = 'bite';
          S.t = 0;
          S.biteT = 1.1 + Math.max(0, sim.p.tools.rod ?? 0) * 0.15;
          game.sfx('bite');
          game.shake(2);
        }
        break;
      case 'bite':
        if (S.t > S.biteT) end(game, 'Too slow — it swam away! Tap as soon as you see the "!"');
        break;
      case 'reel': {
        sim.paused = true;
        const r = S.reel!;
        r.update(dt, holding);
        updateUI();
        if (r.done) finish(game, r.done === 'caught');
        break;
      }
    }
  });
  HOOKS.onRender.push((game) => {
    if (S.phase === 'idle' || !bobber || !alert || !line) return;
    const p = game.sim.p;
    let bx = S.bx, by = S.by;
    if (S.phase === 'charge') {
      bobber.visible = false;
      alert.visible = true;
      alert.texture = game.atlas.tex('ui.white');
      alert.width = 3;
      alert.height = Math.max(1, Math.round(S.power * 14));
      alert.tint = S.power > 0.8 ? 0xd2434a : 0xf5b942;
      alert.x = Math.round(p.x) + 10;
      alert.y = Math.round(p.y) - 8;
      return;
    }
    alert.width = 8;
    alert.height = 12;
    alert.tint = 0xffffff;
    alert.texture = game.atlas.tex('fx.alert');
    if (S.phase === 'fly') {
      const t = Math.min(1, S.t / 0.35);
      bx = S.sx + (S.bx - S.sx) * t;
      by = S.sy + (S.by - S.sy) * t - Math.sin(t * Math.PI) * 18;
    } else if (S.phase === 'wait') by += Math.round(Math.sin(game.time * 3) * 1);
    else if (S.phase === 'bite' || S.phase === 'reel') by += Math.round(Math.sin(game.time * 20) * 2);
    bobber.visible = true;
    bobber.x = Math.round(bx);
    bobber.y = Math.round(by);
    alert.visible = S.phase === 'bite';
    alert.x = Math.round(p.x);
    alert.y = Math.round(p.y) - 34;
    // fishing line from rod tip to bobber
    const rx = p.x + DIR_DX[p.dir] * 8, ry = p.y - 22;
    const dx = bx - rx, dy = by - ry;
    line.visible = true;
    line.x = rx;
    line.y = ry;
    line.width = Math.max(1, Math.hypot(dx, dy));
    line.height = 1;
    line.rotation = Math.atan2(dy, dx);
  });
}

export function fishingActive(): boolean {
  return S.phase !== 'idle';
}
