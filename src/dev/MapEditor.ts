/**
 * DEV-ONLY map editor (`?editor=1` on the dev server). Paint a grid, preview
 * the themed terrain, validate paths, copy the ASCII into a world file and
 * play-test instantly. Never included in production builds.
 */
import type { App, Screen } from '../app/App';
import type { Nav } from '../app/flow';
import type { MapDef, ThemeId } from '../data/maps/types';
import { paintMap } from '../render/MapPainter';
import { FlowField, UNREACHABLE } from '../sim/flowField';
import { Grid } from '../sim/grid';
import { h } from '../ui/dom';

const BRUSHES: [string, string, string][] = [
  ['.', 'Open (walk + build)', '#7fd36a'],
  ['o', 'Build only', '#4f9e45'],
  ['=', 'Road', '#e8c58a'],
  ['#', 'Rock', '#8e88a6'],
  ['T', 'Tree / cactus', '#2f7a3a'],
  ['~', 'Water', '#3aa8f0'],
  ['B', 'Bush', '#5fbf55'],
  ['S', 'Spawn', '#b04aff'],
  ['C', 'Castle', '#e0dcff'],
];

export class MapEditor implements Screen {
  readonly el: HTMLElement;
  private cols = 20;
  private rows = 12;
  private cells: string[][] = [];
  private brush = '.';
  private theme: ThemeId = 'meadow';
  private style: 'maze' | 'path' = 'maze';
  private gridEl = h('div');
  private preview = h('div', { style: 'max-width:100%;overflow:auto' });
  private status = h('div', { style: 'font-weight:800;margin:6px 0' });
  private text = h('textarea', { rows: '14', style: 'width:100%;font-family:ui-monospace,monospace;font-size:14px', spellcheck: 'false' });
  private painting = false;
  private timer = 0;

  constructor(
    _app: App,
    private readonly nav: Nav,
  ) {
    this.reset();
    const brushRow = h('div.seg');
    for (const [ch, label, color] of BRUSHES) {
      const b = h('button.btn', { title: label, style: { background: color, color: '#111', textShadow: 'none' } }, `${ch} ${label}`);
      b.addEventListener('click', () => {
        this.brush = ch;
        brushRow.querySelectorAll('.btn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      });
      brushRow.append(b);
    }
    const themeSel = h('select', null, ...(['meadow', 'desert', 'snow', 'caves'] as ThemeId[]).map((t) => h('option', { value: t }, t)));
    themeSel.addEventListener('change', () => ((this.theme = themeSel.value as ThemeId), this.refresh()));
    const styleSel = h('select', null, h('option', { value: 'maze' }, 'maze'), h('option', { value: 'path' }, 'path'));
    styleSel.addEventListener('change', () => ((this.style = styleSel.value as 'maze' | 'path'), this.refresh()));
    this.text.addEventListener('change', () => this.importText(this.text.value));
    addEventListener('pointerup', () => (this.painting = false));
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title() }, '←'), h('h2', null, '🛠 Map editor (dev)')),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px' }, 'Theme', themeSel, 'Style', styleSel, h('button.btn', { onClick: () => (this.reset(), this.refresh()) }, 'New'), h('button.btn.green', { onClick: () => this.playtest() }, '▶ Play test'), h('button.btn', { onClick: () => void navigator.clipboard?.writeText(this.ascii()) }, 'Copy ASCII')),
      brushRow,
      this.status,
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start' }, this.gridEl, this.preview),
      this.text,
    );
    this.refresh();
  }

  private reset(): void {
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.cols; x++) row.push(x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1 ? 'T' : '.');
      this.cells.push(row);
    }
    this.cells[5]![0] = 'S';
    this.cells[5]![18] = this.cells[5]![19] = this.cells[6]![18] = this.cells[6]![19] = 'C';
  }

  private ascii(): string {
    return this.cells.map((r) => `      '${r.join('')}',`).join('\n');
  }

  private importText(t: string): void {
    const rows = t
      .split('\n')
      .map((l) => l.replace(/^[\s']*|[',\s]*$/g, ''))
      .filter((l) => l.length > 0);
    if (!rows.length) return;
    this.rows = rows.length;
    this.cols = Math.max(...rows.map((r) => r.length));
    this.cells = rows.map((r) => r.padEnd(this.cols, '#').split(''));
    this.refresh();
  }

  private map(): MapDef {
    return { id: 'custom', name: 'Custom map', world: 1, theme: this.theme, style: this.style, story: 'A brand new map!', grid: this.cells.map((r) => r.join('')) };
  }

  private refresh(): void {
    // grid of paintable cells
    this.gridEl.replaceChildren();
    this.gridEl.style.cssText = `display:grid;grid-template-columns:repeat(${this.cols},22px);gap:1px;user-select:none;touch-action:none`;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ch = this.cells[y]![x]!;
        const color = BRUSHES.find((b) => b[0] === ch)?.[2] ?? '#333';
        const c = h('div', { style: `width:22px;height:22px;background:${color};color:#111;font:700 12px monospace;display:flex;align-items:center;justify-content:center;cursor:pointer` }, ch);
        const paint = (): void => {
          this.cells[y]![x] = this.brush;
          this.refresh();
        };
        c.addEventListener('pointerdown', () => ((this.painting = true), paint()));
        c.addEventListener('pointerenter', () => this.painting && paint());
        this.gridEl.append(c);
      }
    }
    this.text.value = this.ascii();
    // validation
    try {
      const g = new Grid(this.map());
      const f = new FlowField(g);
      f.compute();
      const ok = g.spawns.every((s) => f.dist[s]! < UNREACHABLE);
      let len = 0;
      for (const s of g.spawns) len = Math.max(len, f.dist[s]!);
      this.status.textContent = ok ? `✓ OK — spawns: ${g.spawns.length}, castle cells: ${g.goals.length}, path length ${len.toFixed(1)}` : '✗ A spawn cannot reach the castle!';
      this.status.style.color = ok ? '#9cff7a' : '#ff8a9a';
    } catch (e) {
      this.status.textContent = `✗ ${(e as Error).message}`;
      this.status.style.color = '#ff8a9a';
    }
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const canvas = paintMap(this.map(), 0.4);
      canvas.style.cssText = 'max-width:520px;width:100%;border-radius:10px';
      this.preview.replaceChildren(canvas);
    }, 150);
  }

  private playtest(): void {
    this.nav.play(this.map(), 'normal', 'campaign');
  }
}
