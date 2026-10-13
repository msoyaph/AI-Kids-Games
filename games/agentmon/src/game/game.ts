/**
 * The game controller: input, focus, the dialogue box, touch controls, toasts, tutorials and the
 * current adventure. Scenes use it for anything that outlives a single scene.
 */
import { DIFFICULTIES } from '../core/types';
import { Input } from '../input/input';
import { Dialogue } from '../ui/dialogue';
import { h, wait } from '../ui/dom';
import { FocusManager } from '../ui/focus';
import { TouchControls } from '../ui/touch';
import { TUTORIALS } from '../data/tutorials';
import type { SparkInfo } from '../render/spark-ring';
import { AudioEngine } from '../audio/audio';
import { Music } from '../audio/music';
import { playCry, playSfx, type Sfx } from '../audio/sfx';
import { SPECIES } from '../data/species';
import type { App } from './app';
import type { Session } from './session';
import { applySettingsToDom, loadSettings, saveSettings, type Settings } from './settings';

export class Game {
  readonly input = new Input();
  readonly focus: FocusManager;
  readonly dialogue: Dialogue;
  readonly touch: TouchControls;
  settings: Settings;
  session: Session | null = null;
  readonly audio = new AudioEngine();
  readonly music = new Music(this.audio);
  private toastEl: HTMLElement;
  private fadeEl: HTMLElement;
  /** Moment-to-moment facts for the read-only test hook (the Spark Ring's spark, the battle). */
  live: { spark: SparkInfo | null; battle: { turn: number; outcome: string | null } | null } = { spark: null, battle: null };
  /** Taps on the world (CSS px), consumed by the overworld. */
  onWorldTap: ((x: number, y: number) => void) | null = null;

  constructor(readonly app: App) {
    this.settings = loadSettings();
    applySettingsToDom(this.settings);
    this.audio.setVolumes(this.settings.volume);
    // a soft click for every button press in the menus
    app.ui.addEventListener('click', e => { if ((e.target as HTMLElement).closest('button')) this.sfx('click'); });
    this.focus = new FocusManager(this.input);
    this.dialogue = new Dialogue(this.input, this.focus, {
      readAloud: () => this.settings.readAloud,
      textSpeed: () => this.settings.textSpeed,
      instant: () => this.settings.skipAnimations || new URLSearchParams(location.search).has('fasttext'),
    }, app.ui);
    this.touch = new TouchControls(this.input, { onTap: (x, y) => this.onWorldTap?.(x, y) });
    app.ui.appendChild(this.touch.el);
    this.toastEl = h('div.toasts', { 'aria-live': 'polite' });
    this.fadeEl = h('div.fade', { 'aria-hidden': 'true' });
    app.ui.append(this.toastEl, this.fadeEl);
    // world taps from mouse clicks / taps on the canvas (outside the touch zone)
    let downAt: { x: number; y: number; t: number } | null = null;
    app.host.app.canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    app.host.app.canvas.addEventListener('pointerup', e => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      if (moved < 12 && performance.now() - downAt.t < 600) this.onWorldTap?.(e.clientX, e.clientY);
      downAt = null;
    });
  }

  saveSettings(): void {
    saveSettings(this.settings);
    applySettingsToDom(this.settings);
    this.audio.setVolumes(this.settings.volume);
  }

  sfx(id: Sfx | string): void { playSfx(this.audio, id); }

  /** An Agentmon's own cry. */
  cry(species: string, happy = true): void {
    const sp = SPECIES[species];
    if (sp) playCry(this.audio, { num: sp.num, element: sp.element, stage: sp.stage, guardian: sp.guardian }, happy);
  }

  setDifficulty(d: (typeof DIFFICULTIES)[number]): void {
    if (this.session) this.session.state.difficulty = d;
  }

  toast(text: string, ms = 2400): void {
    const el = h('div.toast', {}, text);
    this.toastEl.appendChild(el);
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }

  async fade(dir: 'out' | 'in', ms = 260): Promise<void> {
    const fast = this.settings.reducedMotion || this.settings.skipAnimations;
    this.fadeEl.style.transitionDuration = `${fast ? 0 : ms}ms`;
    this.fadeEl.classList.toggle('on', dir === 'out');
    await wait(fast ? 0 : ms);
  }

  /** A one-time tutorial card (once per adventure), with the controls for the current device. */
  async tutorial(id: string): Promise<void> {
    const s = this.session?.state;
    const t = TUTORIALS[id];
    if (!t || !s || s.tutorials.has(id)) return;
    s.tutorials.add(id);
    const dev = this.input.device;
    const body = dev === 'touch' ? t.touch : dev === 'gamepad' ? t.pad : t.keys;
    await new Promise<void>(resolve => {
      const done = () => { this.focus.pop(layer); card.remove(); resolve(); };
      const card = h('div.tutorial', { role: 'dialog', 'aria-label': t.title },
        h('div.panel', {}, h('h2', {}, t.title), h('p', {}, body), h('button.primary', { type: 'button', 'data-autofocus': true, onclick: done }, 'Got it!')));
      const layer = { el: card, back: done };
      this.app.ui.appendChild(card);
      this.focus.push(layer);
    });
  }
}
