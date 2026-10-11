import type { WaveDef } from '../data/waves';
import { Ev, type GameEvent } from '../sim/events';
import { h } from '../ui/dom';
import { pipUrl } from '../ui/modals';
import type { GameScreen } from './GameScreen';

/** Gentle hand-made waves for Pip's Garden. */
export const TUTORIAL_WAVES: WaveDef[] = [
  { n: 1, hp: 0.7, coins: 1, boss: null, groups: [{ enemy: 'gloop', count: 5, gap: 1.2, delay: 0 }] },
  { n: 2, hp: 0.8, coins: 1, boss: null, groups: [{ enemy: 'gloop', count: 6, gap: 1, delay: 0 }, { enemy: 'zoomkin', count: 2, gap: 1, delay: 4 }] },
  { n: 3, hp: 0.9, coins: 1.1, boss: null, groups: [{ enemy: 'gloop', count: 8, gap: 0.9, delay: 0, elements: ['fire', 'water', 'nature', null] }] },
  { n: 4, hp: 1, coins: 1.1, boss: null, groups: [{ enemy: 'gloop', count: 8, gap: 0.9, delay: 0, elements: ['fire', 'nature'] }] },
  { n: 5, hp: 1, coins: 1.2, boss: null, groups: [{ enemy: 'puffbat', count: 5, gap: 1.1, delay: 0 }, { enemy: 'gloop', count: 5, gap: 1, delay: 3 }] },
  { n: 6, hp: 1.1, coins: 1.2, boss: null, groups: [{ enemy: 'clankbot', count: 5, gap: 1.3, delay: 0 }] },
  { n: 7, hp: 1.2, coins: 1.3, boss: null, groups: [{ enemy: 'gloop', count: 10, gap: 0.8, delay: 0, elements: ['fire', 'water', 'nature', 'light', 'shadow', 'earth'] }] },
  {
    n: 8,
    hp: 0.55,
    coins: 1.3,
    boss: 'kinggloop',
    groups: [
      { enemy: 'gloop', count: 6, gap: 0.9, delay: 0 },
      { enemy: 'kinggloop', count: 1, gap: 1, delay: 4 },
    ],
  },
];

interface Step {
  text: string;
  mood?: 'happy' | 'cheeky';
  /** Show a "Next" button instead of waiting for an action. */
  next?: boolean;
  /** CSS selector of a HUD element to make glow. */
  glow?: string;
  /** Map cell to make glow. */
  cell?: [number, number];
  enter?(t: Tutorial): void;
  done?(t: Tutorial): boolean;
}

/**
 * Pip walks new players through building, mazing, upgrading, elements and
 * combos one step at a time. Non-blocking: the map stays playable.
 */
export class Tutorial {
  private i = -1;
  private box: HTMLElement;
  private textEl = h('div.bubble');
  private nextBtn: HTMLButtonElement;
  private glowEl: Element | null = null;
  private towersAtStart = 0;
  private waveCleared = 0;
  readonly steps: Step[];

  constructor(
    readonly s: GameScreen,
    private readonly onSkip: () => void,
  ) {
    this.nextBtn = h('button.btn.green', { onClick: () => this.advance() }, 'Next ▶');
    const skip = h('button.btn.ghost', { onClick: () => this.skip(), 'aria-label': 'Skip tutorial' }, 'Skip');
    this.box = h(
      'div.tutorial.panel',
      { role: 'status', 'aria-live': 'polite' },
      h('img.face', { src: pipUrl('happy', 120), alt: 'Pip' }),
      h('div.tut-body', null, this.textEl, h('div.tut-actions', null, skip, this.nextBtn)),
    );
    const g = s.game;
    const topUp = (n: number): void => {
      if (g.coins < n) g.coins = n;
    };
    this.steps = [
      { text: "Hi, I'm Pip! The Grumblewumps want to borrow our shiny crystals. Let's stop them together!", next: true },
      {
        text: s.touch ? 'Tap the Arrow Post at the bottom to choose it.' : 'Click the Arrow Post at the bottom to choose it.',
        glow: '.drawer .card',
        enter: () => {
          topUp(60);
          if (!s.hud.pinned) s.hud.setDrawerOpen(true);
        },
        done: () => s.buildType === 'arrow',
      },
      {
        text: s.touch ? 'Now tap the glowing square, then tap ✓ to build!' : 'Now click the glowing square to build it!',
        cell: [5, 3],
        enter: () => (this.towersAtStart = g.towers.length),
        done: () => g.towers.length > this.towersAtStart,
      },
      { text: 'Great! Press GO to send the first creatures.', glow: '.next-wave .btn', done: () => g.waveNum >= 1 },
      {
        text: 'Your tower shoots them, and they poof into coins! Watch the wave finish.',
        mood: 'cheeky',
        done: () => this.waveCleared >= 1,
      },
      {
        text: 'Creatures walk AROUND towers. Build on the two glowing squares to make their path longer!',
        cell: [8, 4],
        enter: () => {
          topUp(50);
          this.towersAtStart = g.towers.length;
          if (!s.buildType) s.selectBuild('arrow');
        },
        done: () => {
          if (g.towers.length === this.towersAtStart + 1) this.setCell([8, 2]);
          return g.towers.length >= this.towersAtStart + 2;
        },
      },
      { text: 'See the arrows on the ground? That is the new, longer path. Press GO again!', glow: '.next-wave .btn', enter: () => s.selectBuild(null), done: () => g.waveNum >= 2 },
      { text: 'Nice! Wait for this wave to finish…', done: () => this.waveCleared >= 2 },
      {
        text: s.touch ? 'Now tap one of your towers.' : 'Now click one of your towers.',
        enter: () => topUp(40),
        done: () => !!s.selected,
      },
      { text: 'Tap Upgrade to make it stronger. Each tower can reach level 4!', glow: '.tpanel .btn.green', enter: () => topUp(40), done: () => g.stats.upgrades >= 1 },
      {
        text: 'Ooh, a sparkly Element Crystal! Tap "Pick an element!" and choose a power.',
        glow: '.crystal-btn .btn',
        enter: () => {
          s.deselect();
          g.crystals = Math.max(g.crystals, 1);
        },
        done: () => g.unlocked.length >= 1,
      },
      {
        text: 'Build your new element tower! Look for it in the tower bar.',
        enter: () => {
          topUp(80);
          if (!s.hud.pinned) s.hud.setDrawerOpen(true);
          this.towersAtStart = g.towers.filter((t) => t.def.kind !== 'basic').length;
        },
        done: () => g.towers.filter((t) => t.def.kind !== 'basic').length > this.towersAtStart,
      },
      {
        text: 'Each element beats another: Water beats Fire, Fire beats Nature, Nature beats Water. Light, Shadow and Earth make a circle too!',
        next: true,
      },
      { text: 'Send the next waves! Tip: the 1x button makes the game go faster.', glow: '.next-wave .btn', done: () => g.waveNum >= 4 },
      {
        text: 'Here is ANOTHER crystal! Pick a second element. Two elements make a COMBO tower!',
        glow: '.crystal-btn .btn',
        enter: () => {
          g.crystals = Math.max(g.crystals, 1);
        },
        done: () => g.unlocked.length >= 2,
      },
      {
        text: 'Combo towers are at the end of the tower bar. Build one!',
        enter: () => {
          topUp(160);
          if (!s.hud.pinned) s.hud.setDrawerOpen(true);
        },
        done: () => g.stats.combosBuilt >= 1,
      },
      {
        text: "You're a natural! Beat the last waves to finish my garden. Hold a finger on anything to learn more about it.",
        mood: 'cheeky',
        next: true,
      },
    ];
    s.el.append(this.box);
    s.onEvent((e) => this.onEvent(e));
    s.onFrame(() => this.update());
    this.advance();
  }

  private onEvent(e: GameEvent): void {
    if (e.type === Ev.WaveClear) this.waveCleared = Math.max(this.waveCleared, e.id);
  }

  private setCell(c: [number, number] | null): void {
    this.s.view.setHint(c ? c[0] : -1, c ? c[1] : -1);
  }

  private setGlow(sel: string | undefined): void {
    this.glowEl?.classList.remove('tut-glow');
    this.glowEl = null;
    if (!sel) return;
    const el = this.s.el.querySelector(sel);
    if (el) {
      el.classList.add('tut-glow');
      this.glowEl = el;
    }
  }

  advance(): void {
    this.i++;
    const st = this.steps[this.i];
    if (!st) {
      this.finish();
      return;
    }
    this.textEl.textContent = st.text;
    (this.box.querySelector('img.face') as HTMLImageElement).src = pipUrl(st.mood ?? 'happy', 120);
    this.nextBtn.style.display = st.next ? '' : 'none';
    st.enter?.(this);
    this.setCell(st.cell ?? null);
    this.setGlow(st.glow);
    this.box.classList.remove('pop');
    void this.box.offsetWidth;
    this.box.classList.add('pop');
  }

  private update(): void {
    const st = this.steps[this.i];
    if (!st) return;
    // glow targets can appear later (e.g. tower panel), so retry until found
    if (st.glow && (!this.glowEl || !this.glowEl.isConnected)) this.setGlow(st.glow);
    if (!st.next && st.done?.(this)) this.advance();
  }

  private finish(): void {
    this.setCell(null);
    this.setGlow(undefined);
    this.box.remove();
  }

  private skip(): void {
    this.finish();
    this.i = this.steps.length;
    this.onSkip();
  }
}
