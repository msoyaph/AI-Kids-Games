import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { startSession } from '../app/session';
import { sfx } from '../audio/sfx';
import { Rng } from '../core/rng';
import type { AstronautLook, Difficulty } from '../data/types';
import { FACES, HAIR_COLORS, HAIR_STYLES, HELMETS, SKIN_TONES, SUIT_COLORS } from '../gfx/art/characters';
import { CircleGeometry, DirectionalLight, Group, Mesh, MeshBasicMaterial, TorusGeometry, Color } from 'three';
import { disposeObject } from '../r3/dispose';
import { buildCadet, type Character } from '../r3/models/characters';
import { portraitEl } from '../ui/portraits';
import { MenuBackdrop } from '../r3/space/backdrop';
import { createSave, defaultProfile } from '../systems/save/schema';
import { clear, h } from '../ui/dom';
import { speak } from '../ui/speech';
import { button, iconEl } from '../ui/widgets';

export interface CreatorParams {
  slot: number;
}

const NAMES = ['Nova', 'Comet', 'Astro', 'Luna', 'Orbit', 'Sky', 'Zoom', 'Juno', 'Kiko', 'Remy', 'Tali', 'Pixel', 'Echo', 'Sunny', 'Ziggy', 'Rory', 'Indy', 'Mika', 'Bo', 'Starling'];

/** Make your astronaut: name, suit, helmet, face. */
export class CreatorScene extends Scene3D {
  private backdrop: MenuBackdrop;
  private look: AstronautLook;
  private difficulty: Difficulty = 'easy';
  private preview: HTMLElement;
  private stage = new Group();
  private cadet: Character | null = null;
  private spin = 0.4;
  private spinVel = 0;
  private dragX: number | null = null;
  private waveT = 0;
  private nameInput: HTMLInputElement;
  private sections: HTMLElement;
  private rng = new Rng(Date.now());

  constructor(private readonly p: CreatorParams) {
    super('creator');
    this.music = 'title';
    this.backdrop = new MenuBackdrop(this.world, this.camera);
    this.look = { ...defaultProfile(), name: '' };
    this.look.skin = SKIN_TONES[this.rng.int(0, SKIN_TONES.length - 1)];
    this.look.suit = SUIT_COLORS[this.rng.int(0, SUIT_COLORS.length - 1)];
    this.preview = h('div', { class: 'creator-preview hit', 'data-testid': 'creator-preview', 'aria-label': 'Drag to spin your astronaut' });
    this.bindSpin();
    // A glowing stage for your astronaut, in front of the camera.
    const key = new DirectionalLight('#fff4e0', 2.4);
    key.position.set(3, 5, 6);
    const rim = new DirectionalLight('#9fb4ff', 1.6);
    rim.position.set(-4, 3, -6);
    this.world.add(key, rim);
    this.world.environmentIntensity = 1;
    const pad = new Mesh(new CircleGeometry(0.55, 48), new MeshBasicMaterial({ color: new Color('#2a1d78'), transparent: true, opacity: 0.85 }));
    pad.rotation.x = -Math.PI / 2;
    const ring = new Mesh(new TorusGeometry(0.56, 0.012, 8, 64), new MeshBasicMaterial({ color: new Color('#4dd4ff').multiplyScalar(2.2) }));
    ring.rotation.x = -Math.PI / 2;
    this.stage.add(pad, ring);
    this.stage.position.set(0, -0.62, -3.4);
    this.world.add(this.stage);
    this.nameInput = h('input', { class: 'name-input', type: 'text', maxlength: '12', placeholder: 'Your name', 'data-testid': 'name-input', 'aria-label': 'Your name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' }) as HTMLInputElement;
    this.nameInput.addEventListener('input', () => {
      this.look.name = this.nameInput.value;
    });
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.sections = h('div', { class: 'creator-sections scroll' });
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Make your astronaut'),
    );
    const start = button('Start!', 'rocket', () => this.start(), { color: 'green', size: 'big', id: 'btn-start' });
    this.ui.append(header, h('div', { class: 'board-main' }, h('div', { class: 'creator-left' }, this.preview, start), h('div', { class: 'panel creator-right' }, this.sections)));
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    this.build();
    this.refresh();
    speak('Make your astronaut! Pick a name and colors.');
  }

  override back(): boolean {
    void S.game.go('slots');
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    // Show the astronaut in the left column.
    const cx = w * 0.2;
    const cy = hh * 0.47;
    this.camera.setViewOffset(w, hh, w / 2 - cx, hh / 2 - cy, w, hh);
  }

  private bindSpin(): void {
    const el = this.preview;
    el.addEventListener('pointerdown', (e) => {
      this.dragX = e.clientX;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragX === null) return;
      const dx = (e.clientX - this.dragX) / S.game.metrics.scale;
      this.dragX = e.clientX;
      this.spin += dx * 0.012;
      this.spinVel = dx * 0.6;
    });
    const up = () => (this.dragX = null);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  override update(dt: number): void {
    if (this.dragX === null) {
      this.spin += this.spinVel * dt;
      this.spinVel *= Math.exp(-3 * dt);
      // Drift back to facing you.
      this.spin += Math.atan2(Math.sin(-this.spin), Math.cos(-this.spin)) * Math.min(1, dt * 0.8);
    }
    if (this.cadet) {
      this.waveT -= dt;
      this.cadet.setAnim(this.waveT > 0 ? 'wave' : 'idle');
      this.cadet.update(dt);
      this.cadet.group.rotation.y = this.spin;
    }
  }

  override render(): void {
    this.backdrop.update(this.time, 1 / 60, true);
    void comfortOn;
  }

  private section(title: string, body: HTMLElement): HTMLElement {
    return h('div', { class: 'cr-section' }, h('div', { class: 'cr-title' }, title), body);
  }

  private swatches(colors: readonly string[], get: () => string, set: (c: string) => void, testId: string): HTMLElement {
    const row = h('div', { class: 'swatches' });
    colors.forEach((c, i) => {
      const b = h('button', { class: `swatch ${get() === c ? 'on' : ''}`, type: 'button', style: `background:${c}`, 'data-testid': `${testId}-${i}`, 'aria-label': `Color ${i + 1}` });
      b.addEventListener('click', () => {
        set(c);
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
        this.refresh();
      });
      row.append(b);
    });
    return row;
  }

  private choices<T extends string>(opts: readonly T[], get: () => T | string, set: (v: T) => void, draw: (v: T) => HTMLCanvasElement, testId: string): HTMLElement {
    const row = h('div', { class: 'choices' });
    for (const o of opts) {
      const b = h('button', { class: `choice ${get() === o ? 'on' : ''}`, type: 'button', 'data-testid': `${testId}-${o}` }, draw(o));
      b.addEventListener('click', () => {
        set(o);
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
        this.refresh();
      });
      row.append(b);
    }
    return row;
  }

  private build(): void {
    clear(this.sections);
    const L = this.look;
    const mini = (patch: Partial<AstronautLook>) => portraitEl('player', 64, 'happy', { ...L, ...patch }, { helmet: !!patch.helmet, frame: patch.helmet ? 'wide' : 'bust' });
    const dice = button('Pick for me', 'sparkle', () => {
      this.nameInput.value = NAMES[this.rng.int(0, NAMES.length - 1)];
      this.look.name = this.nameInput.value;
      sfx('select');
    }, { size: 'small', color: 'white', id: 'btn-random-name' });
    this.sections.append(
      this.section('Your name', h('div', { class: 'row' }, this.nameInput, dice)),
      this.section('Suit color', this.swatches(SUIT_COLORS, () => L.suit, (c) => (L.suit = c), 'suit')),
      this.section('Stripe color', this.swatches(SUIT_COLORS, () => L.accent, (c) => (L.accent = c), 'accent')),
      this.section('Helmet', this.choices(HELMETS, () => L.helmet, (v) => (L.helmet = v), (v) => mini({ helmet: v }), 'helmet')),
      this.section('Skin', this.swatches(SKIN_TONES, () => L.skin, (c) => (L.skin = c), 'skin')),
      this.section('Hair', this.choices(HAIR_STYLES, () => L.hairStyle, (v) => (L.hairStyle = v), (v) => mini({ hairStyle: v }), 'hair')),
      this.section('Hair color', this.swatches(HAIR_COLORS, () => L.hair, (c) => (L.hair = c), 'haircolor')),
      this.section('Face', this.choices(FACES, () => L.face, (v) => (L.face = v), (v) => mini({ face: v }), 'face')),
      this.section('How hard?', this.difficultyPicker()),
    );
  }

  private difficultyPicker(): HTMLElement {
    const row = h('div', { class: 'row wrap' });
    const mk = (d: Difficulty, label: string, sub: string, icon: string) => {
      const b = h('button', { class: `diff-card ${this.difficulty === d ? 'on' : ''}`, type: 'button', 'data-testid': `diff-${d}` }, iconEl(icon), h('div', { class: 'h3' }, label), h('div', { class: 'muted' }, sub));
      b.addEventListener('click', () => {
        this.difficulty = d;
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
      });
      return b;
    };
    row.append(mk('easy', 'Easy', 'Lots of help. Great for ages 6-7.', 'heart'), mk('normal', 'Normal', 'A bit more challenge.', 'star'));
    row.append(h('div', { class: 'muted' }, 'You can change this any time in Settings.'));
    return row;
  }

  /** Rebuild the 3D astronaut with the current choices, and give a little wave. */
  private refresh(): void {
    if (this.cadet) {
      this.stage.remove(this.cadet.group);
      disposeObject(this.cadet.group);
    }
    this.cadet = buildCadet({ ...this.look });
    this.cadet.group.scale.setScalar(1.15);
    this.cadet.group.rotation.y = this.spin;
    this.stage.add(this.cadet.group);
    this.waveT = 1.4;
  }

  private start(): void {
    const name = (this.nameInput.value || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 12) || NAMES[this.rng.int(0, NAMES.length - 1)];
    this.look.name = name;
    const save = createSave(this.p.slot, { ...this.look }, this.difficulty);
    this.cadet?.setAnim('celebrate');
    sfx('launchUi');
    startSession(save);
    void S.game.go('hub');
  }
}
