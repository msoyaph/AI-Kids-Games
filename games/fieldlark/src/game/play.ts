/**
 * Playing on the farm: the tools and what a tap or a drag does with each.
 *
 * - Hand (the default): tap a ready crop or ripe tree to pick it (or drag across a row), tap a home
 *   with something ready to collect it, tap clutter to clear it, tap an empty field to choose seeds,
 *   and tap anything else to see how it's doing.
 * - Plough: tap or drag over open land to make fields.
 * - Seeds: tap or drag over empty fields to plant the chosen crop.
 * - Water and Compost: tap or drag over growing crops (compost works on trees too).
 * - Shop: choose something, then place it: tap where it goes (a ghost shows it, green if it fits),
 *   turn it, and tap again or press Place.
 * A drag that starts somewhere a tool can't act pans the view instead, so moving around always works.
 */
import { CROP } from '../data/crops';
import { BUILDING, DEBRIS } from '../data/buildings';
import { TREE } from '../data/orchard';
import { animalForHome } from '../data/animals';
import { TUNING } from '../data/tuning';
import { sfx } from '../audio/engine';
import type { TileRef } from '../input/pick';
import { pickNear } from '../input/pick';
import type { FarmView } from '../render/view';
import { animalsIn, collect, isHome, isReady } from '../sim/animals';
import { BUILDING as BUILDINGS_BY_ID } from '../data/buildings';
import type { Buyable } from '../sim/build';
import { commit, fits, itemCost, itemName, itemSize, type PlaceItem, type Placing } from './placing';
import { beauty, erase, movable, openLand, paintPath, placeDecor, putAway, UndoStack } from '../sim/decorate';
import { DECOR_BY_ID, PATHS } from '../data/decor';
import { decorPanel, landPanel, type DecorChoice } from '../ui/buildPanels';
import { AREAS } from '../sim/map';
import { playTimeLabel } from '../sim/clock';
import { care, clearDebris, fertilize, fieldAt, fieldState, harvest, plant, plow, water } from '../sim/fields';
import { count } from '../sim/inventory';
import { areaAt, areaDef, tileAt } from '../sim/map';
import type { OtherObj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { compostTree, inFruitSeason, isTree, pickTree, treeCare, treeRipe, treeState } from '../sim/trees';
import { objAt } from '../sim/world';
import { h } from '../ui/h';
import type { HudTool } from '../ui/hud';
import { itemIcon, starsEl } from '../ui/itemIcons';
import type { Panels } from '../ui/panels';
import { seedsPanel } from '../ui/seedsPanel';
import { barnPanel } from '../ui/barnPanel';
import { homePanel } from '../ui/homePanel';
import { shopPanel } from '../ui/shopPanel';
import { workshopPanel } from '../ui/workshopPanel';
import { townPanel } from '../ui/townPanel';
import { MACHINE } from '../data/production';
import { collectGoods, isMachine, machineState } from '../sim/production';
import { itemDef } from '../data/items';

export type Tool = 'hand' | 'plow' | 'seeds' | 'water' | 'compost';

export const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;

export type { Placing } from './placing';

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
  /** The player did some farm work at a tile (the farmhands come over to help). */
  did?(kind: 'harvest' | 'water' | 'plant', tile: TileRef): void;
  /** Open the farmhouse (the Farm Book, the Ledger, goals…). */
  farmhouse?(): void;
}

export class Play {
  tool: Tool = 'hand';
  seed: string | null = null;
  placing: Placing | null = null;
  /** Build mode: moving, painting paths, fences and flowers, clearing, decorating, land, undo. */
  building = false;
  buildSub: 'move' | 'path' | 'paint' | 'erase' = 'move';
  buildChoice: number | string = 1;
  readonly undo = new UndoStack();
  private strokeSaved = false;

  constructor(private host: PlayHost) {}

  private get farm() { return this.host.farm(); }

  tools(): HudTool[] {
    if (this.building) {
      const paintLabel = this.buildSub === 'path' ? PATHS.find(p => p.id === this.buildChoice)?.name ?? 'Path' : this.buildSub === 'paint' ? DECOR_BY_ID[this.buildChoice as string]?.name ?? 'Decorate' : 'Decorate';
      return [
        { id: 'b-move', label: 'Move', icon: 'turn', key: '1' },
        { id: 'b-decor', label: paintLabel, icon: 'star', key: '2' },
        { id: 'b-erase', label: 'Clear', icon: 'close', key: '3' },
        { id: 'b-land', label: 'Land', icon: 'lock', key: '4' },
        { id: 'b-undo', label: `Undo${this.undo.size ? ` (${this.undo.size})` : ''}`, icon: 'turnLeft', key: '5' },
        { id: 'b-done', label: 'Done', icon: 'check', key: '6' },
      ];
    }
    return [
      { id: 'hand', label: 'Farm', icon: 'farm', key: '1' },
      { id: 'plow', label: 'Plough', icon: 'plough', key: '2' },
      { id: 'seeds', label: this.seed ? CROP[this.seed]!.name : 'Seeds', icon: 'seeds', key: '3' },
      { id: 'water', label: 'Water', icon: 'water', key: '4' },
      { id: 'compost', label: 'Compost', icon: 'compost', key: '5' },
      { id: 'barn', label: 'Barn', icon: 'barn', key: '6' },
      { id: 'town', label: 'Town', icon: 'orders', key: '9' },
      { id: 'shop', label: 'Shop', icon: 'shop', key: '7' },
      { id: 'build', label: 'Build', icon: 'build', key: '8' },
    ];
  }

  /** A tool button (or its number key). */
  pickTool(id: string) {
    sfx.tap();
    if (this.placing) this.cancelPlacing();
    if (id === 'build') { this.setBuilding(true); return; }
    if (id.startsWith('b-')) { this.buildTool(id); return; }
    if (id === 'barn') { this.openBarn(); return; }
    if (id === 'town') { this.openTown(); return; }
    if (id === 'shop') { this.openShop(); return; }
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
      case 'hand': return (!!f && fieldState(farm, f) === 'ready') || o?.kind === 'debris' || (!!o && isMachine(o) && machineState(o).shelf.length > 0) || (!!o && isTree(o) && treeRipe(farm, o)) || (!!o && isHome(o) && animalsIn(o).some(a => isReady(farm, a)) && !!animalForHome(o.def)?.product);
      case 'plow': return !o && !tileAt(x, z).water;
      case 'seeds': return !!f && !f.crop;
      case 'water': return !!f && fieldState(farm, f) === 'growing' && !f.watered;
      case 'compost': return (!!f && fieldState(farm, f) === 'growing' && !f.fertilized) || (!!o && isTree(o) && !treeRipe(farm, o) && !treeState(o).compost);
    }
  }

  tap(hit: TileRef, sx: number, sy: number) {
    if (this.placing) { this.placeTap(hit); return; }
    if (this.building) { this.buildAct(hit, false); return; }
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
        if (r.ok) { sfx.plant(); this.host.changed(); this.host.did?.('plant', tile); }
        else if (!dragging) { sfx.nope(); this.host.say(r.why); }
        return;
      }
      case 'water': {
        if (!f) { if (!dragging) this.host.say('Water growing crops.'); return; }
        const r = water(farm, f);
        if (r.ok) { sfx.water(); this.host.float(tile, 'Watered', 'info'); this.host.changed(); this.host.did?.('water', tile); }
        else if (!dragging) this.host.say(r.why);
        return;
      }
      case 'compost': {
        if (o && isTree(o)) {
          const r = compostTree(farm, o);
          if (r.ok) { sfx.plant(); this.host.float(tile, 'Compost', 'info'); this.host.changed(); }
          else if (!dragging) { sfx.nope(); this.host.say(r.why); }
          return;
        }
        if (!f) { if (!dragging) this.host.say('Compost helps growing crops and fruit trees.'); return; }
        const r = fertilize(farm, f);
        if (r.ok) { sfx.plant(); this.host.float(tile, 'Compost', 'info'); this.host.changed(); }
        else if (!dragging) { sfx.nope(); this.host.say(r.why); }
        return;
      }
      case 'hand':
        if (f && fieldState(farm, f) === 'ready') { this.pick(tile); return; }
        if (o && isTree(o) && treeRipe(farm, o)) { this.pickFruit(o); return; }
        if (dragging) return;
        if (o && isHome(o) && animalForHome(o.def)?.product && animalsIn(o).some(a => isReady(farm, a))) {
          const r = collect(farm, o);
          if (r.ok) { sfx.harvest(Math.max(...r.got.map(g => g.stars))); this.host.float({ x: o.x, z: o.z }, `+${r.total} ${animalForHome(o.def)!.productName}`, 'good'); this.host.changed(); }
          else this.host.say(r.why);
          return;
        }
        if (o && isMachine(o) && machineState(o).shelf.length) {
          const r = collectGoods(farm, o);
          if (r.ok) { sfx.harvest(Math.max(...r.got.map(g => g.stars))); this.host.float({ x: o.x, z: o.z }, `+${r.got.length} ${r.got.length === 1 ? itemDef(r.got[0]!.recipe).name : 'goods'}`, 'good'); this.host.changed(); }
          else this.host.say(r.why);
          return;
        }
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
      this.host.did?.('harvest', tile);
    } else { sfx.nope(); this.host.say(r.why); }
  }

  private pickFruit(o: OtherObj) {
    const r = pickTree(this.farm, o);
    if (r.ok) {
      sfx.harvest(r.stars);
      this.host.float({ x: o.x, z: o.z }, `+${r.amount} ${TREE[o.def]!.fruitName} ${'★'.repeat(r.stars)}`, 'good');
      this.host.changed();
      this.host.did?.('harvest', { x: o.x, z: o.z });
    } else { sfx.nope(); this.host.say(r.why); }
  }

  // --- drags ---

  wantsPaint(tile: TileRef): boolean {
    if (this.placing) return false;
    if (this.building) {
      const area = areaAt(tile.x, tile.z);
      return this.buildSub !== 'move' && !!area && this.farm.unlocked.includes(area);
    }
    if (this.tool === 'hand') { const o = objAt(this.farm, tile.x, tile.z); return this.canAct(tile.x, tile.z, 'hand') && (o?.kind === 'field' || o?.kind === 'tree'); }
    if (this.tool === 'seeds' && !this.seed) return false;
    const area = areaAt(tile.x, tile.z);
    return this.canAct(tile.x, tile.z) || (!!area && this.farm.unlocked.includes(area));
  }

  paint(tile: TileRef) { if (this.building) this.buildAct(tile, true); else this.act(tile, true); }
  paintEnd() { this.strokeSaved = false; this.host.toolChanged(); }

  // --- build mode ---

  setBuilding(on: boolean) {
    if (this.placing) this.cancelPlacing();
    this.building = on;
    this.buildSub = 'move';
    this.undo.clear();
    if (on) this.host.say('Build mode: move things, decorate, or open new land. Press Done when you’re finished.');
    this.host.toolChanged();
  }

  private buildTool(id: string) {
    const farm = this.farm, p = this.host.panels;
    switch (id) {
      case 'b-move': this.buildSub = 'move'; this.host.say('Tap something to move it.'); break;
      case 'b-erase': this.buildSub = 'erase'; this.host.say('Tap or drag to clear paths, fences and flower beds.'); break;
      case 'b-undo':
        if (this.undo.undo(farm)) { sfx.back(); this.host.changed(); } else this.host.say('Nothing to undo.');
        break;
      case 'b-done': this.setBuilding(false); return;
      case 'b-land': {
        const panel = p.show('Open land', landPanel(farm, area => {
          const r = openLand(farm, area);
          if (r.ok) {
            sfx.levelUp();
            p.close(panel);
            const a = AREAS.find(x => x.id === area)!;
            this.host.view.goal.x = (a.x0 + a.x1 + 1) / 2;
            this.host.view.goal.z = (a.z0 + a.z1 + 1) / 2;
            this.host.say(`${a.name} is yours! Clear the old clutter and make it bloom.`);
            this.host.changed();
          } else this.host.say(r.why);
        }), { keepsTime: true });
        break;
      }
      case 'b-decor': {
        const panel = p.show('Decorate', decorPanel(farm, (c: DecorChoice) => {
          p.close(panel);
          if (c.kind === 'path') { this.buildSub = 'path'; this.buildChoice = c.id; this.host.say('Tap or drag to lay the path.'); }
          else if (c.kind === 'paint') { this.buildSub = 'paint'; this.buildChoice = c.def; this.host.say('Tap or drag to place them.'); }
          else if (c.kind === 'place') this.startPlacing({ kind: 'decor', def: c.def });
          else if (c.what === 'decor') this.startPlacing({ kind: 'decor', def: c.def });
          else this.startPlacing({ kind: 'stored', what: c.what, def: c.def });
          this.host.toolChanged();
        }), { keepsTime: true });
        break;
      }
    }
    this.host.toolChanged();
  }

  /** A tap (or a drag) in build mode. */
  private buildAct(tile: TileRef, dragging: boolean) {
    const farm = this.farm;
    const save = () => { if (!dragging || !this.strokeSaved) { this.undo.push(farm); this.strokeSaved = dragging; } };
    switch (this.buildSub) {
      case 'move': {
        if (dragging) return;
        const o = objAt(farm, tile.x, tile.z);
        if (!o) { this.host.say('Tap something to move it.'); return; }
        if (!movable(o)) { this.host.say(o.kind === 'field' ? 'Fields stay put. You can plough new ones anywhere!' : o.kind === 'debris' ? 'Clear clutter with the Farm tool.' : 'That one stays where it is.'); return; }
        this.startPlacing({ kind: 'move', id: o.id });
        return;
      }
      case 'path': {
        const area = areaAt(tile.x, tile.z);
        if (!area || !farm.unlocked.includes(area)) return;
        const snap = this.undo.size;
        save();
        const r = paintPath(farm, tile.x, tile.z, this.buildChoice as number);
        if (r.ok) { sfx.dig(); this.host.changed(); if (!dragging) this.host.toolChanged(); }
        else { if (!dragging) { sfx.nope(); this.host.say(r.why); } if (this.undo.size > snap && !dragging) this.undo.undo(farm); }
        return;
      }
      case 'paint': {
        const save0 = this.undo.size;
        save();
        const r = placeDecor(farm, this.buildChoice as string, { x: tile.x, z: tile.z, rot: 0 });
        if (r.ok) { sfx.plant(); this.host.changed(); if (!dragging) this.host.toolChanged(); }
        else { if (!dragging) { sfx.nope(); this.host.say(r.why); } if (this.undo.size > save0 && !dragging) this.undo.undo(farm); }
        return;
      }
      case 'erase': {
        save();
        const r = erase(farm, tile.x, tile.z);
        if (r.ok) { sfx.clear(); this.host.changed(); if (!dragging) this.host.toolChanged(); }
        else if (!dragging) { this.undo.undo(farm); this.host.say(r.why); }
        return;
      }
    }
  }

  beautyLine(): string {
    const b = beauty(this.farm);
    return `Beauty ${b.score}: ${b.tier}${b.next ? ` (next at ${b.next})` : ''}`;
  }

  // --- placing things (shop, decorations, storage, moving) ---

  startPlacing(item: PlaceItem | Buyable) {
    const it: PlaceItem = 'kind' in item && (item.kind === 'building' || item.kind === 'tree') ? { kind: 'buy', b: item as Buyable } : (item as PlaceItem);
    const g = this.host.view.goal;
    const size = itemSize(this.farm, it);
    if (it.kind === 'move') {
      const o = this.farm.objects.find(x => x.id === it.id)!;
      this.placing = { item: it, at: { x: o.x, z: o.z, rot: o.rot }, moved: false };
    } else this.placing = { item: it, at: { x: Math.floor(g.x - size.w / 2 + 0.5), z: Math.floor(g.z - size.d / 2 + 0.5), rot: 0 }, moved: false };
    this.host.toolChanged();
  }

  private footprintSize(p: Placing) {
    const size = itemSize(this.farm, p.item);
    const odd = p.at.rot % 2 === 1;
    return { fw: odd ? size.d : size.w, fd: odd ? size.w : size.d };
  }

  /** Centre the ghost on a tile (keeping its turn). */
  moveGhost(tile: TileRef) {
    if (!this.placing) return;
    const { fw, fd } = this.footprintSize(this.placing);
    this.placing.at.x = tile.x - Math.floor((fw - 1) / 2);
    this.placing.at.z = tile.z - Math.floor((fd - 1) / 2);
    this.placing.moved = true;
  }

  /** A tap while placing: on the ghost it places; anywhere else it moves the ghost there. */
  placeTap(tile: TileRef) {
    const p = this.placing!;
    const { fw, fd } = this.footprintSize(p);
    const onGhost = tile.x >= p.at.x && tile.x < p.at.x + fw && tile.z >= p.at.z && tile.z < p.at.z + fd;
    if (onGhost && p.moved) this.confirmPlacing();
    else { this.moveGhost(tile); sfx.tap(); }
  }

  turnPlacing() {
    if (!this.placing) return;
    this.placing.at.rot = ((this.placing.at.rot + 1) % 4) as 0 | 1 | 2 | 3;
    this.placing.moved = true;
    sfx.turn();
  }

  placingFits(): { ok: true } | { ok: false; why: string } {
    const p = this.placing;
    return p ? fits(this.farm, p) : { ok: false, why: '' };
  }

  placingName() { return this.placing ? itemName(this.farm, this.placing.item) : ''; }
  placingCost() { return this.placing ? itemCost(this.farm, this.placing.item) : 0; }

  /** Called before a build action, so it can be undone. */
  private beforeChange() { if (this.building) this.undo.push(this.farm); }

  /** Undo the last build action (Ctrl/Cmd+Z in build mode). */
  undoBuild() { if (this.building) this.buildTool('b-undo'); }

  confirmPlacing() {
    const p = this.placing;
    if (!p) return;
    const ok = fits(this.farm, p);
    if (!ok.ok) { sfx.nope(); this.host.say(ok.why); return; }
    this.beforeChange();
    const r = commit(this.farm, p);
    if (!r.ok) { sfx.nope(); this.host.say(r.why); return; }
    sfx.levelUp();
    const name = itemName(this.farm, p.item);
    this.host.float({ x: p.at.x, z: p.at.z }, p.item.kind === 'move' ? 'Moved!' : `${name}!`, 'good');
    this.placing = null;
    this.host.changed();
    this.host.toolChanged();
    if (p.item.kind === 'buy' && p.item.b.kind === 'building' && BUILDINGS_BY_ID[p.item.b.def]?.holds && p.item.b.def !== 'beehive') this.host.say(`Tap the ${name.toLowerCase()} to welcome its first animals.`);
  }

  /** While moving something: put it into storage instead. */
  putAwayMoving() {
    const p = this.placing;
    if (!p || p.item.kind !== 'move') return;
    this.beforeChange();
    const r = putAway(this.farm, p.item.id);
    if (!r.ok) { sfx.nope(); this.host.say(r.why); return; }
    sfx.back();
    this.host.say('Put away. Find it in Decorate → In storage.');
    this.placing = null;
    this.host.changed();
    this.host.toolChanged();
  }

  cancelPlacing() {
    if (!this.placing) return;
    this.placing = null;
    sfx.back();
    this.host.toolChanged();
  }

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
      const body = h('div.field-card', null,
        h('div.card-head', null, itemIcon(crop.id, 48), h('div', null, h('h3', null, crop.name), fieldState(farm, o) === 'ready' ? h('p', null, 'Ready to pick!') : h('p', null, `Ready in ${playTimeLabel(left)}`))),
        h('p.care-title', null, 'Care so far: ', starsEl(c.stars, 18)),
        h('ul.care', null,
          careRow(c.watered, 'Watered', 'Rain or the watering can'),
          careRow(c.compost, 'Compost', 'Grows faster, too'),
          careRow(c.rotation, 'Crop rotation', 'A different kind of crop from last time'),
          careRow(c.nitrogen, 'Nitrogen', 'Beans, peas or clover grew here before'),
          crop.flowers ? careRow(c.bees, 'Bees', 'A beehive nearby') : null),
        h('div.card-buttons', null,
          !o.watered && fieldState(farm, o) === 'growing' ? h('button.primary', { onclick: () => { water(farm, o); sfx.water(); this.host.changed(); p.close(); } }, 'Water it') : null,
          !o.fertilized && fieldState(farm, o) === 'growing' ? h('button', { disabled: count(farm, 'fertilizer') === 0, onclick: () => { const r = fertilize(farm, o); if (r.ok) { sfx.plant(); this.host.changed(); p.close(); } } }, `Add compost (${count(farm, 'fertilizer')})`) : null));
      p.show(null, body, { kind: 'card', keepsTime: true });
      return;
    }
    if (o && isTree(o)) {
      const def = TREE[o.def]!;
      const c = treeCare(farm, o);
      const s = treeState(o);
      const status = treeRipe(farm, o) ? 'Ripe! Tap to pick.' : inFruitSeason(farm, o) ? `Fruit in ${playTimeLabel(s.readyAt - farm.t)}` : `Resting until ${def.seasons.join(' or ')}`;
      p.show(null, h('div.field-card', null,
        h('div.card-head', null, itemIcon(def.fruit, 48), h('div', null, h('h3', null, def.name), h('p', null, status))),
        h('p.care-title', null, 'Next picking: ', starsEl(c.stars, 18)),
        h('ul.care', null,
          careRow(c.compost, 'Compost', 'Fruit comes faster, too'),
          def.bees ? careRow(c.bees, 'Bees', 'A beehive nearby helps the flowers') : careRow(false, 'Bees', `${def.name}s don’t need bees`),
          careRow(c.established, 'Established', s.picks >= 3 ? 'An old friend of the farm' : `Better fruit after ${3 - s.picks} more picking${3 - s.picks === 1 ? '' : 's'}`)),
        h('div.card-buttons', null,
          !treeRipe(farm, o) && !s.compost ? h('button', { disabled: count(farm, 'fertilizer') === 0, onclick: () => { const r = compostTree(farm, o); if (r.ok) { sfx.plant(); this.host.changed(); p.close(); } } }, `Add compost (${count(farm, 'fertilizer')})`) : null)), { kind: 'card', keepsTime: true });
      return;
    }
    if (o && isHome(o)) {
      p.show(BUILDING[o.def]?.name ?? 'Animals', homePanel(farm, o, () => this.host.changed(), t => this.host.say(t)), { keepsTime: true });
      return;
    }
    if (o && isMachine(o)) {
      p.show(MACHINE[o.def]!.name, workshopPanel(farm, o, () => this.host.changed(), t => this.host.say(t)), { keepsTime: true });
      return;
    }
    if (o?.kind === 'building' && (o.def === 'board' || o.def === 'dock')) { this.openTown(); return; }
    if (o?.kind === 'building' && o.def === 'cottage' && this.host.farmhouse) { this.host.farmhouse(); return; }
    if (o?.kind === 'building') {
      const b = BUILDING[o.def];
      if (o.def === 'compost') {
        const busy = farm.compostUntil !== null;
        p.show(b?.name ?? 'Compost Bin', h('div', null,
          h('p', null, `Scraps waiting: ${farm.scraps}. Every ${TUNING.scrapsPerBag} scraps make a bag of compost.`),
          h('p', null, busy ? `Making a bag… ready in ${playTimeLabel(farm.compostUntil! - farm.t)}.` : 'Resting: harvest crops and clear weeds to bring it scraps.'),
          h('p', null, `Bags in the barn: ${count(farm, 'fertilizer')}. Use them with the Compost tool.`)), { kind: 'card', keepsTime: true });
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
    }), { keepsTime: true });
  }

  openTown() {
    this.host.panels.show('Town', townPanel(this.farm, () => this.host.changed(), t => this.host.say(t)), { keepsTime: true });
  }

  openBarn() {
    this.host.panels.show('Barn', barnPanel(this.farm, () => this.host.changed()), { keepsTime: true });
  }

  openShop() {
    const p = this.host.panels;
    const panel = p.show('Shop', shopPanel(this.farm, item => { p.close(panel); this.startPlacing(item); this.host.say('Tap where it should go, then tap it again (or press Place).'); }), { keepsTime: true });
  }

  /** Line for the goal tracker while there's no story yet. */
  /** The tiles the goal pill is talking about (for "Show me"). */
  hintTiles(): { x: number; z: number }[] {
    const farm = this.farm;
    if (this.placing || this.building) return [];
    const fields = farm.objects.filter(o => o.kind === 'field');
    const ready = fields.filter(o => fieldState(farm, o) === 'ready');
    if (ready.length) return ready;
    return fields.filter(o => o.kind === 'field' && !o.crop);
  }

  /** The tiles a tool is for: where it can do something right now. */
  toolTiles(): { x: number; z: number }[] {
    const farm = this.farm;
    const fields = farm.objects.filter(o => o.kind === 'field');
    switch (this.tool) {
      case 'hand': return fields.filter(o => fieldState(farm, o) === 'ready');
      case 'seeds': return fields.filter(o => o.kind === 'field' && !o.crop);
      case 'water': return fields.filter(o => o.kind === 'field' && !o.watered && fieldState(farm, o) === 'growing');
      case 'compost': return fields.filter(o => o.kind === 'field' && !o.fertilized && fieldState(farm, o) === 'growing');
      default: return [];
    }
  }

  hint(): string {
    const farm = this.farm;
    if (this.placing) return `Placing: ${itemName(this.farm, this.placing.item)}`;
    if (this.building) return this.beautyLine();
    const ready = farm.objects.filter(o => o.kind === 'field' && fieldState(farm, o) === 'ready').length;
    if (ready) return `${ready} field${ready > 1 ? 's' : ''} to pick`;
    const empty = farm.objects.filter(o => o.kind === 'field' && !o.crop).length;
    if (empty) return `Plant your ${empty} empty field${empty > 1 ? 's' : ''}`;
    return 'Your crops are growing';
  }
}

function careRow(ok: boolean, label: string, tip: string) {
  return h('li', { class: ok ? 'done' : '' }, h('b', null, ok ? '✓ ' : '○ ', label), h('small', null, tip));
}
