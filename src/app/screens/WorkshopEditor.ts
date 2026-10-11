import { blankWorkshop, decodeWorkshop, encodeWorkshop, WS_COLS, WS_ROWS, WS_THEMES, WS_TIERS, WS_TILES, WS_WORDS, type WorkshopMap, type WsTile } from '../../data/workshop';
import { t, type MessageKey } from '../../i18n';
import { checkWorkshop, WorkshopBotRun } from '../../sim/workshopCheck';
import { h } from '../../ui/dom';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';
import { shareCodeBox, workshopMapDef, workshopName } from './WorkshopScreen';
import { showModal } from '../../ui/modals';

/** CSS class per tile (colours/shapes live in styles.css). */
const TILE_CLASS: Record<WsTile, string> = {
  '.': 'open',
  o: 'plate',
  '=': 'road',
  '#': 'rock',
  T: 'tree',
  '~': 'water',
  B: 'bush',
  S: 'spawn',
  C: 'castle',
  P: 'gatein',
  Q: 'gateout',
};

export class WorkshopEditor implements Screen {
  readonly el: HTMLElement;
  private map: WorkshopMap;
  private cells: HTMLElement[] = [];
  private tool: WsTile = '#';
  private painting = false;
  private problems = h('div.ws-problems');
  private title = h('h2');
  private testBox = h('div.ws-test');
  private toolsEl = h('div.ws-tools', { role: 'radiogroup', 'aria-label': t('workshop.tools') });
  private themeEl = h('div.seg');
  private tierEl = h('div.seg');
  private run: WorkshopBotRun | null = null;
  private raf = 0;

  constructor(
    private readonly app: App,
    private readonly nav: Nav,
    private readonly slot: number,
  ) {
    const dec = decodeWorkshop(app.save.data.workshop[slot]?.code ?? '');
    this.map = 'map' in dec ? dec.map : blankWorkshop();
    const grid = h('div.ws-grid', { style: `--cols:${WS_COLS};--rows:${WS_ROWS}`, role: 'grid', 'aria-label': t('workshop.title') });
    for (let y = 0; y < WS_ROWS; y++) {
      for (let x = 0; x < WS_COLS; x++) {
        const c = h('div.ws-cell', { 'data-x': String(x), 'data-y': String(y) });
        this.cells.push(c);
        grid.append(c);
      }
    }
    const paintAt = (ev: PointerEvent): void => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      if (!el?.classList.contains('ws-cell')) return;
      this.paint(Number(el.dataset.x), Number(el.dataset.y), ev.type === 'pointerdown');
    };
    grid.addEventListener('pointerdown', (ev) => {
      this.painting = true;
      grid.setPointerCapture?.(ev.pointerId);
      paintAt(ev);
    });
    grid.addEventListener('pointermove', (ev) => this.painting && this.tool !== 'C' && this.tool !== 'P' && this.tool !== 'Q' && paintAt(ev));
    const stop = (): void => {
      this.painting = false;
    };
    grid.addEventListener('pointerup', stop);
    grid.addEventListener('pointercancel', stop);

    for (const tile of WS_TILES) {
      const b = h('button.ws-tool', { role: 'radio', title: t(`workshop.tile.${tile}` as MessageKey), onClick: () => this.pickTool(tile) }, h('span.ws-swatch', { class: TILE_CLASS[tile] }), h('span', null, t(`workshop.tile.${tile}` as MessageKey)));
      b.dataset.tile = tile;
      this.toolsEl.append(b);
    }

    this.el = h(
      'div.screen.menu.ws-editor',
      null,
      h(
        'div.topbar',
        null,
        h('button.btn.round', { onClick: () => this.leave(), 'aria-label': t('common.back') }, '←'),
        this.title,
        h('button.btn', { onClick: () => this.rename() }, t('workshop.rename')),
        h('button.btn.gold', { onClick: () => this.save(true) }, t('workshop.save')),
      ),
      h(
        'div.ws-layout',
        null,
        h('div.ws-side.panel', null, h('h3.section', null, t('workshop.tools')), this.toolsEl, h('h3.section', null, t('workshop.theme')), this.themeEl, h('h3.section', null, t('workshop.tier')), this.tierEl),
        h('div.ws-board', null, grid),
        h(
          'div.ws-side.panel',
          null,
          h('h3.section', null, t('workshop.problems')),
          this.problems,
          h('h3.section', null, t('workshop.test')),
          this.testBox,
          h(
            'div.row',
            null,
            h('button.btn', { onClick: () => this.startTest() }, t('workshop.test')),
            h('button.btn.green', { onClick: () => this.playtest() }, t('workshop.playtest')),
            h('button.btn.gold', { onClick: () => this.share() }, t('workshop.share')),
          ),
        ),
      ),
    );
    this.pickTool('#');
    this.refresh();
  }

  private pickTool(tile: WsTile): void {
    this.tool = tile;
    for (const b of this.toolsEl.children) {
      const on = (b as HTMLElement).dataset.tile === tile;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
  }

  private get(x: number, y: number): WsTile {
    return (this.map.grid[y]![x] ?? '#') as WsTile;
  }

  private set(x: number, y: number, tile: WsTile): void {
    if (x < 0 || y < 0 || x >= WS_COLS || y >= WS_ROWS) return;
    const row = this.map.grid[y]!;
    this.map.grid[y] = row.slice(0, x) + tile + row.slice(x + 1);
  }

  private paint(x: number, y: number, first: boolean): void {
    const tool = this.tool;
    if (tool === 'C') {
      if (!first) return;
      // tap a citadel to remove it; otherwise place a 2×2 citadel (at most two)
      if (this.get(x, y) === 'C') {
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          if (this.get(cx!, cy!) !== 'C') continue;
          this.set(cx!, cy!, '.');
          stack.push([cx! + 1, cy!], [cx! - 1, cy!], [cx!, cy! + 1], [cx!, cy! - 1]);
        }
      } else {
        const count = this.map.grid.join('').split('C').length - 1;
        if (count >= 8) {
          this.nav.toast(t('workshop.problem.castleShape'));
          return;
        }
        const x0 = Math.min(x, WS_COLS - 2);
        const y0 = Math.min(y, WS_ROWS - 2);
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const)
          this.set(x0 + dx, y0 + dy, 'C');
      }
    } else if (tool === 'P' || tool === 'Q') {
      if (!first) return;
      // one gate of each kind: placing moves it
      for (let yy = 0; yy < WS_ROWS; yy++) for (let xx = 0; xx < WS_COLS; xx++) if (this.get(xx, yy) === tool) this.set(xx, yy, '.');
      this.set(x, y, tool);
    } else {
      if (this.get(x, y) === 'C') return; // erase citadels with the citadel tool
      this.set(x, y, tool);
    }
    this.changed();
  }

  /** Any edit clears the bot-tested flag. */
  private changed(): void {
    const s = this.app.save.data.workshop[this.slot];
    if (s) s.validated = false;
    this.stopTest();
    this.testBox.replaceChildren();
    this.refresh();
  }

  private refresh(): void {
    for (let y = 0; y < WS_ROWS; y++)
      for (let x = 0; x < WS_COLS; x++) {
        const c = this.cells[y * WS_COLS + x]!;
        c.className = `ws-cell ${TILE_CLASS[this.get(x, y)]}`;
      }
    this.title.textContent = t('workshop.editTitle', { name: workshopName(this.map) });
    const def = workshopMapDef(this.map);
    const probs = checkWorkshop(def);
    this.problems.replaceChildren(...(probs.length ? probs.map((p) => h('p.bad', null, t(`workshop.problem.${p}` as MessageKey))) : [h('p.good', null, t('workshop.ok'))]));
    this.themeEl.replaceChildren(
      ...WS_THEMES.map((th) =>
        h(
          'button.btn',
          {
            class: th === this.map.theme ? 'on' : '',
            onClick: () => {
              this.map.theme = th;
              this.changed();
            },
          },
          t(`workshop.theme.${th}` as MessageKey),
        ),
      ),
    );
    this.tierEl.replaceChildren(
      ...WS_TIERS.map((n) =>
        h(
          'button.btn',
          {
            class: n === this.map.tier ? 'on' : '',
            title: t('workshop.tierHelp', { n }),
            onClick: () => {
              this.map.tier = n;
              this.changed();
            },
          },
          String(n),
        ),
      ),
    );
  }

  private rename(): void {
    this.map.adj = Math.floor(Math.random() * WS_WORDS);
    this.map.noun = Math.floor(Math.random() * WS_WORDS);
    this.save(false);
    this.refresh();
  }

  private save(toast: boolean): void {
    const s = this.app.save.data.workshop[this.slot];
    if (!s) return;
    s.code = encodeWorkshop(this.map);
    s.updated = Date.now();
    this.app.save.flush();
    if (toast) this.nav.toast(t('workshop.saved'));
  }

  private startTest(): void {
    const def = workshopMapDef(this.map);
    if (checkWorkshop(def).length) {
      this.testBox.replaceChildren(h('p.bad', null, t('workshop.testFix')));
      return;
    }
    this.stopTest();
    this.run = new WorkshopBotRun(def, 'normal', 1);
    const bar = h('i');
    const label = h('p.note');
    this.testBox.replaceChildren(h('div.ws-progress', null, bar), label);
    const tick = (): void => {
      const r = this.run;
      if (!r) return;
      r.stepFor(14);
      bar.style.width = `${Math.round(r.progress * 100)}%`;
      label.textContent = t('workshop.testing', { n: r.game.waveNum });
      if (!r.done) {
        this.raf = requestAnimationFrame(tick);
        return;
      }
      const s = this.app.save.data.workshop[this.slot];
      if (s) {
        s.validated = r.won;
        this.save(false);
      }
      this.testBox.replaceChildren(h(r.won ? 'p.good' : 'p.bad', null, r.won ? t('workshop.testWon') : t('workshop.testLost', { n: r.game.waveNum })));
      this.run = null;
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopTest(): void {
    cancelAnimationFrame(this.raf);
    this.run = null;
  }

  private playtest(): void {
    const def = workshopMapDef(this.map);
    if (checkWorkshop(def).length) {
      this.nav.toast(t('workshop.testFix'));
      return;
    }
    this.save(false);
    this.nav.playWorkshop(def);
  }

  private share(): void {
    this.save(false);
    const s = this.app.save.data.workshop[this.slot];
    if (!s?.validated) {
      this.nav.toast(t('workshop.needTest'));
      return;
    }
    const m = showModal(this.app.ui, [h('h2', null, t('workshop.shareTitle')), ...shareCodeBox(this.app, s.code), h('div.row', null, h('button.btn', { onClick: () => m.close() }, t('common.close')))], {
      onBackdrop: () => m.close(),
      cls: 'wide',
    });
  }

  private leave(): void {
    this.stopTest();
    this.save(false);
    this.nav.workshop();
  }

  back(): boolean {
    this.leave();
    return true;
  }

  exit(): void {
    this.stopTest();
  }
}
