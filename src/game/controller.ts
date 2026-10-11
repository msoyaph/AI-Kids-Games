/**
 * Player action controller: target-tile selection (mouse / facing / touch), clear tile
 * highlighting, tool swing animation timing, and dispatching sim actions + effects.
 */
import { Container, Sprite } from 'pixi.js';
import { DIR_DX, DIR_DY, TILE, chebyshev, dirFromVec, type Dir } from '../core/math';
import { isTool, toolKind, tryItem, type ToolKind } from '../data/items';
import { eat, interactAt, useSelected, type InteractOutcome, type UseOutcome } from '../sim/actions';
import { toolArea } from '../sim/tools';
import { HOOKS, type Game } from './game';

export class Controller {
  private g: Game;
  readonly layer = new Container();
  private marks: Sprite[] = [];
  target: { x: number; y: number } | null = null;
  /** explicitly chosen tile (touch tap / gamepad cursor) */
  chosen: { x: number; y: number } | null = null;
  private busy = 0;
  private swing = 0;
  private swingTotal = 0;
  private pending: (() => void) | null = null;
  readonly tool = new Sprite();
  private toolKind: ToolKind | null = null;
  /** true while the animation pose is active (frame 3) */
  pose = false;

  constructor(g: Game) {
    this.g = g;
    this.tool.anchor.set(0.5, 0.9);
    this.tool.visible = false;
    this.tool.label = 'nocull';
  }

  get locked(): boolean {
    return this.busy > 0;
  }

  /** Recompute the target tile from pointer / facing. */
  updateTarget(): void {
    const g = this.g, sim = g.sim;
    const pt = sim.playerTile();
    let t: { x: number; y: number } | null = null;
    const ptr = g.input.pointer;
    if (this.chosen && chebyshev(this.chosen.x, this.chosen.y, pt.x, pt.y) <= 1) t = this.chosen;
    else if (ptr.active && ptr.kind === 'mouse' && g.input.lastDevice === 'mouse') {
      const w = g.screenToWorld(ptr.x, ptr.y);
      const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
      if (chebyshev(tx, ty, pt.x, pt.y) <= 1 && !(tx === pt.x && ty === pt.y && this.usesFacing())) t = { x: tx, y: ty };
    }
    if (!t) t = sim.facingTile();
    this.target = t;
  }

  /** Items like seeds can target the tile you stand on; tools always face outward. */
  private usesFacing(): boolean {
    const s = this.g.sim.p.inv[this.g.sim.p.sel];
    return !!s && isTool(s.id);
  }

  private faceTarget(): void {
    const sim = this.g.sim, t = this.target;
    if (!t) return;
    const pt = sim.playerTile();
    const dx = t.x - pt.x, dy = t.y - pt.y;
    if (dx || dy) sim.p.dir = dirFromVec(dx, dy, sim.p.dir) as Dir;
  }

  /** Highlight tiles that the selected item will affect. */
  drawHighlights(): void {
    const g = this.g, sim = g.sim;
    for (const m of this.marks) m.visible = false;
    if (g.mode !== 'play' || !this.target || g.modals.open) return;
    const s = sim.p.inv[sim.p.sel];
    let tiles: [number, number][] = [[this.target.x, this.target.y]];
    if (s && isTool(s.id)) {
      const k = toolKind(s.id);
      if (k === 'rod' || k === 'bonk' || k === 'sling') return;
      const pt = sim.playerTile();
      const dir = (this.target.x !== pt.x || this.target.y !== pt.y ? dirFromVec(this.target.x - pt.x, this.target.y - pt.y, sim.p.dir) : sim.p.dir) as Dir;
      tiles = toolArea(k, Math.max(0, sim.p.tools[k] ?? 0), this.target.x, this.target.y, dir);
    }
    const loc = sim.here;
    for (let i = 0; i < tiles.length; i++) {
      const [x, y] = tiles[i];
      if (!loc.inb(x, y)) continue;
      let m = this.marks[i];
      if (!m) {
        m = new Sprite(g.atlas.tex('ui.cursor'));
        this.marks.push(m);
        this.layer.addChild(m);
      }
      m.visible = true;
      m.x = x * TILE;
      m.y = y * TILE;
      m.alpha = i === 0 ? 1 : 0.65;
      m.tint = i === 0 ? 0xffffff : 0xfff0a0;
    }
  }

  /** "Use" (tool / item) on the target. */
  use(atPointer = false): void {
    const g = this.g, sim = g.sim;
    if (this.locked) return;
    if (atPointer && g.input.lastDevice === 'mouse' && (g.pointerTalk() || HOOKS.pointerInteract.some((f) => f(g)))) return;
    this.updateTarget();
    if (!this.target) return;
    const s = sim.p.inv[sim.p.sel];
    if (!s) {
      this.interact();
      return;
    }
    this.faceTarget();
    const { x, y } = this.target;
    if (isTool(s.id)) {
      const k = toolKind(s.id);
      if (k === 'rod' || k === 'bonk' || k === 'sling') {
        g.useSpecialTool(k);
        return;
      }
      if (sim.p.energy <= 0 && k !== 'scythe') {
        sim.ev.emit('tired', { energy: 0 });
        this.busy = 0.3;
        return;
      }
      this.startSwing(k, 0.32, 0.13, () => this.apply(useSelected(sim, x, y), x, y));
      return;
    }
    const d = tryItem(s.id);
    if (d?.energy && !d.place && d.cat !== 'seed') {
      this.askEat(s.id);
      return;
    }
    const out = useSelected(sim, x, y);
    this.busy = 0.15;
    this.apply(out, x, y);
  }

  askEat(id: string): void {
    const g = this.g, d = tryItem(id);
    if (!d) return;
    g.modals.ask(`Eat ${d.name}?`, `Restores ${d.energy} energy.${d.buff ? ' Gives a little boost too!' : ''}`, [
      { label: 'No thanks', cls: 'gray' },
      {
        label: 'Eat',
        cls: 'green',
        primary: true,
        onClick: () => {
          if (eat(g.sim, id)) {
            g.sfx('eat');
            g.toasts.pickup(`item.${id}`, `+${d.energy} energy`);
          }
        },
      },
    ]);
  }

  private startSwing(k: ToolKind, total: number, impact: number, fn: () => void): void {
    this.busy = total;
    this.swing = 0;
    this.swingTotal = total;
    this.toolKind = k;
    this.pending = fn;
    this.impactAt = impact;
    this.tool.texture = this.g.atlas.tex(`item.tool.${k}.${Math.max(0, this.g.sim.p.tools[k] ?? 0)}`);
    this.tool.visible = true;
    this.pose = true;
  }
  private impactAt = 0;

  private apply(out: UseOutcome, x: number, y: number): void {
    const g = this.g;
    const cx = x * TILE + 8, cy = y * TILE + 8;
    if (out.type === 'tool') {
      if (out.msg && out.msg !== 'refill') g.toasts.show(out.msg);
      if (out.msg === 'refill') {
        g.toasts.pickup('item.tool.can.0', 'Watering can filled!');
        g.sfx('refill');
        g.fx.burst(g.atlas.tex('fx.dot'), cx, cy, 8, { color: 0x8fd0ff, speed: 40, up: 40 });
        return;
      }
      if (out.anim === 'water') {
        for (const [tx, ty] of out.tiles) g.fx.burst(g.atlas.tex('fx.dot'), tx * TILE + 8, ty * TILE + 8, 4, { color: 0x6fb3f0, speed: 25, up: 20, life: 0.4 });
        g.sfx(out.ok ? 'water' : 'miss');
      } else if (out.anim === 'dig') {
        if (out.ok) for (const [tx, ty] of out.tiles) g.fx.burst(g.atlas.tex('fx.dot'), tx * TILE + 8, ty * TILE + 10, 3, { color: 0x6b4a32, speed: 30, up: 30, life: 0.4 });
        g.sfx(out.ok ? 'dig' : 'miss');
      } else if (out.anim === 'swing') {
        const kind = this.toolKind;
        const col = kind === 'pick' ? 0x9a98a8 : kind === 'axe' ? 0xb7844f : 0x86c25a;
        if (out.ok) g.fx.burst(g.atlas.tex('fx.dot'), cx, cy, 5, { color: col, speed: 45, up: 35, life: 0.5 });
        g.sfx(out.ok ? (kind === 'pick' ? 'pick' : kind === 'axe' ? 'chop' : 'cut') : 'miss');
      }
    } else if (out.type === 'plant' || out.type === 'fertilize' || out.type === 'place') {
      if (out.ok) {
        g.sfx(out.type === 'place' ? 'place' : 'plant');
        g.fx.burst(g.atlas.tex('fx.dot'), cx, cy + 3, 3, { color: 0x86c25a, speed: 15, up: 15, life: 0.35 });
      } else if (out.msg) g.toasts.show(out.msg);
    } else if (out.type === 'eat') {
      this.askEat(out.id);
    } else if (out.type === 'none' && out.msg) g.toasts.show(out.msg);
  }

  /** Interact (hand) with the target tile. */
  interact(): void {
    const g = this.g, sim = g.sim;
    if (this.locked) return;
    this.updateTarget();
    const tries: { x: number; y: number }[] = [];
    if (this.target) tries.push(this.target);
    tries.push(sim.facingTile(), sim.playerTile());
    for (const t of tries) {
      const r = interactAt(sim, t.x, t.y);
      if (r.type !== 'none') {
        if (r.type !== 'object') {
          this.target = t;
          this.faceTarget();
        }
        this.busy = 0.18;
        this.handleInteract(r, t.x, t.y);
        return;
      }
    }
    // talk to NPCs / animals etc. is handled by game-level hooks
    g.interactNearby();
  }

  private handleInteract(r: InteractOutcome, x: number, y: number): void {
    const g = this.g;
    if (r.type === 'harvest' || r.type === 'fruit' || r.type === 'collect' || r.type === 'forage') {
      g.sfx('pop');
      g.fx.burst(g.atlas.tex('fx.spark'), x * TILE + 8, y * TILE + 4, 4, { color: 0xfff5b8, speed: 30, up: 30, life: 0.5, gravity: 40 });
    } else if (r.type === 'trigger') g.runTrigger(r.action, r.arg);
    else if (r.type === 'chest') g.openChest(x, y);
    else if (r.type === 'object') g.inspectObject(r.o, r.x, r.y);
  }

  update(dt: number): void {
    if (this.busy > 0) this.busy -= dt;
    if (this.toolKind) {
      this.swing += dt;
      if (this.pending && this.swing >= this.impactAt) {
        const f = this.pending;
        this.pending = null;
        f();
      }
      if (this.swing >= this.swingTotal) {
        this.toolKind = null;
        this.tool.visible = false;
        this.pose = false;
        if (this.g.input.holdUse && this.g.mode === 'play' && !this.g.modals.open) {
          this.busy = 0;
          this.use(this.g.input.lastDevice === 'mouse');
        }
      }
    }
    this.positionTool();
  }

  private positionTool(): void {
    if (!this.toolKind) return;
    const p = this.g.sim.p;
    const t = Math.min(1, this.swing / this.swingTotal);
    const dir = p.dir;
    const px = Math.round(p.x), py = Math.round(p.y);
    const dx = DIR_DX[dir], dy = DIR_DY[dir];
    const phase = t < this.impactAt / this.swingTotal ? 0 : 1;
    this.pose = phase === 0;
    if (this.toolKind === 'can') {
      this.tool.x = px + dx * 10;
      this.tool.y = py - 8 + dy * 6;
      this.tool.rotation = (dir === 1 ? -1 : 1) * (phase ? 0.6 : 0.2);
      this.tool.scale.x = dir === 1 ? -1 : 1;
    } else {
      const a0 = -1.6, a1 = 0.6;
      const a = phase === 0 ? a0 + (a1 - a0) * (t * 0.4) : a1;
      if (dir === 0 || dir === 3) {
        this.tool.x = px + 4;
        this.tool.y = py - 10 + (dir === 0 ? (phase ? 8 : -6) : phase ? -2 : -10);
        this.tool.rotation = dir === 0 ? (phase ? 2.6 : -0.3) : phase ? -0.3 : 0.5;
        this.tool.scale.x = 1;
      } else {
        this.tool.x = px + dx * (phase ? 10 : 2);
        this.tool.y = py - (phase ? 6 : 18);
        this.tool.rotation = dx * (phase ? 1.8 : a);
        this.tool.scale.x = dx < 0 ? -1 : 1;
      }
    }
    this.tool.zIndex = p.y + (p.dir === 3 ? -2 : 2);
  }
}
