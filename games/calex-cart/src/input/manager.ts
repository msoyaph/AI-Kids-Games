import type { KartInput } from '../sim/kart';
import { ACTIONS, DEFAULT_KEYS, DEFAULT_PAD, clonePad, cloneKeys, type Action, type KeyBindings, type KeyScheme, type PadBindings } from './bindings';
import { TouchControls } from './touch';

export type InputSource =
  | { kind: 'any' }
  | { kind: 'keyboard'; scheme: KeyScheme }
  | { kind: 'gamepad'; index: number }
  | { kind: 'combo'; scheme: KeyScheme; index: number }
  | { kind: 'touch' };

export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause' | 'tabPrev' | 'tabNext' | 'nextItem' | 'prevItem';

export type Device = 'keyboard' | 'gamepad' | 'touch';

interface PlayerState {
  steer: number;
  steerKeys: number;
  accel: number;
  brake: number;
  drift: boolean;
  item: boolean;
  aimBack: boolean;
  lookBack: boolean;
}

function emptyState(): PlayerState {
  return { steer: 0, steerKeys: 0, accel: 0, brake: 0, drift: false, item: false, aimBack: false, lookBack: false };
}

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

interface PadMenuState {
  dir: string;
  holdTime: number;
  buttons: boolean[];
}

/**
 * Collects keyboard, gamepad and touch input. Produces KartInput for each local player and
 * menu navigation events. Polled once per rendered frame.
 */
export class InputManager {
  readonly keys = new Set<string>();
  keyBindings: Record<KeyScheme, KeyBindings> = {
    solo: cloneKeys(DEFAULT_KEYS.solo),
    left: cloneKeys(DEFAULT_KEYS.left),
    right: cloneKeys(DEFAULT_KEYS.right),
  };
  padBindings: PadBindings = clonePad(DEFAULT_PAD);
  players: InputSource[] = [{ kind: 'any' }];
  readonly touch: TouchControls;
  lastDevice: Device = 'keyboard';
  /** Rumble / vibration allowed (Settings). */
  rumbleOn = true;
  /** Gamepad index each player last used (rumble goes there). */
  private lastPad: number[] = [-1, -1];
  private lastRumble = 0;
  /** Set while a race is running: game keys don't scroll, menu events are suppressed for gameplay keys. */
  inRace = false;
  private states: PlayerState[] = [emptyState(), emptyState()];
  private menuListeners: Array<(a: MenuAction, device: Device) => void> = [];
  private padMenu: PadMenuState[] = [];
  private pausePressed = [false, false];
  /** Callback for "press any key" rebinding. */
  private captureKey: ((code: string) => void) | null = null;
  private capturePad: ((button: number) => void) | null = null;
  private padsSeen = new Set<number>();
  onPadConnect?: (index: number, connected: boolean) => void;

  constructor(uiRoot: HTMLElement) {
    this.touch = new TouchControls(uiRoot);
    window.addEventListener('keydown', this.onKeyDown, { capture: true });
    window.addEventListener('keyup', this.onKeyUp, { capture: true });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.lastDevice = 'touch';
    });
    window.addEventListener('gamepadconnected', (e) => this.onPadConnect?.((e as GamepadEvent).gamepad.index, true));
    window.addEventListener('gamepaddisconnected', (e) => this.onPadConnect?.((e as GamepadEvent).gamepad.index, false));
  }

  onMenu(fn: (a: MenuAction, device: Device) => void): () => void {
    this.menuListeners.push(fn);
    return () => {
      this.menuListeners = this.menuListeners.filter((l) => l !== fn);
    };
  }

  private emitMenu(a: MenuAction, d: Device): void {
    for (const l of [...this.menuListeners]) l(a, d);
  }

  /** Next key press is captured for remapping (Escape cancels). */
  captureNextKey(fn: ((code: string) => void) | null): void {
    this.captureKey = fn;
  }

  captureNextPadButton(fn: ((button: number) => void) | null): void {
    this.capturePad = fn;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.lastDevice = 'keyboard';
    const tag = (e.target as HTMLElement | null)?.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !this.captureKey) {
      // typing a name: Enter confirms, Esc goes back, ↑/↓ and Tab leave the field; other keys belong to the text field
      if (e.code === 'Enter' || e.code === 'NumpadEnter') this.emitMenu('confirm', 'keyboard');
      if (e.code === 'Escape') this.emitMenu('back', 'keyboard');
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Tab') {
        e.preventDefault();
        this.emitMenu(e.code === 'ArrowUp' ? 'up' : e.code === 'ArrowDown' ? 'down' : e.shiftKey ? 'prevItem' : 'nextItem', 'keyboard');
      }
      return;
    }
    if (this.captureKey) {
      e.preventDefault();
      e.stopPropagation();
      const fn = this.captureKey;
      this.captureKey = null;
      fn(e.code);
      return;
    }
    if (GAME_KEYS.has(e.code) || (this.inRace && this.isBound(e.code))) e.preventDefault();
    const fresh = !this.keys.has(e.code);
    this.keys.add(e.code);
    if (this.inRace) {
      if (fresh && this.isAction(e.code, 'pause')) {
        const p2 = this.players[1];
        if (this.players.length > 1 && p2 && p2.kind === 'keyboard' && this.keyBindings.right.pause.includes(e.code)) this.pausePressed[1] = true;
        else this.pausePressed[0] = true;
      }
      return;
    }
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.emitMenu('up', 'keyboard');
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.emitMenu('down', 'keyboard');
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.emitMenu('left', 'keyboard');
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.emitMenu('right', 'keyboard');
        break;
      case 'Enter':
      case 'Space':
      case 'NumpadEnter':
        // never let the browser also "click" a natively focused element
        if ((e.target as HTMLElement)?.tagName !== 'INPUT') e.preventDefault();
        if (!e.repeat) this.emitMenu('confirm', 'keyboard');
        break;
      case 'Escape':
      case 'Backspace':
        if (!e.repeat) this.emitMenu('back', 'keyboard');
        break;
      case 'KeyQ':
        if (!e.repeat) this.emitMenu('tabPrev', 'keyboard');
        break;
      case 'KeyE':
        if (!e.repeat) this.emitMenu('tabNext', 'keyboard');
        break;
      case 'Tab':
        // sequential focus through every button, in reading order (the browser's own Tab is blocked)
        this.emitMenu(e.shiftKey ? 'prevItem' : 'nextItem', 'keyboard');
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private isBound(code: string): boolean {
    for (const s of ['solo', 'left', 'right'] as KeyScheme[]) {
      for (const a of ACTIONS) if (this.keyBindings[s][a].includes(code)) return true;
    }
    return false;
  }

  private isAction(code: string, a: Action): boolean {
    return this.keyBindings.solo[a].includes(code) || this.keyBindings.left[a].includes(code) || this.keyBindings.right[a].includes(code);
  }

  private keyDown(b: KeyBindings, a: Action): boolean {
    const list = b[a];
    for (let i = 0; i < list.length; i++) if (this.keys.has(list[i])) return true;
    return false;
  }

  /** Read gamepads + keys + touch. Call once per frame before filling kart inputs. */
  poll(dt: number): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    // menu navigation from any pad
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (!p || !p.connected) continue;
      if (!this.padsSeen.has(i)) this.padsSeen.add(i);
      this.pollPadMenu(p, i, dt);
    }
    if (this.touch.consumePause()) this.pausePressed[0] = true;

    for (let pi = 0; pi < this.players.length; pi++) {
      const src = this.players[pi];
      const st = this.states[pi];
      let steerKeys = 0;
      let accel = 0;
      let brake = 0;
      let drift = false;
      let item = false;
      let lookBack = false;
      let aimBack = false;
      let analogSteer = 0;
      const useKeys = src.kind === 'any' || src.kind === 'keyboard' || src.kind === 'combo';
      if (useKeys) {
        const kb = this.keyBindings[src.kind === 'keyboard' || src.kind === 'combo' ? src.scheme : 'solo'];
        if (this.keyDown(kb, 'left')) steerKeys -= 1;
        if (this.keyDown(kb, 'right')) steerKeys += 1;
        if (this.keyDown(kb, 'accel')) accel = 1;
        if (this.keyDown(kb, 'brake')) brake = 1;
        drift = this.keyDown(kb, 'drift');
        item = this.keyDown(kb, 'item');
        lookBack = this.keyDown(kb, 'lookBack');
        aimBack = brake > 0;
      }
      const usePads = src.kind === 'any' || src.kind === 'gamepad' || src.kind === 'combo';
      if (usePads) {
        for (let i = 0; i < pads.length; i++) {
          const p = pads[i];
          if (!p || !p.connected) continue;
          if ((src.kind === 'gamepad' || src.kind === 'combo') && src.index !== i) continue;
          const b = this.padBindings;
          const ax = p.axes[0] ?? 0;
          const ay = p.axes[1] ?? 0;
          const dz = 0.16;
          if (Math.abs(ax) > dz) {
            analogSteer = (ax - Math.sign(ax) * dz) / (1 - dz);
            this.lastDevice = 'gamepad';
          }
          if (this.padAction(p, b.left)) steerKeys = -1;
          if (this.padAction(p, b.right)) steerKeys = 1;
          accel = Math.max(accel, this.padValue(p, b.accel));
          brake = Math.max(brake, this.padValue(p, b.brake));
          if (this.padAction(p, b.drift)) drift = true;
          if (this.padAction(p, b.item)) item = true;
          if (this.padAction(p, b.lookBack)) lookBack = true;
          if (ay > 0.5 || brake > 0.3) aimBack = true;
          if (accel > 0 || brake > 0 || drift || item) this.lastDevice = 'gamepad';
          if (accel > 0 || drift || Math.abs(ax) > dz) this.lastPad[pi] = i;
          const pause = b.pause.some((bi) => p.buttons[bi]?.pressed);
          const state = this.padMenu[i];
          if (pause && state && !state.buttons[99]) this.pausePressed[pi] = true;
          if (state) state.buttons[99] = pause;
        }
      }
      if (src.kind === 'any' || src.kind === 'touch') {
        const t = this.touch.state;
        if (t.steer !== 0) analogSteer = t.steer;
        if (t.accel) accel = 1;
        if (t.brake) brake = 1;
        if (t.drift) drift = true;
        if (t.item) item = true;
        if (t.aimBack || t.brake) aimBack = aimBack || t.aimBack || (t.brake && t.item);
        if (t.lookBack) lookBack = true;
      }
      // Digital steering eases in quickly (feels responsive but not twitchy).
      const rate = steerKeys === 0 ? 14 : Math.sign(steerKeys) !== Math.sign(st.steerKeys) ? 16 : 8;
      if (st.steerKeys < steerKeys) st.steerKeys = Math.min(steerKeys, st.steerKeys + rate * dt);
      else if (st.steerKeys > steerKeys) st.steerKeys = Math.max(steerKeys, st.steerKeys - rate * dt);
      st.steer = Math.abs(analogSteer) > Math.abs(st.steerKeys) ? analogSteer : st.steerKeys;
      st.accel = accel;
      st.brake = brake;
      st.drift = drift;
      st.item = item;
      st.aimBack = aimBack;
      st.lookBack = lookBack;
    }
  }

  /** The device a local player is using right now. */
  deviceOf(player: number): Device {
    const src = this.players[player] ?? { kind: 'any' };
    return src.kind === 'gamepad' || src.kind === 'combo' ? 'gamepad' : src.kind === 'touch' ? 'touch' : src.kind === 'keyboard' ? 'keyboard' : this.lastDevice;
  }

  /**
   * Gamepad dual-rumble for one local player (magnitudes 0..1). Silently does nothing on other devices; touch
   * phones get their own short, sparing pulses through `buzz()`.
   */
  rumble(player: number, strong: number, weak: number, ms: number): void {
    if (!this.rumbleOn || this.deviceOf(player) !== 'gamepad') return;
    const now = performance.now();
    if (now - this.lastRumble < 45) return;
    this.lastRumble = now;
    const src = this.players[player] ?? { kind: 'any' };
    try {
      const idx = src.kind === 'gamepad' || src.kind === 'combo' ? src.index : this.lastPad[player];
      const pad = idx >= 0 ? navigator.getGamepads?.()[idx] : null;
      const act = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)?.vibrationActuator;
      void act?.playEffect?.('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) })?.catch(() => {});
    } catch {
      /* haptics are optional */
    }
  }

  /** Vibrations actually sent (for tests; `navigator.vibrate` can't be observed otherwise). */
  buzzCount = 0;

  /**
   * A short vibration for a touch player (Android, where `navigator.vibrate` exists). iOS has no web vibration, so
   * this quietly does nothing there. Only after the player has touched the page (browsers block it otherwise).
   */
  buzz(player: number, ms: number): void {
    if (!this.rumbleOn || this.deviceOf(player) !== 'touch' || typeof navigator.vibrate !== 'function') return;
    const now = performance.now();
    if (now - this.lastBuzz < 80) return;
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    this.lastBuzz = now;
    try {
      if (navigator.vibrate(Math.round(ms))) this.buzzCount++;
    } catch {
      /* haptics are optional */
    }
  }

  private lastBuzz = 0;

  private padAction(p: Gamepad, list: number[]): boolean {
    for (let i = 0; i < list.length; i++) if (p.buttons[list[i]]?.pressed) return true;
    return false;
  }

  private padValue(p: Gamepad, list: number[]): number {
    let v = 0;
    for (let i = 0; i < list.length; i++) {
      const b = p.buttons[list[i]];
      if (b) v = Math.max(v, b.pressed ? Math.max(b.value, 0.6) : b.value > 0.1 ? b.value : 0);
    }
    return v > 0.95 ? 1 : v;
  }

  private pollPadMenu(p: Gamepad, i: number, dt: number): void {
    let st = this.padMenu[i];
    if (!st) st = this.padMenu[i] = { dir: '', holdTime: 0, buttons: [] };
    if (this.capturePad) {
      for (let b = 0; b < p.buttons.length; b++) {
        if (p.buttons[b]?.pressed && !st.buttons[b]) {
          const fn = this.capturePad;
          this.capturePad = null;
          st.buttons[b] = true;
          fn(b);
          return;
        }
      }
    }
    const ax = p.axes[0] ?? 0;
    const ay = p.axes[1] ?? 0;
    let dir = '';
    if (p.buttons[12]?.pressed || ay < -0.55) dir = 'up';
    else if (p.buttons[13]?.pressed || ay > 0.55) dir = 'down';
    else if (p.buttons[14]?.pressed || ax < -0.55) dir = 'left';
    else if (p.buttons[15]?.pressed || ax > 0.55) dir = 'right';
    if (!this.inRace) {
      if (dir && dir !== st.dir) {
        st.holdTime = 0;
        this.lastDevice = 'gamepad';
        this.emitMenu(dir as MenuAction, 'gamepad');
      } else if (dir) {
        st.holdTime += dt;
        if (st.holdTime > 0.42) {
          st.holdTime = 0.3;
          this.emitMenu(dir as MenuAction, 'gamepad');
        }
      }
    }
    st.dir = dir;
    const edge = (b: number): boolean => !!p.buttons[b]?.pressed && !st.buttons[b];
    if (!this.inRace) {
      if (edge(0)) {
        this.lastDevice = 'gamepad';
        this.emitMenu('confirm', 'gamepad');
      }
      if (edge(1)) this.emitMenu('back', 'gamepad');
      if (edge(9)) this.emitMenu('pause', 'gamepad');
      if (edge(4)) this.emitMenu('tabPrev', 'gamepad');
      if (edge(5)) this.emitMenu('tabNext', 'gamepad');
    }
    for (let b = 0; b < p.buttons.length; b++) st.buttons[b] = !!p.buttons[b]?.pressed;
  }

  /** Fill a kart input from player pi's controls. */
  fillKartInput(pi: number, out: KartInput, autoAccel: boolean, raceStarted: boolean): void {
    const st = this.states[pi];
    out.steer = st.steer;
    let throttle = st.accel - st.brake;
    if (autoAccel && raceStarted && st.brake < 0.2) throttle = Math.max(throttle, 1);
    out.throttle = Math.max(-1, Math.min(1, throttle));
    out.drift = st.drift;
    out.item = st.item;
    out.aimBack = st.aimBack;
    out.lookBack = st.lookBack;
  }

  /** Was pause pressed by player pi since last call? */
  consumePause(pi = 0): boolean {
    const p = this.pausePressed[pi];
    this.pausePressed[pi] = false;
    return p;
  }

  anyPause(): number {
    for (let i = 0; i < this.pausePressed.length; i++) {
      if (this.pausePressed[i]) {
        this.pausePressed[i] = false;
        return i;
      }
    }
    return -1;
  }

  /** Any confirm-type input this frame (for skipping intros). */
  anyGameButton(pi = 0): boolean {
    const s = this.states[pi];
    return s.accel > 0.5 || s.drift || s.item;
  }

  connectedPads(): number[] {
    const out: number[] = [];
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) if (pads[i]?.connected) out.push(i);
    return out;
  }

  resetBindings(): void {
    this.keyBindings = { solo: cloneKeys(DEFAULT_KEYS.solo), left: cloneKeys(DEFAULT_KEYS.left), right: cloneKeys(DEFAULT_KEYS.right) };
    this.padBindings = clonePad(DEFAULT_PAD);
  }
}
