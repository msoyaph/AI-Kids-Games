/**
 * The tools, and what a tap or a drag does with each. Everything ends in a sim action (sim/actions.ts),
 * so the bot and the tests play by the same rules.
 *
 * - **Look:** tap a business's coin bubble to collect it; tap anything else for its card.
 * - **Roads:** drag across the grid (or tap the start, then the end) to draw an L-shaped road; the
 *   preview shows each new tile, anything in the way, and the cost. Bike lanes and tram tracks are
 *   drawn along roads the same way; Remove takes a road back for a full refund.
 * - **Zones:** drag a rectangle (or tap two corners) to paint homes, shops, workplaces or parks.
 * - **Parks, Services, Transit, Build:** pick something from the tray; its ghost follows the mouse or
 *   the cursor (a tap moves it on touch screens); tap it again, or press Place.
 * - **Maps:** colour the town by happiness, a service's reach, traffic or greenery.
 * - **City Hall:** the budget, the charts and the town's numbers.
 * Undo (Ctrl/Cmd + Z or the tray's button) steps back through this tool's changes.
 */
import { sfx } from '../audio/engine';
import { THING } from '../data/things';
import { act, roadBlocked, roadCost, type Action, type Result } from '../sim/actions';
import { isRoad } from '../sim/roads';
import { ZONE, type Rot, type Town } from '../sim/state';
import type { Sim } from '../sim/tick';
import { laneOpen, thingOpen, toolOpen, zoneOpen } from '../sim/unlocks';
import { canPlace, thingAt, thingById, WHY_TEXT } from '../sim/world';
import type { Picked, TileRef } from '../input/pick';
import type { Ghost } from '../render/ghost';
import { MARK } from '../render/marks';
import type { CityView } from '../render/view';
import { fill, h } from '../ui/h';
import type { ToolId } from '../ui/hud';
import { icon } from '../ui/icons';
import type { Panels } from '../ui/panels';

export type Overlay = 'off' | 'happy' | 'traffic' | 'green' | `svc:${string}`;

export interface PlayDeps {
  town(): Town;
  sim(): Sim;
  view: CityView;
  ghost: Ghost;
  panels: Panels;
  root: HTMLElement;
  say(text: string): void;
  float(x: number, z: number, text: string, kind?: 'good' | 'info'): void;
  changed(): void;
  toolChanged(): void;
  info(thingId: number): void;
  cityHall(): void;
  overlay(o: Overlay): void;
}

const ZONES = [
  { zone: ZONE.home, label: 'Homes', color: 0x8fe0c0 },
  { zone: ZONE.shop, label: 'Shops', color: 0x8fc8f2 },
  { zone: ZONE.work, label: 'Workplaces', color: 0xf6d27a },
  { zone: ZONE.park, label: 'Parks', color: 0x9ad87a },
  { zone: ZONE.none, label: 'Clear', color: 0xffffff },
] as const;

export const CATALOG: Record<'park' | 'services' | 'transit' | 'build', readonly string[]> = {
  park: ['tree', 'blossom', 'pine', 'bush', 'flowerbed', 'bench', 'picnic', 'arch', 'fountain', 'playground', 'pond', 'skatepark'],
  services: ['school', 'library', 'clinic', 'safety', 'community', 'recycling'],
  transit: ['busstop', 'tramstop'],
  build: ['ferris', 'glasshouse', 'aquarium', 'observatory', 'stage', 'postbox', 'bin', 'hydrant'],
};
const ROUTE_COLORS = [0x2fa3b0, 0xef6a55, 0xf2a93b, 0x5f7fd0, 0x5fbf7a, 0xb08ae0, 0xff8a5a, 0x4a5a6a];

interface Snapshot { roads: Uint8Array; rflags: Uint8Array; zones: Uint8Array; finish: Uint8Array; things: string; routes: string; coins: number; nextId: number }

export class Play {
  tool: ToolId = 'look';
  /** The tool's choice in the tray: a road kind, a zone, an item to place, a map. */
  sub = '';
  /** Where a two-tap road or zone started (gamepad, keyboard, or a tap without a drag). */
  private pending: TileRef | null = null;
  private drag: { from: TileRef; to: TileRef } | null = null;
  placing: { def: string; x: number; z: number; rot: Rot; moved: boolean; moving?: number } | null = null;
  route: number[] | null = null;
  private undo: Snapshot[] = [];
  readonly tray: HTMLElement;
  readonly bar: HTMLElement;

  constructor(private d: PlayDeps) {
    this.tray = h('div.tray', { role: 'toolbar', 'aria-label': 'Tool options' });
    this.bar = h('div.place-bar', { role: 'toolbar', 'aria-label': 'Placing' });
    this.tray.hidden = true;
    this.bar.hidden = true;
    d.root.append(this.tray, this.bar);
  }

  private get town() { return this.d.town(); }

  /** Pick a tool from the tool bar (number keys and the gamepad's X go here too). */
  pickTool(id: ToolId) {
    if (!toolOpen(this.town, id)) { this.d.say('That tool opens later in the story.'); return; }
    if (id === 'cityhall') { this.d.cityHall(); return; }
    this.cancel();
    if (this.tool !== id) this.undo = [];
    this.tool = id;
    this.sub = id === 'road' ? 'street' : id === 'zones' ? 'homes' : id === 'maps' ? 'happy' : '';
    if (id === 'maps') this.d.overlay('happy');
    else this.d.overlay('off');
    sfx.tap();
    this.renderTray();
    this.d.toolChanged();
  }

  /** Back to Look (Escape / gamepad B when nothing else is open). */
  cancel(): boolean {
    const had = !!(this.placing || this.pending || this.drag || this.route);
    this.placing = null;
    this.pending = null;
    this.drag = null;
    this.route = null;
    this.d.ghost.hide();
    this.d.view.marks.clear();
    this.bar.hidden = true;
    return had;
  }

  back(): boolean {
    if (this.cancel()) { this.renderTray(); return true; }
    if (this.tool !== 'look') { this.pickTool('look'); return true; }
    return false;
  }

  // --- the tray ---
  renderTray() {
    const t = this.town;
    const chips: Node[] = [];
    const chip = (label: string, on: boolean, click: () => void, extra?: Node | null, disabled = false) => h('button.chip', { 'aria-pressed': String(on), disabled, onclick: click }, extra ?? null, h('span', null, label));
    if (this.tool === 'road') {
      chips.push(chip('Street', this.sub === 'street', () => this.setSub('street'), icon('road', 22)));
      if (laneOpen(t, 'bike')) chips.push(chip('Bike lane', this.sub === 'bike', () => this.setSub('bike')));
      if (laneOpen(t, 'tram')) chips.push(chip('Tram tracks', this.sub === 'tram', () => this.setSub('tram')));
      chips.push(chip('Remove', this.sub === 'remove', () => this.setSub('remove'), icon('trash', 22)));
    } else if (this.tool === 'zones') {
      for (const z of ZONES) if (zoneOpen(t, z.zone) || z.zone === ZONE.none) chips.push(chip(z.label, this.sub === String(z.label).toLowerCase(), () => this.setSub(z.label.toLowerCase()), h('i.swatch', { style: `background:#${z.color.toString(16).padStart(6, '0')}` })));
    } else if (this.tool === 'park' || this.tool === 'services' || this.tool === 'transit' || this.tool === 'build') {
      for (const def of CATALOG[this.tool]) {
        const d = THING[def]!;
        const open = thingOpen(t, def);
        const cost = t.mode === 'creative' ? '' : ` · ${d.cost ?? 0}`;
        chips.push(chip(open ? `${d.name}${cost}` : `${d.name} (later)`, this.placing?.def === def, () => this.startPlacing(def), null, !open));
      }
      if (this.tool === 'transit') chips.push(chip(this.route ? `Done (${this.route.length} stops)` : 'New bus route', !!this.route, () => this.toggleRoute(), icon('transit', 22), !t.things.some(x => x.def === 'busstop')));
      if (this.tool === 'build') {
        chips.push(chip('Move', this.sub === 'move', () => this.setSub('move'), icon('move', 22)));
        chips.push(chip('Remove', this.sub === 'remove', () => this.setSub('remove'), icon('trash', 22)));
      }
    } else if (this.tool === 'maps') {
      chips.push(chip('Happiness', this.sub === 'happy', () => this.setMap('happy')));
      for (const s of ['school', 'library', 'clinic', 'safety', 'community', 'recycling'] as const) if (thingOpen(t, s)) chips.push(chip(THING[s]!.name, this.sub === `svc:${s}`, () => this.setMap(`svc:${s}`)));
      if (toolOpen(t, 'transit')) chips.push(chip('Traffic', this.sub === 'traffic', () => this.setMap('traffic')));
      chips.push(chip('Greenery', this.sub === 'green', () => this.setMap('green')));
    }
    if (this.undo.length && this.tool !== 'maps') chips.push(chip('Undo', false, () => this.undoLast(), icon('undo', 22)));
    fill(this.tray, ...chips);
    this.tray.hidden = !chips.length || this.tool === 'look';
  }

  private setSub(sub: string) {
    this.cancel();
    this.sub = this.sub === sub && (this.tool === 'build') ? '' : sub;
    sfx.tap();
    this.renderTray();
    this.d.toolChanged();
  }

  private setMap(o: Overlay) { this.sub = o; this.d.overlay(o); sfx.tap(); this.renderTray(); }

  // --- drags (roads, lanes and zones) ---
  wantsPaint(_tile: TileRef): boolean {
    return this.tool === 'road' || this.tool === 'zones';
  }

  paintTile(tile: TileRef) {
    if (!this.drag) this.drag = { from: tile, to: tile };
    else this.drag.to = tile;
    this.preview();
  }

  paintEnd() {
    if (!this.drag) return;
    const { from, to } = this.drag;
    this.drag = null;
    this.commitSpan(from, to);
  }

  /** A road, lane or zone from one tile to another. */
  private commitSpan(from: TileRef, to: TileRef) {
    const t = this.town;
    if (this.tool === 'road') {
      const tiles = lPath(from, to);
      if (this.sub === 'remove') this.run({ type: 'unroad', tiles }, `Road removed`, 'road');
      else if (this.sub === 'bike' || this.sub === 'tram') this.run({ type: 'lane', lane: this.sub, tiles, on: true }, this.sub === 'bike' ? 'Bike lane painted!' : 'Tram tracks laid!', 'road');
      else {
        const blocked = tiles.map(([x, z]) => roadBlocked(t, x, z)).find(Boolean);
        if (blocked) { this.nope(blocked); return; }
        const r = this.run({ type: 'road', tiles }, null, 'road');
        if (r.ok && r.n) this.d.float(to.x, to.z, t.mode === 'creative' ? 'Road!' : `−${r.coins}`, 'info');
      }
    } else if (this.tool === 'zones') {
      const z = ZONES.find(x => x.label.toLowerCase() === this.sub) ?? ZONES[0];
      this.run({ type: 'zone', x0: from.x, z0: from.z, x1: to.x, z1: to.z, zone: z.zone }, null, 'zone');
    }
    this.d.view.marks.clear();
  }

  // --- taps ---
  tapTile(tile: Picked, via: 'touch' | 'mouse' | 'pad' | 'key') {
    const t = this.town;
    if (this.placing) { this.tapPlacing(tile, via); return; }
    if (this.tool === 'road' || this.tool === 'zones') {
      // two taps: the start, then the end
      if (!this.pending) { this.pending = { x: tile.x, z: tile.z }; this.preview(); sfx.tap(); return; }
      const from = this.pending;
      this.pending = null;
      this.commitSpan(from, tile);
      return;
    }
    const thing = tile.id ? thingById(t, tile.id) : thingAt(t, tile.x, tile.z);
    if (this.tool === 'transit' && this.route) {
      if (thing?.def === 'busstop') {
        if (this.route.at(-1) !== thing.id) this.route.push(thing.id);
        sfx.place();
        this.d.float(thing.x, thing.z, `Stop ${this.route.length}`, 'info');
        this.renderTray();
      } else this.nope('Tap the bus stops in the order the bus should visit them.');
      return;
    }
    if (this.tool === 'build' && thing && (this.sub === 'move' || this.sub === 'remove')) {
      if (this.sub === 'remove') this.confirmRemove(thing.id);
      else this.placing = { def: thing.def, x: thing.x, z: thing.z, rot: thing.rot, moved: false, moving: thing.id };
      this.showPlacing();
      return;
    }
    if (!thing) return;
    // Look (and any tool): a full-enough bubble collects; otherwise the card
    if (thing.pay >= 1) {
      const r = act(t, { type: 'collect', id: thing.id });
      if (r.ok) { sfx.coins(-(r.coins ?? 0) >= 10); this.d.float(thing.x + 0.5, thing.z + 0.5, `+${-(r.coins ?? 0)}`); this.d.changed(); return; }
    }
    this.d.info(thing.id);
  }

  // --- placing ---
  startPlacing(def: string) {
    const v = this.d.view;
    const z = Math.floor(v.goal.z), x = Math.floor(v.goal.x);
    this.cancel();
    this.placing = { def, x, z, rot: 0, moved: false };
    this.showPlacing();
    this.renderTray();
    this.d.toolChanged();
  }

  turnPlacing() { if (this.placing) { this.placing.rot = ((this.placing.rot + 1) % 4) as Rot; sfx.turn(); this.showPlacing(); } }

  /** The mouse or the gamepad cursor carries the ghost. */
  hover(tile: TileRef | null) {
    if (this.placing && tile && (tile.x !== this.placing.x || tile.z !== this.placing.z)) { this.placing.x = tile.x; this.placing.z = tile.z; this.placing.moved = true; this.showPlacing(); }
    else if (!this.placing && (this.tool === 'road' || this.tool === 'zones') && !this.drag) this.preview(tile);
  }

  private tapPlacing(tile: TileRef, via: string) {
    const p = this.placing!;
    const same = tile.x === p.x && tile.z === p.z;
    // touch: the first tap moves the ghost, a tap on it places; mouse and pad place at once
    if (!same && via === 'touch') { p.x = tile.x; p.z = tile.z; p.moved = true; this.showPlacing(); sfx.tap(); return; }
    p.x = tile.x; p.z = tile.z;
    this.confirmPlacing();
  }

  confirmPlacing() {
    const p = this.placing;
    if (!p) return;
    const r = p.moving
      ? this.run({ type: 'move', id: p.moving, x: p.x, z: p.z, rot: p.rot }, 'Moved!', 'place')
      : this.run({ type: 'place', def: p.def, x: p.x, z: p.z, rot: p.rot }, null, 'place');
    if (!r.ok) return;
    const d = THING[p.def]!;
    if (!p.moving && r.coins) this.d.float(p.x + 0.5, p.z + 0.5, `−${r.coins}`, 'info');
    // small things: keep placing the same; big ones: back to the tray
    if (p.moving || d.w * d.d > 1) { this.cancel(); this.renderTray(); }
    else { p.moved = false; this.showPlacing(); }
  }

  private showPlacing() {
    const p = this.placing;
    if (!p) return;
    const fits = canPlace(this.town, p.def, p.x, p.z, p.rot, p.moving ?? 0);
    this.d.ghost.show(p.def, p.x, p.z, p.rot, fits === 'ok');
    const d = THING[p.def]!;
    const cost = this.town.mode === 'creative' || p.moving ? '' : ` · ${d.cost ?? 0}`;
    fill(this.bar,
      h('span.place-name', null, h('b', null, p.moving ? `Moving: ${d.name}` : d.name), h('small', null, fits === 'ok' ? (p.moved ? 'Tap it again or press Place' : 'Tap where it should go') : WHY_TEXT[fits])),
      d.w !== d.d ? h('button', { 'aria-label': 'Turn it (R)', onclick: () => this.turnPlacing() }, icon('turn', 24), 'Turn') : h('button', { 'aria-label': 'Turn it (R)', onclick: () => this.turnPlacing() }, icon('turn', 24)),
      h('button.go', { disabled: fits !== 'ok', onclick: () => this.confirmPlacing() }, icon('check', 24), `Place${cost}`),
      h('button', { 'aria-label': 'Cancel', onclick: () => { this.cancel(); this.renderTray(); } }, icon('close', 22)));
    this.bar.hidden = false;
  }

  private confirmRemove(id: number) {
    const t = this.town;
    const thing = thingById(t, id);
    if (!thing) return;
    const d = THING[thing.def]!;
    const back = t.mode === 'creative' ? 0 : d.cost ?? 0;
    this.d.panels.show(`Remove the ${d.name.toLowerCase()}?`, h('div', null,
      h('p', null, d.zone ? 'The lot stays zoned, so something new will grow there.' : back ? `You get all ${back} coins back.` : 'You can build it again any time.'),
      h('div.row', null,
        h('button.go', { onclick: () => { this.d.panels.close(); this.run({ type: 'remove', id }, 'Removed.', 'place'); } }, 'Remove it'),
        h('button', { onclick: () => this.d.panels.close() }, 'Keep it'))), { kind: 'card', keepsTime: true });
  }

  // --- bus routes ---
  private toggleRoute() {
    if (!this.route) { this.cancel(); this.route = []; this.d.say('Tap the bus stops in the order the bus should visit them, then tap Done.'); this.renderTray(); return; }
    const stops = this.route;
    this.route = null;
    const r = this.run({ type: 'route', stops, color: ROUTE_COLORS[this.town.routes.length % ROUTE_COLORS.length]! }, null, 'bus');
    if (r.ok) this.d.say(`Bus route ${this.town.routes.length} is running! Kofi waves from the driver’s seat.`);
    this.renderTray();
  }

  // --- running actions, with undo ---
  private snapshot(): Snapshot {
    const t = this.town;
    return { roads: t.roads.slice(), rflags: t.rflags.slice(), zones: t.zones.slice(), finish: t.finish.slice(), things: JSON.stringify(t.things), routes: JSON.stringify(t.routes), coins: t.coins, nextId: t.nextId };
  }

  run(a: Action, said: string | null, sound: 'road' | 'zone' | 'place' | 'bus'): Result {
    const before = this.snapshot();
    const r = act(this.town, a);
    if (!r.ok) { this.nope(r.why); return r; }
    this.undo.push(before);
    if (this.undo.length > 30) this.undo.shift();
    if (sound === 'road') sfx.road(); else if (sound === 'zone') sfx.zone(); else if (sound === 'bus') sfx.bus(); else sfx.place();
    if (said) this.d.say(said);
    this.d.sim().refresh(true);
    this.d.changed();
    this.renderTray();
    return r;
  }

  undoLast() {
    const s = this.undo.pop();
    if (!s) return;
    const t = this.town;
    t.roads.set(s.roads); t.rflags.set(s.rflags); t.zones.set(s.zones); t.finish.set(s.finish);
    t.things = JSON.parse(s.things);
    t.routes = JSON.parse(s.routes);
    t.coins = s.coins; t.nextId = s.nextId;
    t.version = (t.version ?? 0) + 1;
    sfx.back();
    this.d.sim().refresh(true);
    this.d.changed();
    this.renderTray();
  }

  private nope(why: string) { sfx.nope(); this.d.say(why); }

  // --- previews ---
  preview(hover?: TileRef | null) {
    const t = this.town;
    const marks = this.d.view.marks;
    const span = this.drag ?? (this.pending && hover ? { from: this.pending, to: hover } : this.pending ? { from: this.pending, to: this.pending } : null);
    if (!span) { marks.clear(); marks.cursor(hover ?? null); return; }
    marks.cursor(null);
    if (this.tool === 'road') {
      const tiles = lPath(span.from, span.to);
      const remove = this.sub === 'remove', lane = this.sub === 'bike' || this.sub === 'tram';
      marks.set(tiles.map(([x, z]) => ({ x, z, color: remove || lane ? (isRoad(t, x, z) ? (remove ? MARK.no : MARK.ok) : MARK.info) : roadBlocked(t, x, z) ? MARK.no : isRoad(t, x, z) ? MARK.info : MARK.road })));
      if (!remove && !lane) this.showSpanBar(`${tiles.filter(([x, z]) => !isRoad(t, x, z)).length} new road tiles`, t.mode === 'creative' ? '' : `${roadCost(t, tiles)} coins`);
    } else if (this.tool === 'zones') {
      const z = ZONES.find(x => x.label.toLowerCase() === this.sub) ?? ZONES[0];
      const out: { x: number; z: number; color: number }[] = [];
      for (let zz = Math.min(span.from.z, span.to.z); zz <= Math.max(span.from.z, span.to.z); zz++) for (let xx = Math.min(span.from.x, span.to.x); xx <= Math.max(span.from.x, span.to.x); xx++) {
        const ok = !isRoad(t, xx, zz) && !roadBlocked(t, xx, zz);
        out.push({ x: xx, z: zz, color: ok ? z.color : MARK.no });
      }
      marks.set(out.slice(0, 1600));
      this.showSpanBar(`${z.label}: ${out.filter(o => o.color !== MARK.no).length} tiles`, 'free');
    }
  }

  private showSpanBar(what: string, cost: string) {
    fill(this.bar, h('span.place-name', null, h('b', null, what), h('small', null, cost ? `Costs ${cost}. Lift your finger to build.` : 'Lift your finger to build.')),
      h('button', { 'aria-label': 'Cancel', onclick: () => { this.cancel(); this.renderTray(); } }, icon('close', 22)));
    this.bar.hidden = false;
  }

  /** What the goal pill says while a tool is busy (null: show the goal). */
  hint(): string | null {
    if (this.placing) return null;
    if (this.route) return 'Tap the bus stops in order';
    if (this.tool === 'road') return this.sub === 'remove' ? 'Drag over roads to remove them' : this.sub === 'street' ? 'Drag along the grid to draw a road' : 'Drag along a road to paint the lane';
    if (this.tool === 'zones') return this.sub === 'clear' ? 'Drag to clear zones' : `Drag beside a road to zone ${this.sub}`;
    if (this.tool === 'maps') return null;
    return null;
  }
}

/** An L-shaped path of tiles from a to b: along the longer way first, then the other. */
export function lPath(a: TileRef, b: TileRef): [number, number][] {
  const out: [number, number][] = [];
  const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
  const xFirst = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  let x = a.x, z = a.z;
  out.push([x, z]);
  if (xFirst) { while (x !== b.x) { x += dx; out.push([x, z]); } while (z !== b.z) { z += dz; out.push([x, z]); } }
  else { while (z !== b.z) { z += dz; out.push([x, z]); } while (x !== b.x) { x += dx; out.push([x, z]); } }
  return out;
}

