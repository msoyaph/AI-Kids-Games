/**
 * Playing on the farm: the tools and what a tap or a drag does with each.
 *
 * - Hand (the default): tap a ready crop to pick it (or drag across a row of them), tap clutter to
 *   clear it, tap an empty field to choose seeds, tap a growing crop to see how it's doing.
 * - Plough: tap or drag over open land to make fields.
 * - Seeds: tap or drag over empty fields to plant the chosen crop.
 * - Water and Compost: tap or drag over growing crops.
 * A drag that starts somewhere a tool can't act pans the view instead, so moving around always works.
 */
import { CROP } from '../data/crops';
import { BUILDING, DEBRIS } from '../data/buildings';
import { TUNING } from '../data/tuning';
import { sfx } from '../audio/engine';
import type { TileRef } from '../input/pick';
import { pickNear } from '../input/pick';
import type { FarmView } from '../render/view';
import { playTimeLabel } from '../sim/clock';
import { care, clearDebris, fertilize, fieldAt, fieldState, harvest, plant, plow, water } from '../sim/fields';
import { count } from '../sim/inventory';
import { areaAt, areaDef, tileAt } from '../sim/map';
import type { Farm } from '../sim/state';
import { objAt } from '../sim/world';
import { h } from '../ui/h';
import type { HudTool } from '../ui/hud';
import { itemIcon, starsEl } from '../ui/itemIcons';
import type { Panels } from '../ui/panels';
import { seedsPanel } from '../ui/seedsPanel';
import { barnPanel } from '../ui/barnPanel';

export type Tool = 'hand' | 'plow' | 'seeds' | 'water' | 'compost';

export const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;

export interface PlayHost {
  farm(): Farm;
  view: FarmView;
  panels: Panels;
  /** Something changed that's worth saving soon. */
  changed(): void;
  /** Floating "+3" style feedback over a tile. */
  float(tile: TileRef, text: string, kind?: 'good' | 'info'): void;
  say(text: string): void;
  toolChanged(): void;
}

export class Play {
  tool: Tool = 'hand';
  seed: string | null = null;
  private painted = 0;

  constructor(private host: PlayHost) {}

  private get farm() { return this.host.farm(); }

  tools(): HudTool[] {
    const list: HudTool[] = [
      { id: 'hand', label: 'Farm', icon: 'farm', key: '1' },
      { id: 'plow', label: 'Plough', icon: 'build', key: '2' },
      { id: 'seeds', label: this.seed ? CROP[this.seed]!.name : 'Seeds', icon: 'seeds', key: '3' },
      { id: 'water', label: 'Water', icon: 'water', key: '4' },
      { id: 'compost', label: 'Compost', icon: 'compost', key: '5' },
      { id: 'barn', label: 'Barn', icon: 'barn', key: '6' },
    ];
    return list;
  }

  /** A tool button (or its number key). */
  pickTool(id: string) {
    sfx.tap();
    if (id === 'barn') { this.openBarn(); return; }
    if (id === 'seeds') { this.openSeeds(null); return; }
    this.tool = id as Tool;
    this.host.toolChanged();
  }

  // --- taps ---

  /** What this tool can act on at a tile (for generous taps and drags). */
  canAct(x: number, z: number, tool: Tool = this.tool): boolean {
    const farm = this.farm;
    const area = areaAt(x, z);
    if (!area || !farm.unlocked.includes(area)) return false;
    const o = objAt(farm, x, z);
    const f = o?.kind === 'field' ? o : undefined;
    switch (tool) {
      case 'hand': return (!!f && fieldState(farm, f) === 'ready') || o?.kind === 'debris';
      case 'plow': return !o && !tileAt(x, z).water;
      case 'seeds': return !!f && !f.crop;
      case 'water': return !!f && fieldState(farm, f) === 'growing' && !f.watered;
      case 'compost': return !!f && fieldState(farm, f) === 'growing' && !f.fertilized;
    }
  }

  tap(hit: TileRef, sx: number, sy: number) {
    const v = this.host.view;
    const tile = pickNear(hit, sx, sy, 30, (x, z) => this.canAct(x, z), (x, z) => v.tileOnScreen(x, z)) ?? hit;
    this.act(tile, false);
  }

  /** Do the current tool's thing at a tile. `dragging` keeps quiet about tiles it can't use. */
  act(tile: TileRef, dragging: boolean) {
    const farm = this.farm;
    const { x, z } = tile;
    const area = areaAt(x, z);
    if (!area) { if (!dragging) this.host.say(tileAt(x, z).zone === 'river' ? 'The river runs down to town.' : 'Those are the wild woods.'); return; }
    if (!farm.unlocked.includes(area)) { if (!dragging) this.host.say(`${areaDef(area).name} isn’t open yet.`); return; }
    const o = objAt(farm, x, z);
    const f = o?.kind === 'field' ? o : undefined;
    switch (this.tool) {
      case 'plow': {
        if (o) { if (!dragging) this.host.say('Something is already there.'); return; }
        const r = plow(farm, x, z);
        if (r.ok) { sfx.dig(); this.host.float(tile, `−${TUNING.fieldCost}`, 'info'); this.host.changed(); }
        else if (!dragging) { sfx.nope(); this.host.say(r.why); }
        return;
      }
      case 'seeds': {
        if (!f) { if (!dragging) this.host.say('Seeds go in fields. Plough a field first.'); return; }
        if (f.crop || !this.seed) { if (!dragging) this.inspect(tile); return; }
        const r = plant(farm, f, this.seed, isWater);
        if (r.ok) { sfx.plant(); this.host.changed(); }
        else if (!dragging) { sfx.nope(); this.host.say(r.why); }
        return;
      }
      case 'water': {
        if (!f) { if (!dragging) this.host.say('Water growing crops.'); return; }
        const r = water(farm, f);
        if (r.ok) { sfx.water(); this.host.float(tile, 'Watered', 'info'); this.host.changed(); }
        else if (!dragging) this.host.say(r.why);
        return;
      }
      case 'compost': {
        if (!f) { if (!dragging) this.host.say('Compost helps growing crops.'); return; }
        const r = fertilize(farm, f);
        if (r.ok) { sfx.plant(); this.host.float(tile, 'Compost', 'info'); this.host.changed(); }
        else if (!dragging) { sfx.nope(); this.host.say(r.why); }
        return;
      }
      case 'hand':
        if (f && fieldState(farm, f) === 'ready') { this.pick(tile); return; }
        if (dragging) return;
        if (o?.kind === 'debris') {
          const r = clearDebris(farm, o.id);
          if (r.ok) { sfx.clear(); this.host.float(tile, r.coins ? `+${r.coins}` : r.scraps ? `+${r.scraps} scraps` : 'Cleared!', 'good'); this.host.changed(); }
          return;
        }
        if (f && !f.crop) { this.openSeeds(f.id); return; }
        this.inspect(tile);
    }
  }

  private pick(tile: TileRef) {
    const farm = this.farm;
    const f = fieldAt(farm, tile.x, tile.z);
    if (!f) return;
    const r = harvest(farm, f);
    if (r.ok) {
      sfx.harvest(r.stars);
      this.host.float(tile, `+${r.amount} ${CROP[r.crop]!.name} ${'★'.repeat(r.stars)}`, 'good');
      this.host.changed();
    } else { sfx.nope(); this.host.say(r.why); }
  }

  // --- drags ---

  wantsPaint(tile: TileRef): boolean {
    if (this.tool === 'hand') return this.canAct(tile.x, tile.z, 'hand') && !!fieldAt(this.farm, tile.x, tile.z);
    if (this.tool === 'seeds' && !this.seed) return false;
    return this.canAct(tile.x, tile.z) || !!areaAt(tile.x, tile.z) && this.farm.unlocked.includes(areaAt(tile.x, tile.z)!);
  }

  paint(tile: TileRef) { this.painted++; this.act(tile, true); }
  paintEnd() { this.painted = 0; }

  // --- panels ---

  /** A card about whatever is at a tile. */
  inspect(tile: TileRef) {
    const farm = this.farm;
    const o = objAt(farm, tile.x, tile.z);
    const p = this.host.panels;
    if (o?.kind === 'field' && o.crop) {
      const crop = CROP[o.crop]!;
      const c = care(farm, o);
      const left = Math.max(0, o.readyAt - farm.t);
      const row = (ok: boolean, label: string, tip: string) => h('li', { class: ok ? 'done' : '' }, h('b', null, ok ? '✓ ' : '○ ', label), h('small', null, tip));
      const body = h('div.field-card', null,
        h('div.card-head', null, itemIcon(crop.id, 48), h('div', null, h('h3', null, crop.name), fieldState(farm, o) === 'ready' ? h('p', null, 'Ready to pick!') : h('p', null, `Ready in ${playTimeLabel(left)}`))),
        h('p.care-title', null, 'Care so far: ', starsEl(c.stars, 18)),
        h('ul.care', null,
          row(c.watered, 'Watered', 'Rain or the watering can'),
          row(c.compost, 'Compost', 'Grows faster, too'),
          row(c.rotation, 'Crop rotation', 'A different kind of crop from last time'),
          row(c.nitrogen, 'Nitrogen', 'Beans, peas or clover grew here before'),
          crop.flowers ? row(c.bees, 'Bees', 'A beehive nearby') : null),
        h('div.card-buttons', null,
          !o.watered && fieldState(farm, o) === 'growing' ? h('button.primary', { onclick: () => { water(farm, o); sfx.water(); this.host.changed(); p.close(); } }, 'Water it') : null,
          !o.fertilized && fieldState(farm, o) === 'growing' ? h('button', { disabled: count(farm, 'fertilizer') === 0, onclick: () => { const r = fertilize(farm, o); if (r.ok) { sfx.plant(); this.host.changed(); p.close(); } } }, `Add compost (${count(farm, 'fertilizer')})`) : null));
      p.show(null, body, { kind: 'card' });
      return;
    }
    if (o?.kind === 'building') {
      const b = BUILDING[o.def];
      if (o.def === 'compost') {
        const busy = farm.compostUntil !== null;
        p.show(b?.name ?? 'Compost Bin', h('div', null,
          h('p', null, `Scraps waiting: ${farm.scraps}. Every ${TUNING.scrapsPerBag} scraps make a bag of compost.`),
          h('p', null, busy ? `Making a bag… ready in ${playTimeLabel(farm.compostUntil! - farm.t)}.` : 'Resting: harvest crops and clear weeds to bring it scraps.'),
          h('p', null, `Bags in the barn: ${count(farm, 'fertilizer')}. Use them with the Compost tool.`)), { kind: 'card' });
        return;
      }
      this.host.say(b?.name ?? 'A building');
      return;
    }
    if (o?.kind === 'debris') { this.host.say(DEBRIS[o.def]?.name ?? 'Clutter'); return; }
    const area = areaAt(tile.x, tile.z);
    this.host.say(area ? `${areaDef(area).name}. Use the Plough to make a field here.` : 'The wild woods.');
  }

  /** Choose seeds; with `fieldId`, plant that field right away. */
  openSeeds(fieldId: number | null) {
    const p = this.host.panels;
    const panel = p.show('Seeds', seedsPanel(this.farm, this.seed, id => {
      this.seed = id;
      this.tool = 'seeds';
      p.close(panel);
      if (fieldId !== null) {
        const f = this.farm.objects.find(o => o.id === fieldId);
        if (f) this.act({ x: f.x, z: f.z }, false);
      }
      this.host.toolChanged();
    }));
  }

  openBarn() {
    this.host.panels.show('Barn', barnPanel(this.farm, () => this.host.changed()));
  }

  /** Line for the goal tracker while there's no story yet. */
  hint(): string {
    const farm = this.farm;
    const ready = farm.objects.filter(o => o.kind === 'field' && fieldState(farm, o) === 'ready').length;
    if (ready) return `${ready} field${ready > 1 ? 's' : ''} ready to pick`;
    const empty = farm.objects.filter(o => o.kind === 'field' && !o.crop).length;
    if (empty) return `Plant your ${empty} empty field${empty > 1 ? 's' : ''}`;
    return 'Your crops are growing';
  }
}
