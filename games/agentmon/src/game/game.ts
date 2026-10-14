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
import type { CharLook } from '../art/characters';
import { drawCreature } from '../art/creatures';
import { POSES } from '../art/painter';
import { drawPortrait, expressionFor } from '../art/portraits';
import { CAST } from '../data/cast';
import { canvasUrl } from '../render/atlas';

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
    // a soft sound for every button press in the menus: gold "go" buttons confirm, Back goes back
    app.ui.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      this.sfx(b.classList.contains('primary') ? 'confirm' : b.classList.contains('back') ? 'back' : 'click');
    });
    this.focus = new FocusManager(this.input);
    this.dialogue = new Dialogue(this.input, this.focus, {
      readAloud: () => this.settings.readAloud,
      textSpeed: () => this.settings.textSpeed,
      instant: () => this.settings.skipAnimations || new URLSearchParams(location.search).has('fasttext'),
      portrait: (who, line) => this.portraitFor(who, line),
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

  /** People (and story Agentmon) on the current map, by the name they talk with (the overworld fills it). */
  speakers = new Map<string, { look?: CharLook; creature?: string }>();
  private portraitUrls = new Map<string, string>();

  /** The speaker's portrait for a line (named cast first, then whoever is on this map), with a fitting face. */
  portraitFor(who: string, line: string): string | null {
    const cast = Object.values(CAST).find(c => c.name === who);
    const one = cast ? { look: cast.look } : this.speakers.get(who);
    if (!one) return null;
    const expr = expressionFor(line);
    const key = `${who}:${one.creature ?? ''}:${expr}`;
    let url = this.portraitUrls.get(key);
    if (!url) {
      url = one.creature ? canvasUrl(drawCreature(one.creature, 32, expr === 'happy' ? POSES.happy : expr === 'surprised' ? POSES.hit : POSES.idle), 3)
        : one.look ? canvasUrl(drawPortrait(one.look, expr), 3) : '';
      this.portraitUrls.set(key, url);
    }
    return url || null;
  }

  /**
   * Fade the screen out or in. With `at` (a point on screen, in CSS px) it is an iris instead: a
   * circle closes on that point, and opens from it again on the new map. Reduced motion (or
   * skipping animations) keeps the plain, instant fade. Timed with timers, so a hidden tab can't
   * leave it half done.
   */
  async fade(dir: 'out' | 'in', ms = 260, at?: { x: number; y: number }): Promise<void> {
    const fast = this.settings.reducedMotion || this.settings.skipAnimations;
    const el = this.fadeEl;
    if (!at || fast) {
      el.classList.remove('iris');
      el.style.transitionDuration = `${fast ? 0 : ms}ms`;
      el.classList.toggle('on', dir === 'out');
      await wait(fast ? 0 : ms);
      return;
    }
    const R = Math.hypot(Math.max(at.x, innerWidth - at.x), Math.max(at.y, innerHeight - at.y)) + 4;
    const dur = ms * 1.6;
    el.style.transitionDuration = '0ms';
    el.style.setProperty('--ix', `${Math.round(at.x)}px`);
    el.style.setProperty('--iy', `${Math.round(at.y)}px`);
    el.style.setProperty('--ir', `${dir === 'out' ? R : 0}px`);
    el.classList.add('iris', 'on');
    const t0 = performance.now();
    await new Promise<void>(resolve => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k * k * (3 - 2 * k);
        el.style.setProperty('--ir', `${Math.round(dir === 'out' ? R * (1 - e) : R * e)}px`);
        if (k < 1) setTimeout(step, 16);
        else resolve();
      };
      step();
    });
    if (dir === 'in') el.classList.remove('iris', 'on');
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
