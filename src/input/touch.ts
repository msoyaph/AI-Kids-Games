// On-screen touch controls: steering pad (or tilt), big DRIFT and ITEM buttons, brake and look-back.
// Uses Pointer Events with capture so several fingers work at once.

export interface TouchState {
  steer: number;
  accel: boolean;
  brake: boolean;
  drift: boolean;
  item: boolean;
  aimBack: boolean;
  lookBack: boolean;
  pause: boolean;
}

export type TouchSteerMode = 'buttons' | 'tilt';

export class TouchControls {
  readonly state: TouchState = { steer: 0, accel: false, brake: false, drift: false, item: false, aimBack: false, lookBack: false, pause: false };
  readonly root: HTMLDivElement;
  private steerPad: HTMLDivElement;
  private leftBtn: HTMLDivElement;
  private rightBtn: HTMLDivElement;
  private accelBtn: HTMLDivElement;
  private steerPointer = -1;
  private itemStartY = 0;
  private tiltBase: number | null = null;
  private tiltSteer = 0;
  private visible = false;
  mode: TouchSteerMode = 'buttons';
  autoAccel = true;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls hidden';
    this.root.innerHTML = `
      <div class="tc-steer" data-tc="steer">
        <div class="tc-btn tc-left" aria-label="Steer left">◀</div>
        <div class="tc-btn tc-right" aria-label="Steer right">▶</div>
      </div>
      <div class="tc-cluster">
        <div class="tc-btn tc-item" data-tc="item" aria-label="Use item (swipe down to throw back)">ITEM</div>
        <div class="tc-btn tc-drift" data-tc="drift" aria-label="Drift">DRIFT</div>
        <div class="tc-btn tc-brake" data-tc="brake" aria-label="Brake">BRAKE</div>
        <div class="tc-btn tc-accel" data-tc="accel" aria-label="Accelerate">GO</div>
      </div>
      <div class="tc-btn tc-look" data-tc="look" aria-label="Look behind">👀</div>
      <div class="tc-btn tc-pause" data-tc="pause" aria-label="Pause">II</div>
    `;
    parent.appendChild(this.root);
    this.steerPad = this.root.querySelector('.tc-steer') as HTMLDivElement;
    this.leftBtn = this.root.querySelector('.tc-left') as HTMLDivElement;
    this.rightBtn = this.root.querySelector('.tc-right') as HTMLDivElement;
    this.accelBtn = this.root.querySelector('.tc-accel') as HTMLDivElement;

    this.steerPad.addEventListener('pointerdown', this.onSteerDown);
    this.steerPad.addEventListener('pointermove', this.onSteerMove);
    this.steerPad.addEventListener('pointerup', this.onSteerUp);
    this.steerPad.addEventListener('pointercancel', this.onSteerUp);
    this.steerPad.addEventListener('lostpointercapture', this.onSteerUp);

    this.bindHold('drift', (v) => (this.state.drift = v));
    this.bindHold('brake', (v) => (this.state.brake = v));
    this.bindHold('accel', (v) => (this.state.accel = v));
    this.bindHold('look', (v) => (this.state.lookBack = v));
    this.bindHold('pause', (v) => {
      if (v) this.state.pause = true;
    });
    const item = this.root.querySelector('[data-tc="item"]') as HTMLDivElement;
    item.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      item.setPointerCapture(e.pointerId);
      this.itemStartY = e.clientY;
      this.state.item = true;
      this.state.aimBack = false;
      item.classList.add('down');
    });
    item.addEventListener('pointermove', (e) => {
      if (!this.state.item) return;
      // Swipe down on the item button to throw it backwards.
      this.state.aimBack = e.clientY - this.itemStartY > 28;
    });
    const itemUp = (): void => {
      this.state.item = false;
      item.classList.remove('down');
      setTimeout(() => (this.state.aimBack = false), 50);
    };
    item.addEventListener('pointerup', itemUp);
    item.addEventListener('pointercancel', itemUp);
    // Block page gestures (scroll/zoom/long-press menus) over the controls.
    this.root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('deviceorientation', this.onOrientation);
  }

  private bindHold(name: string, set: (v: boolean) => void): void {
    const el = this.root.querySelector(`[data-tc="${name}"]`) as HTMLDivElement;
    const down = (e: PointerEvent): void => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      set(true);
      el.classList.add('down');
    };
    const up = (): void => {
      set(false);
      el.classList.remove('down');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  private steerFromX(clientX: number): void {
    const r = this.steerPad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const v = (clientX - cx) / (r.width * 0.3);
    const dz = 0.12;
    const s = Math.abs(v) < dz ? 0 : Math.max(-1, Math.min(1, (v - Math.sign(v) * dz) / (1 - dz)));
    this.state.steer = s;
    this.leftBtn.classList.toggle('down', s < -0.05);
    this.rightBtn.classList.toggle('down', s > 0.05);
  }

  private onSteerDown = (e: PointerEvent): void => {
    if (this.mode !== 'buttons') return;
    e.preventDefault();
    this.steerPointer = e.pointerId;
    this.steerPad.setPointerCapture(e.pointerId);
    this.steerFromX(e.clientX);
  };

  private onSteerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.steerPointer) return;
    this.steerFromX(e.clientX);
  };

  private onSteerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.steerPointer) return;
    this.steerPointer = -1;
    this.state.steer = 0;
    this.leftBtn.classList.remove('down');
    this.rightBtn.classList.remove('down');
  };

  private onOrientation = (e: DeviceOrientationEvent): void => {
    if (this.mode !== 'tilt' || e.beta == null || e.gamma == null) return;
    const angle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 90) as number;
    // In landscape, tilting the device like a steering wheel changes beta.
    let tilt = angle === 90 ? e.beta : angle === -90 || angle === 270 ? -e.beta : e.gamma;
    if (this.tiltBase === null) this.tiltBase = 0;
    tilt -= this.tiltBase;
    const dz = 3;
    const v = Math.abs(tilt) < dz ? 0 : (tilt - Math.sign(tilt) * dz) / 22;
    this.tiltSteer = Math.max(-1, Math.min(1, v));
    this.state.steer = this.tiltSteer;
  };

  /** iOS needs explicit permission from a user gesture. Returns whether tilt is available. */
  static async requestTiltPermission(): Promise<boolean> {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!DOE) return false;
    if (typeof DOE.requestPermission === 'function') {
      try {
        return (await DOE.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  setMode(mode: TouchSteerMode): void {
    this.mode = mode;
    this.state.steer = 0;
    this.tiltBase = null;
    this.root.classList.toggle('tilt', mode === 'tilt');
  }

  setAutoAccel(on: boolean): void {
    this.autoAccel = on;
    this.accelBtn.style.display = on ? 'none' : '';
  }

  /** During the countdown the GO button is shown (pulsing) so touch players can try a rocket start. */
  setCountdown(on: boolean): void {
    if (!this.autoAccel) return;
    const want = on ? '' : 'none';
    if (this.accelBtn.style.display !== want) this.accelBtn.style.display = want;
    this.accelBtn.classList.toggle('pulse', on);
  }

  show(on: boolean): void {
    if (this.visible === on) return;
    this.visible = on;
    this.root.classList.toggle('hidden', !on);
    if (!on) this.reset();
  }

  /** Split-screen: anchor controls to one half (not used for touch split, but keeps API simple). */
  reset(): void {
    const s = this.state;
    s.steer = 0;
    s.accel = s.brake = s.drift = s.item = s.aimBack = s.lookBack = s.pause = false;
    this.root.querySelectorAll('.down').forEach((el) => el.classList.remove('down'));
  }

  consumePause(): boolean {
    const p = this.state.pause;
    this.state.pause = false;
    return p;
  }
}
