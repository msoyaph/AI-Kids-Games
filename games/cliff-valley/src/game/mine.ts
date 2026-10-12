/** Client glue for the mine: critters, bonk stick, slingshot, ladders, elevator, fainting, smithy services. */
import { Container, Sprite, type Texture } from 'pixi.js';
import { DIR_DX, DIR_DY, TILE } from '../core/math';
import { bonk, combat, shoot } from '../sim/critters';
import { canDescend, elevatorFloors, enterFloor, layerOf, LAYER_NAMES, openMineChest, takeHeartstone } from '../sim/mine';
import { TUNING } from '../tuning';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { iconName, itemName } from '../ui/itemview';
import { HOOKS, type Game } from './game';

const SIGNS: Record<string, string> = {
  mine: 'Cliffside Mine. 40 floors deep! Bring snacks. Critters are bouncy, not mean. — Lumi',
  bridge: 'The old bridge to the quarry washed out in the storm. "Someday!" — Basil',
  quarryOpen: 'Old Quarry → Watch your step, and look for shiny stones!',
  quarry: 'Old Quarry. Rocks and gems pop up here every day.',
  mineLobby: 'Ladder: go down one floor at a time. Elevator: jump to any floor you have reached that ends in 5 or 0.',
};

class CritterView {
  layer: Container;
  private tex = new Map<string, Texture>();
  private t(g: Game, name: string): Texture {
    let t = this.tex.get(name);
    if (!t) {
      t = g.atlas.tex(name);
      this.tex.set(name, t);
    }
    return t;
  }
  private spr = new Map<number, Sprite>();
  private shots: Sprite[] = [];
  constructor(layer: Container) {
    this.layer = layer;
  }
  update(g: Game): void {
    const sim = g.sim;
    const cb = combat(sim);
    const inMine = sim.p.loc === 'mine';
    const seen = new Set<number>();
    if (inMine) {
      for (const c of cb.critters) {
        seen.add(c.id);
        let s = this.spr.get(c.id);
        if (!s) {
          s = new Sprite();
          s.anchor.set(0.5, 1);
          s.label = 'nocull';
          this.spr.set(c.id, s);
        }
        if (!s.parent) g.view.sorted.addChild(s);
        if (c.dead) {
          s.visible = false;
          continue;
        }
        s.visible = true;
        const f = c.kind === 'slime' ? (c.hopT > 0 ? 1 : Math.floor(g.time * 3 + c.id) % 3 === 0 ? 2 : 0) : Math.floor(g.time * 8 + c.id) % 2;
        s.texture = this.t(g, c.hidden ? 'cr.crab.' + c.layer + '.hidden' : 'cr.' + c.kind + '.' + c.layer + '.' + f);
        s.x = Math.round(c.x);
        s.y = Math.round(c.y) + (c.kind === 'bat' ? -6 - Math.round(Math.sin(g.time * 5 + c.id) * 2) : 2);
        s.zIndex = Math.round(c.y) + 2;
        s.tint = c.flash > 0 ? 0xffb0b0 : 0xffffff;
        s.alpha = c.flash > 0 ? 0.75 : 1;
        if (c.kind !== 'bat') s.scale.x = c.x > sim.p.x ? -1 : 1;
      }
    }
    for (const [id, s] of this.spr) if (!seen.has(id)) {
      s.removeFromParent();
      this.spr.delete(id);
    }
    // pebbles
    let i = 0;
    if (inMine)
      for (const sh of cb.shots) {
        if (!sh.active) continue;
        let s = this.shots[i];
        if (!s) {
          s = new Sprite(g.atlas.tex('fx.pebble'));
          s.anchor.set(0.5);
          s.label = 'nocull';
          this.shots.push(s);
        }
        if (!s.parent) g.view.sorted.addChild(s);
        s.visible = true;
        s.x = Math.round(sh.x);
        s.y = Math.round(sh.y);
        s.zIndex = sh.y + 10;
        i++;
      }
    for (; i < this.shots.length; i++) this.shots[i].visible = false;
    // events → effects
    for (const e of cb.events) {
      if (e.kind === 'poof') {
        g.fx.burst(g.atlas.tex('fx.spark'), e.x, e.y - 6, 10, { color: 0xfff5b8, speed: 60, up: 40, life: 0.7, gravity: 30 });
        g.fx.burst(g.atlas.tex('fx.ring'), e.x, e.y - 6, 1, { color: 0xffffff, speed: 0, up: 0, life: 0.4, gravity: 0 });
        g.sfx('poof');
      } else if (e.kind === 'hit') {
        g.fx.burst(g.atlas.tex('fx.dot'), e.x, e.y - 6, 4, { color: 0xffffff, speed: 50, up: 20, life: 0.3 });
        g.sfx('bonk');
      } else if (e.kind === 'hurt') {
        g.sfx('hurt');
        g.shake(4);
      } else if (e.kind === 'shoot') g.sfx('sling');
      else if (e.kind === 'reveal') g.sfx('crab');
    }
    cb.events.length = 0;
  }
  clear(): void {
    for (const s of this.spr.values()) s.removeFromParent();
    this.spr.clear();
    for (const s of this.shots) s.visible = false;
  }
}

let cv: CritterView | null = null;
let descending = false;

async function goFloor(g: Game, floor: number, text?: string): Promise<void> {
  if (descending) return;
  descending = true;
  g.inputBlocked = true;
  await g.fader.out(text ?? (floor === 0 ? 'Climbing up...' : `Floor ${floor}`), 350);
  enterFloor(g.sim, floor);
  g.enterLocation();
  if (floor > 0) {
    const L = layerOf(floor);
    if (floor % 10 === 1) g.toasts.show(`Welcome to the ${LAYER_NAMES[L]}!`, 'ui.star2');
  }
  await g.fader.in(350);
  g.inputBlocked = false;
  descending = false;
}

function swingBonk(g: Game): void {
  const sim = g.sim;
  if ((sim.p.tools.bonk ?? -1) < 0) return;
  const d = sim.p.dir;
  g.ctl.flashTool('bonk', 0.28);
  const hits = sim.p.loc === 'mine' ? bonk(sim, DIR_DX[d], DIR_DY[d]) : 0;
  if (!hits) g.sfx('swish');
}

function fireSling(g: Game): void {
  const sim = g.sim;
  let dx = DIR_DX[sim.p.dir], dy = DIR_DY[sim.p.dir];
  const ptr = g.input.pointer;
  if (ptr.active && g.input.lastDevice === 'mouse') {
    const w = g.screenToWorld(ptr.x, ptr.y);
    dx = w.x - sim.p.x;
    dy = w.y - (sim.p.y - 10);
  }
  g.ctl.flashTool('sling', 0.22);
  const r = shoot(sim, dx, dy);
  if (!r.ok && r.msg) g.toasts.show(r.msg);
}

function openElevator(g: Game): void {
  const sim = g.sim;
  let close = () => {};
  const list = h('div', { class: 'elev' });
  for (const f of elevatorFloors(sim)) {
    const b = h('button', { class: 'btn ' + (f.locked ? 'gray' : f.floor === 0 ? 'green' : ''), disabled: f.locked, title: f.locked ? 'The deep caves need the Mine Lift (Minerals board)' : '' }, f.floor === 0 ? '1' : String(f.floor));
    b.addEventListener('click', () => {
      close();
      void goFloor(g, Math.max(1, f.floor));
    });
    list.appendChild(b);
  }
  close = g.modals.show(
    h('div', null,
      h('h2', null, 'Mine Elevator'),
      h('p', null, `Deepest floor reached: ${sim.state.mine.deepest}.${sim.state.story.done.includes('minerals') ? '' : ' Floors below 20 need the Mine Lift fixed.'}`),
      list,
      h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => close() }, 'Stay here')),
    ),
    { cancel: () => {} },
  );
}

export function installMine(g: Game): void {
  const style = document.createElement('style');
  style.textContent = `.elev { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; } .elev .btn { font-size: 1.2em; }
.geode-reveal { text-align: center; } .geode-reveal .big { margin: 10px auto; } @keyframes pop { 0% { transform: scale(.2) rotate(-20deg); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } } .geode-reveal .big { animation: pop .5s ease-out; }`;
  document.head.appendChild(style);
  cv = new CritterView(g.view.sorted);
  HOOKS.onRender.push((game) => cv!.update(game));
  HOOKS.onAttach.push(() => cv?.clear());
  HOOKS.special.bonk = swingBonk;
  HOOKS.special.sling = fireSling;
  HOOKS.trigger.mineDown = (game) => void goFloor(game, 1);
  HOOKS.trigger.ladderUp = (game) => void goFloor(game, 0);
  HOOKS.trigger.elevator = (game) => openElevator(game);
  HOOKS.trigger.sign = (game, arg) => game.modals.ask('', SIGNS[arg ?? ''] ?? '...', [{ label: 'OK', primary: true }]);
  HOOKS.trigger.lumiTable = (game) => {
    const sim = game.sim;
    if ((sim.p.tools.bonk ?? -1) < 0) {
      sim.p.tools.bonk = 0;
      sim.give('tool.bonk', 1);
      game.modals.ask('A note from Lumi', '"For the new farmer! A Bonk Stick — soft and puffy. Cave critters just bounce away when you boop them. Have fun down there! — Lumi"', [{ label: 'Thanks, Lumi!', primary: true }]);
    } else game.toasts.show("Lumi's workbench is covered in gadget parts and doodles.");
  };
  HOOKS.inspect.push((game, o, x, y) => {
    const sim = game.sim;
    if (o.k === 'mineChest') {
      const got = openMineChest(sim, sim.here, x, y);
      game.sfx('chest');
      game.fx.burst(game.atlas.tex('fx.spark'), x * TILE + 8, y * TILE + 4, 12, { color: 0xffe080, speed: 60, up: 50, life: 0.8, gravity: 40 });
      game.modals.ask('Treasure chest!', h('div', null, ...got.map((id) => h('div', { style: 'display:flex;gap:8px;align-items:center' }, icon(iconName(id, sim.p.tools), 32), itemName(id, sim.p.tools)))), [{ label: 'Yay!', primary: true }]);
      return true;
    }
    if (o.k === 'heartstone') {
      takeHeartstone(sim, sim.here, x, y);
      game.sfx('fanfare');
      game.fx.burst(game.atlas.tex('fx.spark'), x * TILE + 8, y * TILE - 8, 30, { color: 0xffc6dc, speed: 80, up: 60, life: 1.2, gravity: 20 });
      game.modals.ask('The Heartstone!', 'A warm, glowing crystal sits in your hands. Tucked under it is a tiny note: "For whoever is brave and kind enough to find this — light up the Valley Hall. Love, Rosemary." Bring it to the crystal lamp in the Valley Hall!', [{ label: 'I will!', primary: true }], false);
      return true;
    }
    if (o.k === 'ladder') {
      descend(game);
      return true;
    }
    return false;
  });
  HOOKS.onUpdate.push((game) => {
    const sim = game.sim;
    if (sim.p.loc !== 'mine' || descending) return;
    const t = sim.playerTile();
    const o = sim.here.obj(t.x, t.y);
    if (o?.k === 'ladder') descend(game);
  });
  HOOKS.onAttach.push((game) => {
    game.sim.ev.on('faint', () => void faint(game));
  });
}

function descend(g: Game): void {
  const r = canDescend(g.sim);
  if (!r.ok) {
    if (!descending) g.toasts.show(r.msg ?? '');
    return;
  }
  void goFloor(g, g.sim.state.mine.floor + 1);
}

async function faint(g: Game): Promise<void> {
  if (descending) return;
  descending = true;
  g.inputBlocked = true;
  const sim = g.sim;
  await g.fader.out('Whoa... you feel woozy and sit down for a rest.', 900);
  sim.state.mine.floor = 0;
  sim.world.delete('mine');
  const bed = sim.loc('farmhouse').def.points.bed;
  sim.warpTo('farmhouse', bed.x, bed.y, 0);
  sim.p.hp = sim.p.maxHp;
  sim.advanceMinutes(Math.max(0, Math.min(120, TUNING.sleepyMin - 30 - sim.state.min)));
  sim.state.stats.faints++;
  g.enterLocation();
  await g.fader.in(700);
  g.inputBlocked = false;
  descending = false;
  g.modals.ask('Back home!', 'Lumi found you resting in the mine and helped you home. You feel much better! Nothing was lost. (Tip: eat a snack to heal while exploring.)', [{ label: 'OK', primary: true }]);
}

