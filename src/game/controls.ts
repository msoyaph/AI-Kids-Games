/** Touch (tap-to-move / tap-to-target, buttons, joystick) and gamepad glue. */
import { TILE, chebyshev, dirFromVec, type Dir } from '../core/math';
import { findPath } from '../core/pathfind';
import { GamepadInput } from '../input/gamepad';
import { TOUCH_CSS, createTouchUI, type TouchUI } from '../input/touch';
import { canInteract } from '../sim/actions';
import { npcs } from '../sim/npcs';
import { petRt } from '../sim/animals';
import { setIcon } from '../ui/icons';
import { iconName } from '../ui/itemview';
import { HOOKS, type Game } from './game';
import { talkTo } from './villagers';

let ui: TouchUI | null = null;
const pad = new GamepadInput();
let path: [number, number][] = [];
let arrive: { x: number; y: number; act: 'select' | 'interact' | 'talk'; npc?: string } | null = null;
let stuck = 0;
let lastPos = { x: 0, y: 0 };
let lastTap = { x: -1, y: -1, t: 0 };
let shownTool = '';

function tileAt(g: Game, cssX: number, cssY: number): { x: number; y: number; wx: number; wy: number } {
  const w = g.screenToWorld(cssX, cssY);
  return { x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE), wx: w.x, wy: w.y };
}

function faceTile(g: Game, x: number, y: number): void {
  const pt = g.sim.playerTile();
  if (x !== pt.x || y !== pt.y) g.sim.p.dir = dirFromVec(x - pt.x, y - pt.y, g.sim.p.dir) as Dir;
}

function planTo(g: Game, tx: number, ty: number, adjacent: boolean): boolean {
  const sim = g.sim, loc = sim.here;
  const pt = sim.playerTile();
  let best: [number, number][] | null = null;
  const goals: [number, number][] = adjacent ? [[tx, ty + 1], [tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx - 1, ty + 1], [tx + 1, ty + 1]] : [[tx, ty]];
  for (const [gx, gy] of goals) {
    if (!loc.inb(gx, gy) || (loc.blocked(gx, gy) && !(gx === tx && gy === ty && !adjacent))) continue;
    const p = findPath(loc, pt.x, pt.y, gx, gy, 4000);
    if (p && (!best || p.length < best.length)) best = p;
  }
  if (!best) return false;
  path = best;
  stuck = 0;
  return true;
}

function onTap(g: Game, cssX: number, cssY: number): void {
  if (g.mode !== 'play' || g.modals.open || g.inputBlocked) return;
  const sim = g.sim;
  const t = tileAt(g, cssX, cssY);
  // villager or animal under the finger?
  for (const rt of npcs(sim).list) {
    if (rt.loc !== sim.p.loc || rt.hidden) continue;
    if (Math.abs(t.wx - rt.x) < 10 && t.wy < rt.y + 4 && t.wy > rt.y - 28) {
      if (Math.hypot(rt.x - sim.p.x, rt.y - sim.p.y) < 30) talkTo(g, rt);
      else if (planTo(g, Math.floor(rt.x / TILE), Math.floor((rt.y - 2) / TILE), true)) arrive = { x: 0, y: 0, act: 'talk', npc: rt.id };
      return;
    }
  }
  if (HOOKS.pointerInteract.length) {
    const save = { ...g.input.pointer };
    g.input.pointer.x = cssX;
    g.input.pointer.y = cssY;
    g.input.pointer.active = true;
    const hit = HOOKS.pointerInteract.some((f) => f(g));
    Object.assign(g.input.pointer, save);
    if (hit) return;
  }
  const pt = sim.playerTile();
  const near = chebyshev(t.x, t.y, pt.x, pt.y) <= 1;
  const now = performance.now();
  if (near) {
    path = [];
    arrive = null;
    const again = lastTap.x === t.x && lastTap.y === t.y && now - lastTap.t < 1400;
    lastTap = { x: t.x, y: t.y, t: now };
    g.ctl.chosen = { x: t.x, y: t.y };
    faceTile(g, t.x, t.y);
    if (canInteract(sim, t.x, t.y)) {
      g.ctl.interact();
      return;
    }
    if (again) g.ctl.use();
    else g.sfx('tick');
    return;
  }
  lastTap = { x: t.x, y: t.y, t: now };
  const loc = sim.here;
  const interactive = canInteract(sim, t.x, t.y);
  const solid = loc.blocked(t.x, t.y) || !!loc.obj(t.x, t.y);
  if (planTo(g, t.x, t.y, solid || interactive)) {
    arrive = { x: t.x, y: t.y, act: interactive ? 'interact' : solid ? 'select' : 'select' };
    if (!solid && !interactive) arrive = null;
    g.ctl.chosen = null;
  } else g.toasts.show("You can't get there from here.");
}

function followPath(g: Game, dt: number): { x: number; y: number } | null {
  const sim = g.sim;
  if (!path.length) {
    if (arrive) {
      const a = arrive;
      arrive = null;
      if (a.act === 'talk' && a.npc) {
        const rt = npcs(sim).byId.get(a.npc);
        if (rt && rt.loc === sim.p.loc && Math.hypot(rt.x - sim.p.x, rt.y - sim.p.y) < 40) talkTo(g, rt);
      } else {
        g.ctl.chosen = { x: a.x, y: a.y };
        faceTile(g, a.x, a.y);
        if (a.act === 'interact') g.ctl.interact();
      }
    }
    return null;
  }
  const [nx, ny] = path[0];
  const tx = nx * TILE + 8, ty = ny * TILE + 13;
  const dx = tx - sim.p.x, dy = ty - sim.p.y;
  if (Math.hypot(dx, dy) < 2.5) {
    path.shift();
    return followPath(g, dt);
  }
  // stuck detection (something moved into the way)
  if (Math.hypot(sim.p.x - lastPos.x, sim.p.y - lastPos.y) < 0.2) stuck += dt;
  else stuck = 0;
  lastPos = { x: sim.p.x, y: sim.p.y };
  if (stuck > 0.6) {
    path = [];
    arrive = null;
    return null;
  }
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}

export function installControls(g: Game): void {
  const style = document.createElement('style');
  style.textContent = TOUCH_CSS;
  document.head.appendChild(style);
  ui = createTouchUI(g.uiRoot, g.input, (down) => {
    if (down) g.input.push('use');
  }, () => g.input.push('interact'));
  const canvas = g.host.app.canvas as HTMLCanvasElement;
  let start: { x: number; y: number; t: number; id: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    g.input.lastDevice = 'touch';
    start = { x: e.offsetX, y: e.offsetY, t: performance.now(), id: e.pointerId };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch' || !start || e.pointerId !== start.id) return;
    const moved = Math.hypot(e.offsetX - start.x, e.offsetY - start.y);
    if (moved < 24 && performance.now() - start.t < 600) onTap(g, e.offsetX, e.offsetY);
    start = null;
  });
  HOOKS.autoMove = (game, dt) => {
    if (game.input.holdKeys || game.input.stick.x || game.input.stick.y || game.input.pad.x || game.input.pad.y) {
      path = [];
      arrive = null;
      return null;
    }
    return followPath(game, dt);
  };
  HOOKS.onEnter.push(() => {
    path = [];
    arrive = null;
  });
  HOOKS.onUpdate.push((game, dt) => {
    pad.poll(game.input, dt, game.modals.open, () => game.modals.cancelTop());
    if (pad.aim.active && (pad.aim.x || pad.aim.y)) {
      const pt = game.sim.playerTile();
      game.ctl.chosen = { x: pt.x + pad.aim.x, y: pt.y + pad.aim.y };
      faceTile(game, game.ctl.chosen.x, game.ctl.chosen.y);
    } else if (game.input.lastDevice === 'gamepad' || game.input.lastDevice === 'keyboard') {
      if (game.input.moveX || game.input.moveY) game.ctl.chosen = null;
    }
    // touch UI
    const touchy = game.input.lastDevice === 'touch' || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
    if (ui) {
      const show = touchy && game.mode === 'play';
      ui.root.classList.toggle('on', show);
      ui.root.classList.toggle('lefty', game.settings.leftHanded);
      ui.stick.classList.toggle('on', game.settings.joystick);
      const s = game.sim.p.inv[game.sim.p.sel];
      const ic = s ? iconName(s.id, game.sim.p.tools) : 'ui.hand';
      if (ic !== shownTool) {
        shownTool = ic;
        ui.toolIcon.className = 'ico';
        setIcon(ui.toolIcon, ic, 48);
      }
      if (!ui.handBtn.firstChild) {
        const h = document.createElement('span');
        h.className = 'ico';
        setIcon(h, 'ui.hand', 32);
        ui.handBtn.appendChild(h);
      }
    }
    // keep the pet around for pet taps (no-op guard)
    void petRt;
  });
}
