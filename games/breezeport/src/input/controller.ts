// Adapted from games/fieldlark/src/input/controller.ts (the shared engine): the same camera moves,
// keys and gamepad cursor; a tool may claim a drag (draw a road, paint a zone rectangle) and gets
// every tile the finger crosses, then the tile where it lifts. Taps carry the picked thing's id.
/**
 * Turns gestures, keys and gamepads into camera moves and tile taps.
 * - Touch: tap, one-finger drag to pan (or to draw a road or paint zones when a tool wants it), pinch to zoom,
 *   two-finger twist to turn 45°.
 * - Mouse and keyboard: click, drag, wheel to zoom at the cursor, WASD or arrows to pan, Q and E to
 *   turn, + and − to zoom.
 * - Gamepad: a tile cursor on the left stick or d-pad (the camera follows it), the right stick pans,
 *   triggers zoom, bumpers turn, A taps the cursor's tile.
 */
import { rayToPlane, screenToMap, ZOOM } from '../render/camera';
import type { CityView } from '../render/view';
import { H, W } from '../sim/map';
import { listenGestures } from './gestures';
import { Pads, Repeater, type PadState } from './gamepad';
import type { Picked, TileRef } from './pick';

export interface ControllerHooks {
  /** A tile was tapped (or picked with gamepad A / Enter on the cursor). */
  tapTile(tile: Picked, screen: { x: number; y: number }, via: 'touch' | 'mouse' | 'pad' | 'key'): void;
  /** A drag that starts here belongs to the tool (a road, a zone rectangle) instead of panning. */
  wantsPaint?(tile: TileRef): boolean;
  paintTile?(tile: TileRef): void;
  paintEnd?(): void;
  /** Keys and pad buttons the town itself doesn't use (menus, shortcuts). */
  command(name: 'menu' | 'back' | 'tools' | 'maps' | 'undo' | 'rotatePiece' | `tool${number}`): void;
  /** False while a menu or dialogue has the controls. */
  active(): boolean;
  reducedMotion(): boolean;
}

export class Controller {
  readonly pads = new Pads();
  /** The gamepad's tile cursor (null until a pad is used). */
  cursor: TileRef | null = null;
  hover: TileRef | null = null;
  lastDevice: 'touch' | 'mouse' | 'pad' | 'key' = 'mouse';
  private keys = new Set<string>();
  private painting = false;
  private lastPaint = '';
  private dragLast: { x: number; y: number } | null = null;
  private pinchMid: { x: number; y: number } | null = null;
  private pinchAt = 0;
  private stepRepeat = new Repeater();
  private stopGestures: () => void;

  constructor(canvas: HTMLElement, private view: CityView, private hooks: ControllerHooks) {
    this.stopGestures = listenGestures(canvas, {
      tap: (x, y, type) => {
        if (!hooks.active()) return;
        this.lastDevice = type === 'mouse' ? 'mouse' : 'touch';
        const tile = view.pick(x, y);
        if (tile) hooks.tapTile(tile, { x, y }, this.lastDevice);
      },
      dragStart: (x, y, type) => {
        if (!hooks.active()) return;
        this.lastDevice = type === 'mouse' ? 'mouse' : 'touch';
        const tile = view.pick(x, y);
        this.painting = !!(tile && hooks.wantsPaint?.({ x: tile.x, z: tile.z }));
        this.lastPaint = '';
        this.dragLast = { x, y };
        if (this.painting && tile) this.paint(tile);
      },
      dragMove: (x, y) => {
        if (!hooks.active() || !this.dragLast) return;
        if (this.painting) {
          const tile = view.pick(x, y);
          if (tile) this.paint(tile);
        } else this.panBy(this.dragLast.x, this.dragLast.y, x, y);
        this.dragLast = { x, y };
      },
      dragEnd: () => {
        if (this.painting) hooks.paintEnd?.();
        this.painting = false;
        this.dragLast = null;
      },
      pinch: (scale, cx, cy) => {
        if (!hooks.active()) return;
        this.lastDevice = 'touch';
        const now = performance.now();
        if (!this.pinchMid || now - this.pinchAt > 150) this.pinchMid = { x: cx, y: cy };
        this.pinchAt = now;
        this.panBy(this.pinchMid.x, this.pinchMid.y, cx, cy);
        this.pinchMid = { x: cx, y: cy };
        this.zoomAt(view.goal.zoom * scale, cx, cy);
      },
      twist: dir => { if (hooks.active()) this.turn(dir); },
      wheel: (dy, x, y) => {
        if (!hooks.active()) return;
        this.lastDevice = 'mouse';
        // the wheel glides (the ground under the cursor stays put); pinches follow the fingers exactly
        view.zoomGoalAt(view.goal.zoom * Math.exp(-dy * 0.0016), x, y);
      },
      hover: (x, y) => {
        if (!hooks.active()) { this.hover = null; return; }
        this.lastDevice = 'mouse';
        this.hover = view.pick(x, y);
      },
    });
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);
  }

  dispose() {
    this.stopGestures();
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
  }

  /** Turn the view one 45° step (+1 turns the town clockwise on screen). */
  turn(dir: number) {
    this.view.goal.yawStep = (((this.view.goal.yawStep + dir) % 8) + 8) % 8;
  }

  /** Zoom to `zoom`, keeping the ground under (sx, sy) where it is on screen. */
  zoomAt(zoom: number, sx: number, sy: number) {
    const v = this.view;
    const before = rayToPlane(v.ray(sx, sy), 0);
    v.goal.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, zoom));
    v.snapToGoal();
    const after = rayToPlane(v.ray(sx, sy), 0);
    if (before && after) { v.goal.x += before.x - after.x; v.goal.z += before.z - after.z; }
    this.clampGoal();
    v.snapToGoal();
  }

  /** Moves the map so the ground under (x0, y0) ends up under (x1, y1). */
  panBy(x0: number, y0: number, x1: number, y1: number) {
    const v = this.view;
    const a = rayToPlane(v.ray(x0, y0), 0), b = rayToPlane(v.ray(x1, y1), 0);
    if (!a || !b) return;
    v.goal.x += a.x - b.x;
    v.goal.z += a.z - b.z;
    this.clampGoal();
    v.snapToGoal();
  }

  /** Brings a tile to the middle of the open area. */
  focus(tile: TileRef) {
    this.view.goal.x = tile.x + 0.5;
    this.view.goal.z = tile.z + 0.5;
  }

  private clampGoal() {
    const g = this.view.goal;
    g.x = Math.min(W, Math.max(0, g.x));
    g.z = Math.min(H, Math.max(0, g.z));
  }

  /** Is the pointer in a tool's drag right now? */
  get dragging() { return this.painting; }

  private paint(tile: TileRef) {
    const key = `${tile.x},${tile.z}`;
    if (key === this.lastPaint) return;
    this.lastPaint = key;
    this.hooks.paintTile?.(tile);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.hooks.active()) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    this.keys.add(e.code);
    this.lastDevice = 'key';
    const cmd = this.hooks.command;
    // some keyboards (and test tools) only say which character, not which key
    if (e.key === '+' || e.key === '=') { this.view.goal.zoom = Math.min(ZOOM.max, this.view.goal.zoom * 1.25); return; }
    if (e.key === '-' || e.key === '_') { this.view.goal.zoom = Math.max(ZOOM.min, this.view.goal.zoom / 1.25); return; }
    switch (e.code) {
      case 'KeyQ': this.turn(-1); break;
      case 'KeyE': this.turn(1); break;
      case 'Equal': case 'NumpadAdd': this.view.goal.zoom = Math.min(ZOOM.max, this.view.goal.zoom * 1.25); break;
      case 'Minus': case 'NumpadSubtract': this.view.goal.zoom = Math.max(ZOOM.min, this.view.goal.zoom / 1.25); break;
      case 'Escape': cmd('menu'); break;
      case 'KeyM': cmd('maps'); break;
      case 'KeyR': cmd('rotatePiece'); break;
      case 'KeyT': cmd('tools'); break;
      case 'KeyZ': if (e.ctrlKey || e.metaKey) { e.preventDefault(); cmd('undo'); } break;
      case 'Enter': case 'Space':
        if (this.cursor) { e.preventDefault(); const s = this.view.tileOnScreen(this.cursor.x, this.cursor.z); this.hooks.tapTile(this.cursor, s, 'key'); }
        break;
      default: {
        const digit = /^Digit([1-9])$/.exec(e.code);
        if (digit) cmd(`tool${Number(digit[1])}`);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  private onBlur = () => { this.keys.clear(); };

  /** Called once a frame: held keys pan, the gamepad moves the cursor and the camera. */
  update(dt: number) {
    const pad = this.pads.poll();
    if (!this.hooks.active()) { this.keys.clear(); return pad; }
    const v = this.view;
    // keyboard panning, at a steady speed on screen whatever the zoom
    const right = (this.has('KeyD', 'ArrowRight') ? 1 : 0) - (this.has('KeyA', 'ArrowLeft') ? 1 : 0);
    const up = (this.has('KeyW', 'ArrowUp') ? 1 : 0) - (this.has('KeyS', 'ArrowDown') ? 1 : 0);
    if (right || up) {
      const speed = (560 / v.goal.zoom) * dt;
      const [mx, mz] = screenToMap(v.view.yaw, right, up);
      v.goal.x += mx * speed;
      v.goal.z += mz * speed;
      this.clampGoal();
    }
    if (pad) this.updatePad(pad, dt);
    return pad;
  }

  private has(...codes: string[]) { return codes.some(c => this.keys.has(c)); }

  private updatePad(p: PadState, dt: number) {
    const v = this.view;
    const used = p.pressed.size > 0 || p.lx !== 0 || p.ly !== 0 || p.rx !== 0 || p.ry !== 0 || p.lt > 0.1 || p.rt > 0.1;
    if (used) this.lastDevice = 'pad';
    if (!this.cursor && used) this.cursor = { x: Math.floor(v.goal.x), z: Math.floor(v.goal.z) };
    if (p.pressed.has('lb')) this.turn(-1);
    if (p.pressed.has('rb')) this.turn(1);
    if (p.pressed.has('start')) this.hooks.command('menu');
    if (p.pressed.has('b')) this.hooks.command('back');
    if (p.pressed.has('x')) this.hooks.command('tools');
    if (p.pressed.has('y')) this.hooks.command('maps');
    if (p.lt > 0.05 || p.rt > 0.05) v.goal.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, v.goal.zoom * Math.exp((p.rt - p.lt) * dt * 1.6)));
    // right stick: pan
    if (p.rx || p.ry) {
      const speed = (620 / v.goal.zoom) * dt;
      const [mx, mz] = screenToMap(v.view.yaw, p.rx, -p.ry);
      v.goal.x += mx * speed;
      v.goal.z += mz * speed;
      this.clampGoal();
    }
    // left stick or d-pad: step the cursor across tiles, in screen directions
    const sx = p.lx + (p.held.has('right') ? 1 : 0) - (p.held.has('left') ? 1 : 0);
    const sy = -p.ly + (p.held.has('up') ? 1 : 0) - (p.held.has('down') ? 1 : 0);
    const len = Math.hypot(sx, sy);
    if (this.cursor && this.stepRepeat.update(len > 0.35, dt)) {
      const [mx, mz] = screenToMap(v.view.yaw, sx / len, sy / len);
      const step = (c: number) => (c > 0.38 ? 1 : c < -0.38 ? -1 : 0);
      this.cursor = { x: Math.min(W - 1, Math.max(0, this.cursor.x + step(mx))), z: Math.min(H - 1, Math.max(0, this.cursor.z + step(mz))) };
      this.keepInView(this.cursor);
    }
    if (this.cursor && p.pressed.has('a')) {
      const s = v.tileOnScreen(this.cursor.x, this.cursor.z);
      this.hooks.tapTile(this.cursor, s, 'pad');
    }
  }

  /** When the cursor nears the edge of the open area, the camera follows it. */
  private keepInView(tile: TileRef) {
    const v = this.view;
    const s = v.tileOnScreen(tile.x, tile.z), c = v.openCenter();
    const halfW = v.width * 0.3, halfH = (v.height - 160) * 0.3;
    if (Math.abs(s.x - c.x) > halfW || Math.abs(s.y - c.y) > Math.max(60, halfH)) this.focus(tile);
  }
}
