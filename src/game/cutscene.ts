/**
 * Cutscene runner: stages actors around a named spot, then plays say/move/face/emote/
 * wait/choice steps. The clock is paused and the player can't walk during scenes.
 */
import { Sprite } from 'pixi.js';
import { TILE, type Dir } from '../core/math';
import { nearestOpen } from '../core/pathfind';
import type { CutsceneDef } from '../data/story-types';
import { VILLAGER } from '../data/villagers';
import { petRt } from '../sim/animals';
import { addPoints, fill } from '../sim/friendship';
import { npcs, type NpcRt } from '../sim/npcs';
import { showDialogue } from '../ui/dialogue';
import { HOOKS, type Game } from './game';

interface Tween {
  obj: { x: number; y: number };
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  done: () => void;
}

const tweens: Tween[] = [];
let playerEmote: Sprite | null = null;
let playerEmoteUntil = 0;
export let cutsceneActive = false;

export function installCutscenes(_g: Game): void {
  playerEmote = new Sprite();
  playerEmote.anchor.set(0.5, 1);
  playerEmote.visible = false;
  playerEmote.label = 'nocull';
  HOOKS.onEnter.push((game) => game.view.sorted.addChild(playerEmote!));
  HOOKS.onUpdate.push((_game, dt) => stepTweens(dt));
  HOOKS.onRender.push((game) => {
    if (!playerEmote) return;
    if (playerEmoteUntil > game.time) {
      playerEmote.visible = true;
      playerEmote.x = Math.round(game.sim.p.x);
      playerEmote.y = Math.round(game.sim.p.y) - 31 - Math.round(Math.abs(Math.sin(game.time * 4)) * 2);
      playerEmote.zIndex = 100000;
    } else playerEmote.visible = false;
  });
}

function stepTweens(dt: number): void {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    t.t += dt;
    const k = Math.min(1, t.t / t.dur);
    t.obj.x = t.fx + (t.tx - t.fx) * k;
    t.obj.y = t.fy + (t.ty - t.fy) * k;
    if (k >= 1) {
      tweens.splice(i, 1);
      t.done();
    }
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function emotePlayer(g: Game, kind: string, secs = 1.6): void {
  if (!playerEmote) return;
  playerEmote.texture = g.atlas.tex(`emote.${kind}`);
  playerEmoteUntil = g.time + secs;
}

function say(g: Game, who: string, text: string, buttons?: { label: string; cls?: string; value: number }[]): Promise<number> {
  return new Promise((resolve) => {
    const v = VILLAGER[who];
    const isPlayer = who === 'player';
    let picked = -1;
    showDialogue(g.modals, {
      name: isPlayer ? g.sim.p.name : v?.name ?? who,
      face: isPlayer ? undefined : who,
      text: fill(g.sim, text),
      speak: g.settings.readAloud,
      pitch: v?.pitch ?? 1,
      instant: g.settings.reducedMotion,
      buttons: (buttons ?? [{ label: 'Next', cls: 'green', value: 0 }]).map((b) => ({ label: b.label, cls: b.cls, onClick: () => { picked = b.value; } })),
      onClose: () => resolve(picked < 0 ? 0 : picked),
    });
  });
}

/** Play a cutscene. Returns friendship points earned from choices. */
export async function playCutscene(g: Game, def: CutsceneDef): Promise<number> {
  if (cutsceneActive) return 0;
  cutsceneActive = true;
  const sim = g.sim;
  g.inputBlocked = true;
  g.holdClock = true;
  g.modals.closeAll();
  sim.paused = true;
  await g.fader.out('', 350);
  if (sim.p.loc !== def.at) {
    const p0 = sim.loc(def.at).def.points[def.spot] ?? { x: 5, y: 5 };
    sim.warpTo(def.at, p0.x, p0.y + 1, 3);
    g.enterLocation();
  }
  const loc = sim.here;
  const spot = loc.def.points[def.spot] ?? { x: Math.floor(loc.w / 2), y: Math.floor(loc.h / 2) };
  const held: NpcRt[] = [];
  const bodies = new Map<string, { x: number; y: number; dir: number }>();
  const used = new Set<string>();
  for (const a of def.actors) {
    let [tx, ty] = nearestOpen(loc, spot.x + a.pos[0], spot.y + a.pos[1]);
    // avoid stacking actors on one tile
    for (let k = 0; used.has(`${tx},${ty}`) && k < 6; k++) [tx, ty] = nearestOpen(loc, tx + (k % 2 ? 1 : -1), ty + (k > 2 ? 1 : 0));
    used.add(`${tx},${ty}`);
    const px = tx * TILE + TILE / 2, py = ty * TILE + TILE - 2;
    if (a.id === 'player') {
      sim.p.x = px;
      sim.p.y = py;
      sim.p.dir = a.dir;
      bodies.set('player', sim.p);
    } else if (a.id === 'pet') {
      const pr = petRt(sim);
      pr.loc = def.at;
      pr.x = px;
      pr.y = py;
      bodies.set('pet', pr);
    } else {
      const rt = npcs(sim).byId.get(a.id);
      if (!rt) continue;
      rt.hold = true;
      rt.hidden = false;
      rt.loc = def.at;
      rt.x = px;
      rt.y = py;
      rt.dir = a.dir;
      rt.route = null;
      rt.moving = false;
      held.push(rt);
      bodies.set(a.id, rt);
    }
  }
  g.camTarget = { x: spot.x * TILE + 8, y: spot.y * TILE };
  g.snapCamera();
  g.cam.x = g.camTarget.x;
  g.cam.y = g.camTarget.y;
  await g.fader.in(350);
  let pts = 0;
  const emote = (who: string, kind: string) => {
    if (who === 'player') emotePlayer(g, kind);
    else {
      const rt = npcs(sim).byId.get(who);
      if (rt) rt.emote = { kind, until: g.time + 1.8 };
    }
  };
  for (const step of def.steps) {
    if ('say' in step) {
      if (step.emote) emote(step.who, step.emote);
      await say(g, step.who, step.say);
    } else if ('move' in step) {
      const b = bodies.get(step.move);
      if (!b) continue;
      const tx = b.x + step.by[0] * TILE, ty = b.y + step.by[1] * TILE;
      if ('dir' in b) b.dir = (Math.abs(step.by[0]) > Math.abs(step.by[1]) ? (step.by[0] < 0 ? 1 : 2) : step.by[1] < 0 ? 3 : 0) as Dir;
      const rt = held.find((r) => r.id === step.move);
      if (rt) rt.moving = true;
      if (step.move === 'player') sim.moving = true;
      await new Promise<void>((done) => tweens.push({ obj: b, fx: b.x, fy: b.y, tx, ty, t: 0, dur: Math.max(0.25, Math.hypot(step.by[0], step.by[1]) * 0.32), done }));
      if (rt) rt.moving = false;
      sim.moving = false;
    } else if ('face' in step) {
      const b = bodies.get(step.face);
      if (b) b.dir = step.dir;
    } else if ('emote' in step) {
      emote(step.who, step.emote);
      await sleep(700);
    } else if ('wait' in step) {
      await sleep(step.wait * 1000);
    } else if ('choice' in step) {
      const opts = step.options;
      const pick = await say(g, step.who, step.choice, opts.map((o, i) => ({ label: o.text, cls: i === 0 ? 'green' : 'blue', value: i })));
      const o = opts[pick] ?? opts[0];
      pts += o.pts ?? 0;
      await say(g, step.who, o.reply);
    }
  }
  await g.fader.out('', 350);
  for (const rt of held) {
    rt.hold = false;
    rt.emote = null;
  }
  g.camTarget = null;
  g.snapCamera();
  if (def.npc && pts) addPoints(sim, def.npc, pts);
  await g.fader.in(350);
  g.holdClock = false;
  sim.paused = g.modals.open;
  g.inputBlocked = false;
  cutsceneActive = false;
  return pts;
}
