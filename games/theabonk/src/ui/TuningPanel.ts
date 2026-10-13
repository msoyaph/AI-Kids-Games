import {
  cloneTuning,
  diffTuning,
  mergeTuning,
  TUNING_DEFAULTS,
  TUNING_EXPORT_FORMAT,
  TUNING_EXPORT_VERSION,
  TUNING_RANGES,
  type Range,
  type Tuning,
  type TuningGroup,
  type TuningIssue,
} from '../config/tuning';
import { h } from './dom';
import { exportJson, promptJson } from './exporter';

/** What the panel edits besides its own session copy. */
export interface TuningTarget {
  /** The running world's tuning, or null in menus. */
  live(): Tuning | null;
  /** The camera rig's tuning copy. */
  camera(): Tuning['camera'];
  /** Called after any change (persist, recompute derived values, mark run as tuned). */
  changed(group: TuningGroup, key: string): void;
}

const GROUP_TITLES: Record<TuningGroup, string> = {
  movement: 'Movement',
  camera: 'Camera',
  telegraphs: 'Boss & enemy warnings',
  enemies: 'Enemy speed',
  spawns: 'Spawning',
  xp: 'XP curve',
  combat: 'Survival & scaling',
};

const pretty = (k: string): string => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/**
 * Developer tuning panel (only created with ?tune=1). Sliders write into a session copy, the
 * live run's copy and the camera copy at once, so changes are felt immediately.
 * F2 shows/hides it.
 */
export class TuningPanel {
  readonly root: HTMLElement;
  readonly badge: HTMLElement;
  session: Tuning;
  private inputs = new Map<string, { range: HTMLInputElement; num: HTMLInputElement }>();

  constructor(
    private host: HTMLElement,
    private target: TuningTarget,
    initial: Tuning,
  ) {
    this.session = cloneTuning(initial);
    this.badge = h('div', { class: 'tune-badge hidden' }, 'TUNED · not recorded');
    const body = h('div', { class: 'tune-body' });
    for (const g of Object.keys(TUNING_RANGES) as TuningGroup[]) body.append(this.group(g));
    this.root = h(
      'div',
      { class: 'tune-panel' },
      h(
        'div',
        { class: 'tune-head' },
        h('b', null, 'Tuning'),
        h('span', { class: 'tune-hint' }, 'F2 hide'),
        h('button', { class: 'btn small ghost', onclick: () => this.reset() }, 'Reset'),
        h('button', { class: 'btn small ghost', onclick: () => this.export() }, 'Export'),
        h('button', { class: 'btn small ghost', onclick: () => void this.import() }, 'Import'),
      ),
      body,
    );
    host.append(this.root, this.badge);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        e.preventDefault();
        this.root.classList.toggle('hidden');
      }
    });
    this.pushAll();
    this.refreshBadge();
  }

  private group(g: TuningGroup): HTMLElement {
    const ranges = TUNING_RANGES[g] as Record<string, Range>;
    const rows: HTMLElement[] = [];
    for (const key of Object.keys(ranges)) {
      if (g === 'enemies' && key === 'perType') {
        for (const id of Object.keys(this.session.enemies.perType)) rows.push(this.row(g, key, ranges[key], id));
      } else rows.push(this.row(g, key, ranges[key]));
    }
    const d = h('details', { class: 'tune-group', open: g === 'movement' ? true : undefined }, h('summary', null, GROUP_TITLES[g]), ...rows);
    return d;
  }

  private get(g: TuningGroup, key: string, sub?: string): number {
    const grp = this.session[g] as unknown as Record<string, unknown>;
    return sub ? (grp[key] as Record<string, number>)[sub] : (grp[key] as number);
  }

  private row(g: TuningGroup, key: string, r: Range, sub?: string): HTMLElement {
    const [min, max, step] = r;
    const v = this.get(g, key, sub);
    const range = h('input', { type: 'range', min, max, step, value: String(v) }) as HTMLInputElement;
    const num = h('input', { type: 'number', min, max, step, value: String(v), class: 'tune-num' }) as HTMLInputElement;
    const id = `${g}.${key}${sub ? '.' + sub : ''}`;
    this.inputs.set(id, { range, num });
    const set = (raw: string): void => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      const val = Math.min(max, Math.max(min, n));
      this.set(g, key, val, sub);
      range.value = String(val);
      num.value = String(val);
    };
    range.addEventListener('input', () => set(range.value));
    num.addEventListener('change', () => set(num.value));
    // hand the keyboard back to the game after dragging
    range.addEventListener('change', () => range.blur());
    const isDefault = (): boolean => v === this.defaultOf(g, key, sub);
    return h('label', { class: `tune-row${isDefault() ? '' : ' changed'}`, title: id }, h('span', null, sub ? pretty(sub) : pretty(key)), range, num);
  }

  private defaultOf(g: TuningGroup, key: string, sub?: string): number {
    const grp = TUNING_DEFAULTS[g] as unknown as Record<string, unknown>;
    return sub ? (grp[key] as Record<string, number>)[sub] : (grp[key] as number);
  }

  private writeInto(t: Tuning, g: TuningGroup, key: string, val: number, sub?: string): void {
    const grp = t[g] as unknown as Record<string, unknown>;
    if (sub) (grp[key] as Record<string, number>)[sub] = val;
    else grp[key] = val;
  }

  set(g: TuningGroup, key: string, val: number, sub?: string): void {
    this.writeInto(this.session, g, key, val, sub);
    const live = this.target.live();
    if (live) this.writeInto(live, g, key, val, sub);
    if (g === 'camera') (this.target.camera() as unknown as Record<string, number>)[key] = val;
    const row = this.inputs.get(`${g}.${key}${sub ? '.' + sub : ''}`)?.range.closest('.tune-row');
    row?.classList.toggle('changed', val !== this.defaultOf(g, key, sub));
    this.target.changed(g, key);
    this.refreshBadge();
  }

  /** Copy the whole session into the live run + camera (startup, reset, import). */
  private pushAll(): void {
    const live = this.target.live();
    if (live) Object.assign(live, cloneTuning(this.session));
    Object.assign(this.target.camera(), this.session.camera);
    for (const [id, { range, num }] of this.inputs) {
      const [g, key, sub] = id.split('.') as [TuningGroup, string, string?];
      const v = this.get(g, key, sub);
      range.value = String(v);
      num.value = String(v);
      range.closest('.tune-row')?.classList.toggle('changed', v !== this.defaultOf(g, key, sub));
    }
    for (const g of Object.keys(TUNING_RANGES) as TuningGroup[]) this.target.changed(g, '*');
  }

  reset(): void {
    this.session = cloneTuning(TUNING_DEFAULTS);
    this.pushAll();
    this.refreshBadge();
  }

  get overrides(): ReturnType<typeof diffTuning> {
    return diffTuning(TUNING_DEFAULTS, this.session);
  }

  get isTuned(): boolean {
    return Object.keys(this.overrides).length > 0;
  }

  private refreshBadge(): void {
    this.badge.classList.toggle('hidden', !this.isTuned);
  }

  export(): void {
    exportJson('theabonk-tuning.json', { format: TUNING_EXPORT_FORMAT, version: TUNING_EXPORT_VERSION, exportedAt: new Date().toISOString(), values: this.overrides }, this.host);
  }

  async import(): Promise<void> {
    const data = (await promptJson(this.host, 'Import tuning')) as { format?: string; values?: unknown } | null;
    if (!data) return;
    const issues: TuningIssue[] = [];
    this.session = mergeTuning(TUNING_DEFAULTS, data.format === TUNING_EXPORT_FORMAT ? data.values : data, issues);
    for (const i of issues) console.info(`tuning import skipped ${i.path}: ${i.problem}`);
    this.pushAll();
    this.refreshBadge();
  }
}
